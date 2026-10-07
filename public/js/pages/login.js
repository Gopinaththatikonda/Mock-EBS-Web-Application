import { authService } from '../services/authService.js';
import { userService } from '../services/userService.js';
import { alertHtml } from '../ui.js';
import { renderMfaBadge, wirePasswordToggles, setFieldErrors, showAlert, safeNext } from '../common.js';

const form = document.getElementById('login-form');
const alertBox = document.getElementById('alert');
const submitBtn = form.querySelector('button[type="submit"]');
const params = new URLSearchParams(window.location.search);

const NOTICES = {
  registered: ['success', 'Account created successfully. Please sign in with your new credentials.'],
  expired: ['warning', 'Your EBS session has expired. Please sign in again.'],
  invalid: ['warning', 'Your EBS session is no longer valid. Please sign in again.'],
  loggedout: ['info', 'You have been signed out of the EBS portal. Your MFA gateway session is still active.'],
};
const notice = params.get('registered') === '1' ? 'registered' : params.get('reason');
if (NOTICES[notice]) showAlert(alertBox, alertHtml(...NOTICES[notice]));

wirePasswordToggles();

// Layer 1 status (read-only): identity forwarded by OAuth2 Proxy after Keycloak MFA.
userService.getCurrentUser()
  .then((data) => {
    renderMfaBadge(document.getElementById('mfa-badge'), data);
    if (data.authenticated) {
      document.getElementById('step-gateway').classList.add('done');
      document.getElementById('step-gateway-desc').textContent =
        `Verified as ${data.email || data.username} (password + Google Authenticator)`;
    }
  })
  .catch(() => renderMfaBadge(document.getElementById('mfa-badge'), null));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = form.username.value.trim();
  const password = form.password.value;

  const errors = {};
  if (!username) errors.username = 'Enter your username or Employee ID.';
  if (!password) errors.password = 'Enter your password.';
  setFieldErrors(form, errors);
  if (Object.keys(errors).length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';
  alertBox.innerHTML = '';

  try {
    await authService.login(username, password);
    window.location.replace(safeNext(params.get('next')));
  } catch (err) {
    showAlert(alertBox, alertHtml('error', err.message));
    if (err.errors) setFieldErrors(form, err.errors);
    form.password.value = '';
    form.password.focus();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});
