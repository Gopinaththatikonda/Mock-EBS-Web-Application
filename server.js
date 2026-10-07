'use strict';

const { config, validate } = require('./src/config/env');
const db = require('./src/config/database');
const { migrate } = require('./src/db/migrate');

async function start() {
  const problems = validate();
  if (problems.length) {
    console.error('Configuration error:\n  - ' + problems.join('\n  - '));
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  await db.waitForDatabase();
  await migrate();

  const app = require('./src/app');
  const server = app.listen(config.port, config.host, () => {
    console.log('========================================');
    console.log(' APSRTC EBS Portal (Mock EBS Application)');
    console.log('========================================');
    console.log(` Server: http://${config.host}:${config.port}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Database: ${config.db.host}:${config.db.port}/${config.db.database}`);
    console.log(` Gateway enforcement: ${config.gateway.requireAuth ? 'on' : 'off'}` +
      (config.gateway.requiredGroup ? `, group=${config.gateway.requiredGroup}` : ''));
    console.log('========================================');
  });

  function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close(() => db.pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
