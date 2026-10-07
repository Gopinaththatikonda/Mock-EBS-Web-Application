import { authService } from '../services/authService.js';
import { userService } from '../services/userService.js';
import { busScene } from '../ui.js';
import { toast, flash, showFlash } from '../toast.js';
import { renderMfaBadge, wirePasswordToggles, setFieldErrors, safeNext } from '../common.js';

const form = document.getElementById('login-form');
const submitBtn = form.querySelector('button[type="submit"]');
const params = new URLSearchParams(window.location.search);

document.querySelectorAll('[data-bus-scene]').forEach((el) => { el.outerHTML = busScene('dark'); });

// Notices from redirects, shown as toasts; then tidy the URL.
const NOTICES = {
  registered: ['success', 'Account created successfully. Please sign in with your new credentials.', 'Registration complete'],
  expired: ['warning', 'Your session has expired. Please sign in again.', 'Session expired'],
  invalid: ['warning', 'Your session is no longer valid. Please sign in again.', 'Session ended'],
  loggedout: ['success', 'You have been signed out successfully. All sessions have been closed.', 'Signed out'],
};
const notice = params.get('registered') === '1' ? 'registered' : params.get('reason');
if (NOTICES[notice]) {
  const [type, msg, title] = NOTICES[notice];
  toast(type, msg, { title });
}
showFlash();
if (notice) {
  const keep = params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : '';
  history.replaceState(null, '', `/${keep}`);
}

wirePasswordToggles();

// Multi-factor status (read-only), as forwarded by the gateway.
userService.getCurrentUser()
  .then((data) => {
    renderMfaBadge(document.getElementById('mfa-badge'), data);
    if (data.authenticated) {
      document.getElementById('step-gateway').classList.add('done');
      document.getElementById('step-gateway-desc').textContent =
        `Verified as ${data.email || data.username}`;
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
  if (Object.keys(errors).length) {
    toast.warning('Please enter your username and password.', { title: 'Details required' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const { user } = await authService.login(username, password);
    flash('success', `Welcome back, ${user.fullName}. You have signed in successfully.`, { title: 'Signed in' });
    window.location.replace(safeNext(params.get('next')));
  } catch (err) {
    const title = err.status === 429 ? 'Too many attempts' : err.status === 401 ? 'Sign-in failed' : undefined;
    toast.error(err.message, { title });
    if (err.errors) setFieldErrors(form, err.errors);
    form.password.value = '';
    form.password.focus();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});
