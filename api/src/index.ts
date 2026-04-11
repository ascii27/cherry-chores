import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { createApp } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = createApp();

(async () => {
  const dbReady: Promise<void> | undefined = app.locals.dbReady;
  if (dbReady) {
    try {
      await dbReady;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[startup] database init failed:', err?.message || err);
      process.exit(1);
    }
  }
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
  });
})();

