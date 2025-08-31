import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 2: Chores extra coverage', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let childId = '';

  it('setup: parent, family, child', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'coverparent@example.com', familyName: 'CoverFam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;
    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'coverkid', password: 'pw', displayName: 'Cover Kid' })
      .expect(201);
    childId = c.body.id;
  });

  it('validates chore creation and listing errors', async () => {
    await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({})
      .expect(400);

    await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId: 'nope', name: 'X', value: 1, recurrence: 'daily' })
      .expect(404);

    await request(app)
      .get('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(400);
  });

  it('forbids chores list by non-member parent', async () => {
    const other = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'notmember@example.com' })
      .expect(200);
    await request(app)
      .get(`/chores?familyId=${familyId}`)
      .set('Authorization', `Bearer ${other.body.token}`)
      .expect(403);
  });

  it('covers child chore listings and complete/uncomplete edges', async () => {
    // Create daily (auto-approve) and weekly (not today) chores
    const now = new Date();
    const notToday = (now.getDay() + 1) % 7;

    const daily = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Daily A', value: 2, recurrence: 'daily', requiresApproval: false, assignedChildIds: [childId] })
      .expect(201);

    const weekly = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Weekly B', value: 3, recurrence: 'weekly', dueDay: notToday, requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);

    // today scope should include the daily; week scope should include both
    const today = await request(app).get(`/children/${childId}/chores?scope=today`).expect(200);
    expect(today.body.find((x: any) => x.id === daily.body.id)).toBeTruthy();

    const week = await request(app).get(`/children/${childId}/chores?scope=week`).expect(200);
    expect(week.body.find((x: any) => x.id === weekly.body.id)).toBeTruthy();

    // complete validations
    await request(app).post(`/chores/${daily.body.id}/complete`).send({}).expect(400);
    await request(app).post(`/chores/${daily.body.id}/complete`).send({ childId: 'missing' }).expect(404);

    // unassigned chore attempt -> 404
    const unassigned = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'No One', value: 1, recurrence: 'daily' })
      .expect(201);
    await request(app).post(`/chores/${unassigned.body.id}/complete`).send({ childId }).expect(404);

    // uncomplete when none -> 404
    await request(app).post(`/chores/${weekly.body.id}/uncomplete`).send({ childId }).expect(404);

    // complete + uncomplete success path
    const comp = await request(app).post(`/chores/${weekly.body.id}/complete`).send({ childId }).expect(200);
    expect(comp.body.status).toBe('pending');
    await request(app).post(`/chores/${weekly.body.id}/uncomplete`).send({ childId }).expect(204);
  });

  it('approvals endpoints validation and errors', async () => {
    await request(app).get('/approvals').set('Authorization', `Bearer ${parentToken}`).expect(400);
    await request(app).post('/approvals/any/approve').set('Authorization', `Bearer ${parentToken}`).send({}).expect(400);

    // create a pending approval then try approving wrong id
    const ch = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Needs OK', value: 1, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);
    await request(app).post(`/chores/${ch.body.id}/complete`).send({ childId }).expect(200);
    await request(app)
      .post('/approvals/not-a-real/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId })
      .expect(404);
  });

  it('child weekly overview provides 7 days and totals', async () => {
    const res = await request(app).get(`/children/${childId}/chores/week`).expect(200);
    expect(Array.isArray(res.body.days)).toBe(true);
    expect(res.body.days.length).toBe(7);
    expect(typeof res.body.totalPlanned).toBe('number');
    expect(typeof res.body.totalApproved).toBe('number');
  });
});

