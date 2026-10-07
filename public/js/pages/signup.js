import { authService } from '../services/authService.js';
import { initLanding, buttonLoading, buttonReset, buttonSuccess, shake } from '../landing.js';
import { toast } from '../toast.js';
import { wirePasswordToggles, setFieldErrors } from '../common.js';

const form = document.getElementById('signup-form');
const submitBtn = form.querySelector('button[type="submit"]');

initLanding();
wirePasswordToggles();
const card = document.querySelector('.auth-form');

// Animated password strength meter.
const meter = document.getElementById('strength');
const meterLabel = document.getElementById('strength-label');
const LEVELS = ['Minimum 8 characters, with a letter and a number', 'Weak', 'Fair', 'Good', 'Strong'];
form.elements.password.addEventListener('input', (e) => {
  const p = e.target.value;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
  if (!p) score = 0;
  meter.dataset.level = String(score);
  meterLabel.textContent = p ? `Password strength: ${LEVELS[score] || LEVELS[1]}` : LEVELS[0];
});

// Mirrors the server-side rules for quick feedback. The server remains authoritative.
function validate(v) {
  const e = {};
  if (!v.fullName) e.fullName = 'Full name is required.';
  else if (!/^[A-Za-z][A-Za-z .'-]{1,99}$/.test(v.fullName)) e.fullName = 'Enter a valid full name (letters only).';

  if (!v.employeeId) e.employeeId = 'Employee ID is required.';
  else if (!/^[A-Za-z0-9-]{3,20}$/.test(v.employeeId)) e.employeeId = '3-20 letters, numbers or hyphens.';

  if (!v.mobile) e.mobile = 'Mobile number is required.';
  else if (!/^[6-9]\d{9}$/.test(v.mobile)) e.mobile = 'Enter a valid 10-digit mobile number.';

  if (!v.email) e.email = 'Email is required.';
  else if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'Enter a valid email address.';

  if (!v.username) e.username = 'Username is required.';
  else if (!/^[a-z0-9._-]{3,30}$/.test(v.username)) e.username = '3-30 characters: lowercase letters, numbers, . _ -';

  if (!v.password) e.password = 'Password is required.';
  else if (v.password.length < 8) e.password = 'Password must be at least 8 characters.';
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) e.password = 'Include at least one letter and one number.';

  if (!v.confirmPassword) e.confirmPassword = 'Please confirm your password.';
  else if (v.password !== v.confirmPassword) e.confirmPassword = 'Passwords do not match.';
  return e;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = form.elements;
  const v = {
    fullName: f.fullName.value.trim(),
    employeeId: f.employeeId.value.trim().toUpperCase(),
    email: f.email.value.trim().toLowerCase(),
    mobile: f.mobile.value.trim(),
    username: f.username.value.trim().toLowerCase(),
    password: f.password.value,
    confirmPassword: f.confirmPassword.value,
  };

  const errors = validate(v);
  setFieldErrors(form, errors);
  if (Object.keys(errors).length) {
    toast.warning('Please correct the highlighted fields.', { title: 'Check your details' });
    shake(card);
    return;
  }

  buttonLoading(submitBtn, 'Creating account…');

  try {
    await authService.signup(v);
    toast.success('Your account has been created. Redirecting to sign in…', { title: 'Registration successful', duration: 2500 });
    buttonSuccess(submitBtn, 'Account created');
    form.reset();
    meter.dataset.level = '0';
    setTimeout(() => window.location.replace('/?registered=1'), 1600);
  } catch (err) {
    toast.error(err.message, { title: err.status === 409 ? 'Already registered' : 'Registration failed' });
    if (err.errors) setFieldErrors(form, err.errors);
    shake(card);
    buttonReset(submitBtn);
  }
});
