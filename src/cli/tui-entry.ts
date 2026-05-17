import { ManagerieApp } from '../tui/app.js';

export async function startTui(): Promise<void> {
  const app = new ManagerieApp();
  const shutdown = (): void => {
    void app.stop().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await app.start();
}
