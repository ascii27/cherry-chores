import request from 'supertest';
import { createApp } from '../src/app';

describe('Case-insensitive child usernames (#40)', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';

  beforeAll(async () => {
    const r = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'caseparent@example.com', familyName: 'Fam', timezone: 'UTC' })
      .expect(200);
    parentToken = r.body.token;
    familyId = r.body.familyId;
  });

  it('stores a new username in lowercase regardless of input casing', async () => {
    const r = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'MixedCase', password: 'pw', displayName: 'Mixed' })
      .expect(201);
    expect(r.body.username).toBe('mixedcase');
  });

  it('allows child login with any casing of an existing username', async () => {
    for (const attempt of ['mixedcase', 'MIXEDCASE', 'MixedCase', 'mIxEdCaSe']) {
      const r = await request(app)
        .post('/auth/child/login')
        .send({ username: attempt, password: 'pw' });
      expect(r.status).toBe(200);
      expect(r.body.child.username).toBe('mixedcase');
    }
  });

  it('rejects creating a new child whose username differs only in case', async () => {
    await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'MIXEDCASE', password: 'pw', displayName: 'Dup' })
      .expect(409);
  });
});
