import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 2: Chores', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let childId = '';
  let choreId = '';

  it('setup: parent, family, child', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'phase2parent@example.com', familyName: 'Phase2', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;
    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'p2kid', password: 'pw', displayName: 'P2 Kid' })
      .expect(201);
    childId = c.body.id;
  });

  it('parent creates a daily chore assigned to child', async () => {
    const ch = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Brush Teeth', value: 1, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId], active: true })
      .expect(201);
    expect(ch.body).toHaveProperty('id');
    choreId = ch.body.id;
  });

  it('child lists today chores and marks complete (pending)', async () => {
    const list = await request(app).get(`/children/${childId}/chores?scope=today`).expect(200);
    const item = list.body.find((x: any) => x.id === choreId);
    expect(item).toBeTruthy();
    const comp = await request(app).post(`/chores/${choreId}/complete`).send({ childId }).expect(200);
    expect(comp.body.status).toBe('pending');
  });

  it('parent sees approvals and approves', async () => {
    const pend = await request(app).get(`/approvals?familyId=${familyId}`).set('Authorization', `Bearer ${parentToken}`).expect(200);
    expect(pend.body.length).toBeGreaterThan(0);
    const id = pend.body[0].id as string;
    await request(app).post(`/approvals/${id}/approve`).set('Authorization', `Bearer ${parentToken}`).send({ familyId }).expect(204);
  });
});

