'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { AppError } = require('../utils/errors');

const BCRYPT_ROUNDS = 12;
// Compared against when the user does not exist, so response time doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', BCRYPT_ROUNDS);

const DUPLICATE_MESSAGES = {
  users_username_key: ['username', 'Username already exists'],
  users_email_key: ['email', 'Email is already registered'],
  users_employee_id_key: ['employeeId', 'Employee ID is already registered'],
};

async function register(input) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    return await User.create({ ...input, passwordHash });
  } catch (err) {
    if (err.code === '23505' && DUPLICATE_MESSAGES[err.constraint]) {
      const [field, message] = DUPLICATE_MESSAGES[err.constraint];
      throw new AppError(409, message, { code: 'DUPLICATE', field, errors: { [field]: message } });
    }
    throw err;
  }
}

async function authenticate(identifier, password) {
  const row = await User.findForLogin(identifier);
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);

  if (!row || !ok) {
    throw new AppError(401, 'Invalid username or password', { code: 'INVALID_CREDENTIALS' });
  }
  if (row.status !== 'active') {
    throw new AppError(403, 'Your account is not active. Please contact the administrator.', {
      code: 'ACCOUNT_INACTIVE',
    });
  }
  return User.recordLogin(row.id);
}

module.exports = { register, authenticate };
