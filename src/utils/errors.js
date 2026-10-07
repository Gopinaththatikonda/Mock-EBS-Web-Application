'use strict';

// An error whose message is safe to show to the browser.
class AppError extends Error {
  constructor(status, message, { code, field, errors } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.errors = errors;
    this.expose = true;
  }
}

module.exports = { AppError };
