# APSRTC EBS Portal (Mock EBS Application)

An APSRTC-inspired **Enterprise Business Suite (EBS) portal** used to demonstrate a layered security model:

1. **MFA gateway**: Nginx → OAuth2 Proxy → Keycloak (username/password + Google Authenticator TOTP)
2. **EBS application login**: the portal's own sign-in, verified by a Node.js API against **PostgreSQL** (bcrypt)
3. **Authorisation**: `EBS_ACCESS` group at the gateway, plus role-based access (`user` / `admin`) in the EBS API

Passing Keycloak MFA does **not** sign you in to the portal; the portal has its own login. **Logout ends every session**: the portal session, the OAuth2 Proxy session and (with `--backend-logout-url`) the Keycloak session.

The UI is branded "APSRTC" (official emblem in `public/img/apsrtc-logo.png`). It has an animated bus on the sign-in page and dashboard, and toast notifications for every action.

> Business figures (services, depots, employees, reports, grievances) are **illustrative demo data** and are labelled "Demo data" in the UI. They are not live APSRTC records. EBS user accounts are real rows in PostgreSQL.

## Architecture

```text
Browser
   │
   ▼
Nginx :80
   │
   ▼
OAuth2 Proxy :4180 ── no gateway session ──► Keycloak (username + password + TOTP)
   │                                         (EBS_ACCESS group required)
   │  OAuth2 Proxy session + identity headers
   ▼
APSRTC EBS Portal  (Node.js / Express, Docker)  127.0.0.1:8090
   │   EBS login page → POST /api/auth/login → EBS session (HTTP-only cookie)
   ▼
PostgreSQL :5432 (Docker network, bound to 127.0.0.1 on the host)
   ▲
pgAdmin :5050 (Docker network → host "postgres")
```

| Component       | Port | Exposure                                       |
|-----------------|------|------------------------------------------------|
| EBS application | 8090 | `127.0.0.1` only (reached via OAuth2 Proxy)    |
| PostgreSQL      | 5432 | Docker network; `127.0.0.1` on host            |
| pgAdmin         | 5050 | `127.0.0.1` by default (`PGADMIN_BIND`)        |

Ports 8080/8081 are not used. The app refuses to start on them.

## Project structure

```text
├── server.js                 # bootstrap: config check → wait for DB → migrations → listen
├── src/
│   ├── app.js                # Express app: security headers, session, routes
│   ├── config/               # env.js (environment), database.js (pg pool)
│   ├── db/migrate.js         # runs /migrations once each, tracked in schema_migrations
│   ├── routes/               # auth.routes, user.routes, page.routes
│   ├── controllers/          # auth, user, demo
│   ├── services/             # auth.service (bcrypt, register, authenticate)
│   ├── models/user.js        # parameterised SQL for the users table
│   ├── middleware/           # auth (session/role), gateway, validation, rateLimit, security, errorHandler
│   └── data/demo-data.js     # illustrative APSRTC-style demo data
├── migrations/               # 001_create_users.sql, 002_create_user_sessions.sql
├── views/                    # login, signup, forgot-password, app shell, 404
├── public/                   # css/, img/ (logo, icons), js/services (API layer), js/pages
├── docker/pgadmin/servers.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Quick start (Docker, recommended)

```bash
cp .env.example .env
# Edit .env: set DB_PASSWORD, SESSION_SECRET (openssl rand -hex 32), PGADMIN_EMAIL, PGADMIN_PASSWORD

docker compose build
docker compose up -d
docker compose ps
curl http://localhost:8090/health
# {"status":"ok","service":"mock-ebs","port":8090}
```

Useful commands:

```bash
docker compose ps                 # container status
docker compose logs -f            # all logs
docker compose logs -f ebs-app    # application logs
docker compose build              # rebuild image after code changes
docker compose up -d --build      # rebuild + restart
docker compose down               # stop (data is kept in the pgdata volume)
docker compose down -v            # stop AND delete database + pgAdmin data
```

The database and user are created automatically from `DB_NAME`, `DB_USER` and `DB_PASSWORD` the **first** time the `pgdata` volume is initialised. Tables are created by the app's migrations on start, and each migration runs only once. Changing `DB_PASSWORD` later does not change the existing database password; use `ALTER USER` or recreate the volume.

### Amazon Linux 2023 (EC2)

```bash
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user      # log out and back in
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

git clone https://github.com/Gopinaththatikonda/Mock-EBS-Web-Application.git
cd Mock-EBS-Web-Application
cp .env.example .env && vi .env
docker compose up -d --build
```

Do **not** open 8090, 5432 or 5050 in the EC2 security group. Only Nginx (80/443) should be public.

## Local development (without Docker for the app)

Requires Node.js 20.12+ and a reachable PostgreSQL.

```bash
npm install
cp .env.example .env            # set DB_HOST=localhost and the DB port you use
docker compose up -d postgres   # or use any PostgreSQL instance
npm run dev                     # node --watch; migrations run automatically
```

`npm run migrate` applies migrations without starting the server.

## Environment variables

| Variable                 | Default        | Purpose                                                                 |
|--------------------------|----------------|-------------------------------------------------------------------------|
| `NODE_ENV`               | `development`  | `production` enforces a strong `SESSION_SECRET`                         |
| `PORT`                   | `8090`         | App port (8080/8081 rejected)                                           |
| `DB_HOST`                | `localhost`    | Compose forces `postgres` (service name)                                |
| `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `5432` / `ebs` / `ebs_user` / - | PostgreSQL connection           |
| `SESSION_SECRET`         | -              | Signs the EBS session cookie (required)                                 |
| `SESSION_TTL_MINUTES`    | `30`           | Idle timeout; extended on each request                                  |
| `COOKIE_SECURE`          | `false`        | Set `true` when users reach Nginx over HTTPS                            |
| `REQUIRE_GATEWAY_AUTH`   | `false`        | `true`: EBS APIs reject requests without OAuth2 Proxy identity headers  |
| `REQUIRED_GATEWAY_GROUP` | (empty)        | e.g. `EBS_ACCESS`: app-side group check (defence in depth)              |
| `GATEWAY_LOGOUT_URL`     | `/oauth2/sign_out?rd=%2F` | Where Logout sends the browser to end the gateway/Keycloak sessions |
| `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` | -  | pgAdmin login                                                           |
| `EBS_BIND` / `PGADMIN_BIND` | `127.0.0.1` | Host interface for published ports                                     |
| `POSTGRES_HOST_PORT`     | `5432`         | Host port for PostgreSQL (change if 5432 is already in use)             |

`.env` is git-ignored; only `.env.example` (placeholders) is committed.

## OAuth2 Proxy / Keycloak integration

Nginx, OAuth2 Proxy and Keycloak configuration are **not** part of this repository and do not change, except for one line. Once the new app answers on 8090, point the OAuth2 Proxy upstream at it:

```text
# before
--upstream=http://127.0.0.1:8081
# after
--upstream=http://127.0.0.1:8090
```

(Equivalent in a config file: `upstreams = [ "http://127.0.0.1:8090" ]`.) Then restart OAuth2 Proxy. If OAuth2 Proxy itself runs in a container, `127.0.0.1` refers to that container. In that case use the host's address, or join it to the `apsrtc-ebs_ebs-net` network and use `http://ebs-app:8090`.

Identity headers read by the app (set by `--pass-user-headers=true` and/or `--set-xauthrequest=true`):

| Purpose  | Headers (first match wins)                                                                                       |
|----------|-------------------------------------------------------------------------------------------------------------------|
| Username | `X-Auth-Request-Preferred-Username`, `X-Forwarded-Preferred-Username`, `X-Auth-Request-User`, `X-Forwarded-User` |
| Email    | `X-Auth-Request-Email`, `X-Forwarded-Email`                                                                       |
| Groups   | `X-Auth-Request-Groups`, `X-Forwarded-Groups` (leading `/` from Keycloak paths is stripped)                     |

### EBS_ACCESS authorisation

Enforce the group at the gateway, so users without it never reach the app:

```text
--provider=keycloak-oidc
--allowed-group=EBS_ACCESS
```

Keycloak needs a **Group Membership** mapper on the client (token claim name `groups`, *Full group path* off) and the users must be members of `EBS_ACCESS`. As an optional second check inside the app, set `REQUIRED_GATEWAY_GROUP=EBS_ACCESS` (and `REQUIRE_GATEWAY_AUTH=true`) in `.env`. No code changes are needed.

### Sessions and Logout (ends all sessions)

| Layer | Session                     | Created by                              |
|-------|-----------------------------|-----------------------------------------|
| 1     | `_oauth2_proxy` cookie + Keycloak SSO session | Keycloak password + TOTP |
| 2     | `ebs.sid` cookie (HTTP-only, server-side in `user_sessions`) | `POST /api/auth/login` |

The **Logout** button:

1. calls `POST /api/auth/logout`, which deletes the portal session in PostgreSQL and clears its cookie;
2. sends the browser to `GATEWAY_LOGOUT_URL` (default `/oauth2/sign_out?rd=%2F`), which clears the OAuth2 Proxy cookie;
3. OAuth2 Proxy ends the Keycloak session. **This step needs one OAuth2 Proxy setting:**

```text
--backend-logout-url="https://<keycloak-host>/realms/<realm>/protocol/openid-connect/logout?id_token_hint={id_token}"
```

(In a config file: `backend_logout_url = "..."`. Requires OAuth2 Proxy v7.5 or later.) Without it, the Keycloak SSO session survives and the next visit skips the Keycloak password/OTP prompt. Afterwards the user lands back on the Keycloak sign-in page.

Without OAuth2 Proxy in front (local development), `/oauth2/sign_out` is answered by the app itself and simply returns to the sign-in page.

The EBS session records the gateway user it was created under. If a different Keycloak user appears in the same browser, the EBS session is invalidated automatically.

## API

| Method | Path                       | Auth                | Description |
|--------|----------------------------|---------------------|-------------|
| GET    | `/health`                  | none                | `{"status":"ok","service":"mock-ebs","port":8090}` |
| GET    | `/health/db`               | none                | Database connectivity (503 when down) |
| GET    | `/api/user`                | none                | Gateway identity (unchanged top-level fields) + `ebs` session summary |
| POST   | `/api/auth/signup`         | none (rate-limited) | Register an EBS user (stored in PostgreSQL; no auto sign-in) |
| POST   | `/api/auth/login`          | none (rate-limited) | `{ "username": "<username or Employee ID>", "password": "..." }` → creates the EBS session |
| POST   | `/api/auth/logout`         | none                | Clears the portal session and returns `redirect` (gateway sign-out URL) |
| GET    | `/api/auth/session`        | none                | `{ authenticated, user, code }` |
| GET    | `/api/profile`             | EBS session         | EBS user + gateway identity + session times |
| GET    | `/api/demo/summary`        | EBS session         | Demo KPIs and notices (`demo: true`) |
| GET    | `/api/demo/:dataset`       | EBS session         | Paginated demo data: `serviceOperations, employees, requests, activity, depots, services, reports, grievances` (`?page&pageSize&q`) |
| GET    | `/api/demo/track/:serviceNo` | EBS session       | Demo service tracking |
| GET    | `/api/admin/users`         | EBS session + `admin` | Registered EBS users from PostgreSQL |

`/api/user` example (behind OAuth2 Proxy, before EBS sign-in):

```json
{
  "authenticated": true,
  "username": "testuser",
  "email": "panduthatikonda445@gmail.com",
  "groups": ["EBS_ACCESS"],
  "ebs": { "authenticated": false, "user": null }
}
```

Errors are always `{ "success": false, "message": "..." }` (plus `code`, `errors` for field validation). Internal or database errors are logged on the server and never sent to the browser.

```bash
curl -X POST http://localhost:8090/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"fullName":"Test User","employeeId":"EBS001","email":"test@example.com","mobile":"9876543210","username":"testuser","password":"password123"}'
# {"success":true,"message":"User registered successfully"}
```

## Portal pages

`/` (EBS sign-in), `/signup`, `/forgot-password`, and behind the EBS session: `/home`, `/dashboard`, `/services`, `/operations`, `/employees`, `/reports`, `/track-service`, `/grievance`, `/administration` (admin role), `/profile`.

## pgAdmin

Open `http://<server>:5050` (with the default `PGADMIN_BIND=127.0.0.1`, use an SSH tunnel: `ssh -L 5050:127.0.0.1:5050 ec2-user@<server>`) and sign in with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`.

A server named **APSRTC EBS (Docker)** is pre-registered:

```text
Host:     postgres      # Docker service name, NOT localhost
Port:     5432
Database: ebs
Username: ebs_user      # password = DB_PASSWORD from .env
```

(`docker/pgadmin/servers.json` assumes the default `DB_NAME`/`DB_USER`. Edit it if you change them.)

Make a user an EBS administrator (enables the Administration page):

```sql
UPDATE users SET role = 'admin' WHERE username = 'testuser';
```

## Security notes

- Passwords hashed with bcrypt (cost 12). The hash is never returned by any API.
- Server-side validation on all inputs; parameterised SQL only; unique username/email/employee_id.
- EBS session: server-side (PostgreSQL), HTTP-only `SameSite=Lax` cookie, regenerated on login, 30-minute idle timeout.
- No credentials or user data in `localStorage` (old demo data is removed on first visit).
- Same-origin only: no CORS headers are sent. State-changing APIs require `Content-Type: application/json` (CSRF protection).
- Content-Security-Policy (no inline script/style), `X-Frame-Options: DENY`, `nosniff`.
- Login rate limit: 10 attempts per 15 minutes per IP+username. Signup: 20 per hour per IP.
- Generic login failure message and constant-time comparison for unknown users (no username enumeration).

## End-to-end test checklist

1. Open the published URL: OAuth2 Proxy sign-in.
2. Sign in: Keycloak login.
3. Username/password: TOTP prompt.
4. Google Authenticator OTP: callback succeeds.
5. APSRTC EBS **login page** is shown, with "MFA Protected" and step 1 marked verified.
6. Create an account: row appears in `users` (check in pgAdmin; `password_hash` starts with `$2b$`).
7. Sign in with the username or Employee ID: dashboard.
8. Logout: all sessions end and the Keycloak sign-in page appears (password + OTP required again).
9. Refresh while signed in stays signed in. After logout, `/dashboard` redirects to sign-in.
10. `docker compose down && docker compose up -d`: users (and active sessions) persist.
11. `curl http://localhost:8090/health`: HTTP 200.
