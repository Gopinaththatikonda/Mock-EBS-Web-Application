'use strict';

(function () {
  var session = EBS.getSession();
  if (!session) return; // requireSession() in <head> is already redirecting

  var page = window.location.pathname.replace(/^\/+|\/+$/g, '') || 'dashboard';
  var banner = document.getElementById('banner');

  function setAll(cls, text, state) {
    document.querySelectorAll('.' + cls).forEach(function (el) {
      el.textContent = text;
      el.classList.remove('ok', 'fail');
      if (state) el.classList.add(state);
    });
  }

  // Show the section and highlight the nav item for the current route.
  document.querySelectorAll('section[data-page]').forEach(function (s) {
    s.hidden = s.getAttribute('data-page') !== page;
  });
  document.querySelectorAll('.navbar a').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-page') === page);
  });
  document.title = page.charAt(0).toUpperCase() + page.slice(1) + ' - EBS Enterprise Banking System';

  // Demo application user (localStorage).
  setAll('js-username', session.username);
  setAll('js-name', session.name);
  setAll('js-email', session.email);
  document.getElementById('user-chip').textContent = session.name + ' (' + session.username + ')';

  // Application logout: clears only the demo session; the OAuth2 Proxy cookie is untouched.
  document.getElementById('logout').addEventListener('click', function () {
    EBS.logout();
    window.location.replace('/');
  });
  // SSO sign-out: clear the demo session too, then let OAuth2 Proxy handle /oauth2/sign_out.
  document.getElementById('sso-logout').addEventListener('click', function () {
    EBS.logout();
  });

  function renderSso(user) {
    setAll('js-sys-app', '✓ Online', 'ok');

    if (user.authenticated) {
      banner.textContent = '✓ Authentication Successful';
      banner.className = 'banner ok';
      setAll('js-auth-status', '✓ Authenticated', 'ok');
      // MFA is enforced by the Keycloak flow; an OAuth2 Proxy identity means it was completed.
      setAll('js-mfa-status', '✓ Verified', 'ok');
      setAll('js-sso-username', user.username || 'Not provided');
      setAll('js-sso-email', user.email || 'Not provided');
      setAll('js-sys-oauth2', '✓ Connected', 'ok');
      setAll('js-sys-keycloak', '✓ Connected', 'ok');
    } else {
      banner.textContent =
        '⚠ Signed in to the demo application, but no SSO identity was received from OAuth2 Proxy';
      banner.className = 'banner warn';
      setAll('js-auth-status', '✗ No SSO identity', 'fail');
      setAll('js-mfa-status', '✗ Not Verified', 'fail');
      setAll('js-sso-username', 'N/A');
      setAll('js-sso-email', 'N/A');
      setAll('js-sys-oauth2', '✗ Not Detected', 'fail');
      setAll('js-sys-keycloak', '✗ Unknown', 'fail');
    }
  }

  fetch('/api/user', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(renderSso)
    .catch(function (err) {
      banner.textContent = 'Unable to load SSO user information: ' + err.message;
      banner.className = 'banner fail';
      setAll('js-sys-app', '✗ Error', 'fail');
    });
})();
