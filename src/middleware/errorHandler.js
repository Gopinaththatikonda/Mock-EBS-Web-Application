'use strict';

function notFound(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'The requested resource was not found.' });
  }
  res.status(404).sendFile('404.html', { root: require('path').join(__dirname, '..', '..', 'views') });
}

// Never leak internal/database errors to the browser; log them on the server.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid request body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request is too large.' });
  }

  if (err.expose && err.status) {
    const body = { success: false, message: err.message };
    if (err.code) body.code = err.code;
    if (err.field) body.field = err.field;
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }

  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on our side. Please try again in a moment.',
  });
}

module.exports = { notFound, errorHandler };
