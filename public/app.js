'use strict';

(function () {
  function set(id, text, cls) {
    var el = document.getElementById(id);
    el.textContent = text;
    el.className = cls || '';
  }

  function render(user) {
    var banner = document.getElementById('banner');
    var name = user.username || user.email || 'Unknown';

    set('sys-app', '✓ Online', 'ok');

    if (user.authenticated) {
      banner.textContent = '✓ Authentication Successful';
      banner.className = 'banner ok';
      document.getElementById('welcome').textContent = 'Welcome to EBS, ' + name;
      document.getElementById('user-chip').textContent = user.email || name;

      set('auth-status', '✓ Authenticated', 'ok');
      // MFA is enforced by the Keycloak authentication flow; reaching the app means it passed.
      set('mfa-status', '✓ Verified', 'ok');
      set('user-name', name);
      set('user-email', user.email || 'Not provided');
      set('sys-oauth2', '✓ Connected', 'ok');
      set('sys-keycloak', '✓ Connected', 'ok');
    } else {
      banner.textContent = '✗ No authenticated user headers received from OAuth2 Proxy';
      banner.className = 'banner fail';

      set('auth-status', '✗ Not Authenticated', 'fail');
      set('mfa-status', '✗ Not Verified', 'fail');
      set('user-name', 'N/A');
      set('user-email', 'N/A');
      set('sys-oauth2', '✗ Not Detected', 'fail');
      set('sys-keycloak', '✗ Unknown', 'fail');
    }
  }

  fetch('/api/user', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(render)
    .catch(function (err) {
      var banner = document.getElementById('banner');
      banner.textContent = 'Unable to load user information: ' + err.message;
      banner.className = 'banner fail';
      set('sys-app', '✗ Error', 'fail');
    });
})();
