import request from 'supertest';
import { createApp } from '../src/app';

describe('Families: parent management', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let parentId = '';

  it('setup: parent + family', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'famparent@example.com', familyName: 'Fam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;
    // discover own id via /me
    const me = await request(app).get('/me').set('Authorization', `Bearer ${parentToken}`).expect(200);
    parentId = me.body.id;
  });

  it('adds and lists co-parents', async () => {
    const add = await request(app)
      .post(`/families/${familyId}/parents`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ email: 'coparent@example.com', name: 'Co P' })
      .expect(201);
    expect(add.body).toHaveProperty('parentId');
    const list = await request(app)
      .get(`/families/${familyId}/parents`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(list.body.find((p: any) => p.email === 'coparent@example.com')).toBeTruthy();
  });

  it('rejects removing non-existent parent and self', async () => {
    await request(app)
      .delete(`/families/${familyId}/parents/not-in-family`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(404);

    await request(app)
      .delete(`/families/${familyId}/parents/${parentId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(400);
  });
});

