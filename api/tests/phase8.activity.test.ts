import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 8: Activity Feed', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let childId = '';
  let choreId = '';

  it('setup: parent, family, child, and chore', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'activityparent@example.com', familyName: 'ActivityFam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;

    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'activitykid', password: 'pw', displayName: 'Activity Kid' })
      .expect(201);
    childId = c.body.id;

    const ch = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Dishes', value: 5, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);
    choreId = ch.body.id;
  });

  it('GET /api/families/:id/activity returns empty array for new family', async () => {
    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBe(0);
  });

  it('after approving a chore, activity entry with type chore_approved appears', async () => {
    // Child completes chore (requires approval)
    const childLogin = await request(app)
      .post('/auth/child/login')
      .send({ username: 'activitykid', password: 'pw' })
      .expect(200);
    const childToken = childLogin.body.token;

    await request(app)
      .post(`/chores/${choreId}/complete`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId })
      .expect(200);

    // Get pending approvals
    const pendingRes = await request(app)
      .get('/approvals')
      .set('Authorization', `Bearer ${parentToken}`)
      .query({ familyId })
      .expect(200);
    expect(pendingRes.body.length).toBeGreaterThan(0);
    const completionId = pendingRes.body[0].id;

    // Approve
    await request(app)
      .post(`/approvals/${completionId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId })
      .expect(204);

    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const types = res.body.entries.map((e: any) => e.eventType);
    expect(types).toContain('chore_approved');
  });

  it('after a manual adjustment, activity entry with type adjustment appears', async () => {
    await request(app)
      .post(`/bank/${childId}/adjust`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ amount: 10, note: 'test adjustment' })
      .expect(201);

    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const types = res.body.entries.map((e: any) => e.eventType);
    expect(types).toContain('adjustment');
  });

  it('after a spend, activity entry with type spend appears', async () => {
    const childLogin = await request(app)
      .post('/auth/child/login')
      .send({ username: 'activitykid', password: 'pw' })
      .expect(200);
    const childToken = childLogin.body.token;

    await request(app)
      .post(`/bank/${childId}/spend`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ amount: 1, note: 'candy' })
      .expect(201);

    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const types = res.body.entries.map((e: any) => e.eventType);
    expect(types).toContain('spend');
  });

  it('entries are returned in descending order by createdAt', async () => {
    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const entries = res.body.entries;
    expect(entries.length).toBeGreaterThan(1);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].createdAt >= entries[i].createdAt).toBe(true);
    }
  });

  it('?limit=1 limits results to 1 entry', async () => {
    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${parentToken}`)
      .query({ limit: 1 })
      .expect(200);
    expect(res.body.entries.length).toBe(1);
  });

  it('child token is rejected (non-parent role)', async () => {
    const childLogin = await request(app)
      .post('/auth/child/login')
      .send({ username: 'activitykid', password: 'pw' })
      .expect(200);
    const childToken = childLogin.body.token;

    // requireRole('parent') returns 401 for non-parent roles (existing middleware behavior)
    const res = await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${childToken}`);
    expect([401, 403]).toContain(res.status);
  });

  it('cross-family parent returns 403', async () => {
    const other = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'otheractivity@example.com' })
      .expect(200);

    await request(app)
      .get(`/api/families/${familyId}/activity`)
      .set('Authorization', `Bearer ${other.body.token}`)
      .expect(403);
  });
});
