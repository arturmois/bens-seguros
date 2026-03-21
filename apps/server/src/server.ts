import { buildApp } from './app.js';

const start = async () => {
  const app = await buildApp();

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Server running on http://${host}:${port}`);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
