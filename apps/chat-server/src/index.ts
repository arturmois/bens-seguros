import { buildChatApp } from './app.js';

const start = async () => {
  const { app } = await buildChatApp();

  const port = Number(process.env.CHAT_PORT ?? 3002);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Chat server running on http://${host}:${port}`);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
