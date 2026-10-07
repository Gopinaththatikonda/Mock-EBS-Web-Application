# Mock EBS Web Application

A minimal Node.js/Express application that imitates an "EBS Enterprise Banking System" dashboard. It exists only to test an **OAuth2 Proxy + Keycloak MFA** authentication flow.

Real authentication (SSO + MFA) is done entirely upstream by Keycloak and OAuth2 Proxy; the app displays the identity headers that OAuth2 Proxy forwards. There is no database.

On top of that, the frontend includes a **demo-only** application Signup/Login flow backed by browser `localStorage` (see [Demo application login](#demo-application-login-localstorage)). It is purely for UI demonstration and is not an authentication boundary.

## Architecture

```text
User Browser
     |
     v
   Nginx
     |
     v
OAuth2 Proxy :4180   <-->  Keycloak (OIDC + MFA)
     |
     | authenticated user (identity headers)
     v
Mock EBS App :8081  (Express.js)
```

## Requirements

- Node.js 18 or newer (Node 20 LTS recommended)
- npm

On Amazon Linux 2023:

```bash
sudo dnf install -y nodejs20 git
# if `node` isn't on PATH afterwards:
sudo alternatives --set node /usr/bin/node-20 2>/dev/null || true
node -v
```

## Installation

```bash
git clone https://github.com/Gopinaththatikonda/Mock-EBS-Web-Application.git
cd Mock-EBS-Web-Application
npm install
```

For production installs you can use `npm ci --omit=dev`.

## Start the application

```bash
npm start
```

Expected output:

```text
========================================
 Mock EBS Application
========================================
 Server: http://0.0.0.0:8081
 Environment: development
========================================
```

### Environment variables

| Variable   | Default       | Description                  |
|------------|---------------|------------------------------|
| `PORT`     | `8081`        | Port to listen on            |
| `HOST`     | `0.0.0.0`     | Interface to bind to         |
| `NODE_ENV` | `development` | Environment name (logged)    |

Example: `PORT=8081 NODE_ENV=production npm start`

## Routes

| Route           | Description                                                              |
|-----------------|--------------------------------------------------------------------------|
| `/`             | EBS Sign In page (demo login)                                            |
| `/signup`       | EBS Sign Up page (demo account creation)                                 |
| `/dashboard`    | Dashboard: auth/MFA status, user info, SSO identity, system status       |
| `/accounts`     | Mock accounts list                                                       |
| `/transactions` | Mock transactions list                                                   |
| `/profile`      | Demo account + SSO identity                                              |
| `/health`       | Health check: `{"status":"ok","service":"mock-ebs","port":8081}`         |
| `/api/user`     | Identity read from OAuth2 Proxy headers                                  |

`/dashboard`, `/accounts`, `/transactions` and `/profile` redirect to `/` in the browser when there is no demo login.

## Demo application login (localStorage)

> **DEMO ONLY.** Accounts, including passwords in plain text, are stored in the browser's `localStorage`. Do not use real passwords, and do not treat this as authentication. The real boundary is
> `Browser → Nginx → OAuth2 Proxy → Keycloak → Google Authenticator MFA → Mock EBS`.

Flow: **Sign Up** (`/signup`) → redirected to **Sign In** (`/`, no auto-login) → **Dashboard** (`/dashboard`).

| localStorage key      | Contents                                                           |
|-----------------------|--------------------------------------------------------------------|
| `ebs_users`           | Array of `{ name, username, email, password }` (multiple users)    |
| `ebs_logged_in_user`  | Current demo session `{ name, username, email }` (no password)     |

- Signup validates required fields, email format, username format, password length (8+) and confirmation, and rejects duplicate usernames/emails (case-insensitive).
- Login accepts username **or** email and shows `Invalid username/email or password` on failure.
- The dashboard still calls `/api/user` and shows the OAuth2 Proxy (Keycloak) identity and MFA status alongside the demo user.

Two sign-out buttons are shown in the header:

| Button           | Effect                                                                                         |
|------------------|------------------------------------------------------------------------------------------------|
| **Logout**       | Removes `ebs_logged_in_user` and returns to `/`. The OAuth2 Proxy / Keycloak session is kept.   |
| **SSO Sign Out** | Removes `ebs_logged_in_user`, then goes to `/oauth2/sign_out` (handled by OAuth2 Proxy).        |

Data is per browser/origin: users created in one browser are not visible in another. To reset, clear site data or run `localStorage.clear()` in the browser console.

## Test

```bash
curl -i http://localhost:8081/health
```

Simulate headers that OAuth2 Proxy would send:

```bash
curl http://localhost:8081/api/user \
  -H "X-Auth-Request-User: jdoe" \
  -H "X-Auth-Request-Email: jdoe@example.com"
# {"authenticated":true,"username":"jdoe","email":"jdoe@example.com"}

curl http://localhost:8081/api/user
# {"authenticated":false,"username":null,"email":null}
```

## OAuth2 Proxy integration

OAuth2 Proxy should forward authenticated requests to the app's upstream:

```text
http://127.0.0.1:8081
```

Relevant OAuth2 Proxy settings (secrets and client credentials must come from your own config/environment, never this repo):

```text
--upstream=http://127.0.0.1:8081
--http-address=0.0.0.0:4180
--pass-user-headers=true         # X-Forwarded-User / X-Forwarded-Email / X-Forwarded-Preferred-Username
--set-xauthrequest=true          # X-Auth-Request-User / X-Auth-Request-Email / X-Auth-Request-Preferred-Username
--skip-auth-route=^/health$      # optional: allow unauthenticated health checks
```

Headers read by the app (first match wins):

- **username**: `X-Auth-Request-Preferred-Username`, `X-Forwarded-Preferred-Username`, `X-Auth-Request-User`, `X-Forwarded-User`
- **email**: `X-Auth-Request-Email`, `X-Forwarded-Email`

The **SSO Sign Out** button links to `/oauth2/sign_out`, which is handled by OAuth2 Proxy (configure `--whitelist-domain` / Keycloak `end_session_endpoint` redirect if you also want to end the Keycloak session).

MFA itself is enforced by the Keycloak authentication flow (e.g. OTP required). The dashboard shows MFA as "Verified" whenever OAuth2 Proxy forwards an authenticated user, because a user cannot reach the app without completing the Keycloak flow.

### Security note

The app trusts identity headers as-is. Port `8081` must **not** be reachable from outside the host: restrict it in the EC2 security group (or bind with `HOST=127.0.0.1` when OAuth2 Proxy runs on the same machine) so only OAuth2 Proxy can reach it. Otherwise anyone could spoof the headers.

## Running as a service (optional, Amazon Linux 2023)

`/etc/systemd/system/mock-ebs.service`:

```ini
[Unit]
Description=Mock EBS Application
After=network.target

[Service]
WorkingDirectory=/opt/Mock-EBS-Web-Application
ExecStart=/usr/bin/node server.js
Environment=PORT=8081 NODE_ENV=production
Restart=on-failure
User=ec2-user

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mock-ebs
```
