'use strict';

const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/db');

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', err);
  process.exit(1);
});
