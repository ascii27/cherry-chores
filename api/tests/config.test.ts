import request from 'supertest';
import { createApp } from '../src/app';

describe('config route', () => {
  it('returns public config', async () => {
    const app = createApp();
    const res = await request(app).get('/config/public');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('googleClientId');
  });
});

