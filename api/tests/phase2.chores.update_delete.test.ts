import request from 'supertest';
import { createApp } from '../src/app';

describe('Chores: update, delete, and listing', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let childId = '';
  let choreId = '';

  it('setup: parent, family, child, chore (weekly due today)', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'updparent@example.com', familyName: 'UpdFam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;

    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'updchild', password: 'pw', displayName: 'Upd Kid' })
      .expect(201);
    childId = c.body.id;

    const todayDow = new Date().getDay();
    const ch = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Weekly Today', value: 5, recurrence: 'weekly', dueDay: todayDow, requiresApproval: false, assignedChildIds: [childId] })
      .expect(201);
    choreId = ch.body.id;
  });

  it('lists family chores (success) and includes created chore', async () => {
    const list = await request(app)
      .get(`/chores?familyId=${familyId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(list.body.find((x: any) => x.id === choreId)).toBeTruthy();
  });

  it('child today chores includes weekly chore due today', async () => {
    const today = await request(app).get(`/children/${childId}/chores?scope=today`).expect(200);
    expect(today.body.find((x: any) => x.id === choreId)).toBeTruthy();
  });

  it('updates chore fields and assignments', async () => {
    const up = await request(app)
      .patch(`/chores/${choreId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Updated Name', value: 7, requiresApproval: true, active: false, assignedChildIds: [] })
      .expect(200);
    expect(up.body).toMatchObject({ name: 'Updated Name', value: 7, requiresApproval: true, active: false });
    expect(Array.isArray(up.body.assignedChildIds)).toBe(true);
    expect(up.body.assignedChildIds.length).toBe(0);
  });

  it('delete chore removes it from list', async () => {
    await request(app)
      .delete(`/chores/${choreId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(204);
    const list = await request(app)
      .get(`/chores?familyId=${familyId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(list.body.find((x: any) => x.id === choreId)).toBeFalsy();
  });

  it('child chores and complete error paths for unknown ids', async () => {
    await request(app).get('/children/unknown/chores?scope=today').expect(404);
    // Need a valid child for complete path
    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'updchild2', password: 'pw', displayName: 'Upd Kid 2' })
      .expect(201);
    await request(app).post('/chores/not-a-real/complete').send({ childId: c.body.id }).expect(404);
  });
});

