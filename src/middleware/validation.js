'use strict';

// Server-side validation. The browser validates too, but this is the authoritative check.

const RULES = {
  fullName: { re: /^[A-Za-z][A-Za-z .'-]{1,99}$/, msg: 'Enter a valid full name (letters only, 2-100 characters).' },
  employeeId: { re: /^[A-Za-z0-9-]{3,20}$/, msg: 'Employee ID must be 3-20 letters, numbers or hyphens.' },
  email: { re: /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/, max: 254, msg: 'Enter a valid email address.' },
  mobile: { re: /^[6-9]\d{9}$/, msg: 'Enter a valid 10-digit mobile number.' },
  username: { re: /^[a-z0-9._-]{3,30}$/, msg: 'Username must be 3-30 characters: lowercase letters, numbers, . _ -' },
};

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function fail(res, errors) {
  return res.status(400).json({
    success: false,
    message: 'Please correct the highlighted fields.',
    errors,
  });
}

function validateSignup(req, res, next) {
  const b = req.body || {};
  const v = {
    fullName: str(b.fullName).replace(/\s+/g, ' '),
    employeeId: str(b.employeeId).toUpperCase(),
    email: str(b.email).toLowerCase(),
    mobile: str(b.mobile).replace(/^(\+?91)/, '').replace(/[\s-]/g, ''),
    username: str(b.username).toLowerCase(),
    password: typeof b.password === 'string' ? b.password : '',
  };
  const errors = {};

  for (const [field, rule] of Object.entries(RULES)) {
    if (!v[field]) errors[field] = 'This field is required.';
    else if (!rule.re.test(v[field]) || (rule.max && v[field].length > rule.max)) errors[field] = rule.msg;
  }

  if (!v.password) errors.password = 'This field is required.';
  else if (v.password.length < 8 || Buffer.byteLength(v.password) > 72) {
    errors.password = 'Password must be 8-72 characters.';
  } else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) {
    errors.password = 'Password must contain at least one letter and one number.';
  }

  if (b.confirmPassword !== undefined && b.confirmPassword !== b.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(errors).length) return fail(res, errors);
  req.validated = v;
  next();
}

function validateLogin(req, res, next) {
  const b = req.body || {};
  const username = str(b.username);
  const password = typeof b.password === 'string' ? b.password : '';
  const errors = {};
  if (!username || username.length > 254) errors.username = 'Enter your username or employee ID.';
  if (!password || Buffer.byteLength(password) > 72) errors.password = 'Enter your password.';
  if (Object.keys(errors).length) return fail(res, errors);
  req.validated = { username, password };
  next();
}

module.exports = { validateSignup, validateLogin };
