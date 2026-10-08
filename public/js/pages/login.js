import { authService } from '../services/authService.js';
import { initLanding, buttonLoading, buttonReset, buttonSuccess, shake } from '../landing.js';
import { toast, flash, showFlash } from '../toast.js';
import { wirePasswordToggles, setFieldErrors, safeNext } from '../common.js';

const form = document.getElementById('login-form');
const submitBtn = form.querySelector('button[type="submit"]');
const params = new URLSearchParams(window.location.search);

initLanding();
const card = document.querySelector('.auth-form');

// Notices from redirects, shown as toasts; then tidy the URL.
const NOTICES = {
  registered: ['success', 'Account created successfully. Please sign in with your new credentials.', 'Registration complete'],
  expired: ['warning', 'Your session has expired. Please sign in again.', 'Session expired'],
  invalid: ['warning', 'Your session is no longer valid. Please sign in again.', 'Session ended'],
  loggedout: ['success', 'You have been signed out successfully.', 'Signed out'],
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
    shake(card);
    return;
  }

  buttonLoading(submitBtn, 'Signing in…');

  try {
    const { user } = await authService.login(username, password);
    flash('success', `Welcome back, ${user.fullName}. You have signed in successfully.`, { title: 'Signed in' });
    buttonSuccess(submitBtn, 'Signed in');
    setTimeout(() => window.location.replace(safeNext(params.get('next'))), 650);
  } catch (err) {
    const title = err.status === 429 ? 'Too many attempts' : err.status === 401 ? 'Sign-in failed' : undefined;
    toast.error(err.message, { title });
    shake(card);
    if (err.errors) setFieldErrors(form, err.errors);
    form.password.value = '';
    form.password.focus();
    buttonReset(submitBtn);
  }
});
