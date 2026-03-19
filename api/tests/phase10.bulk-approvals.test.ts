import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 10: Bulk Approvals', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let childId = '';
  let choreId = '';

  // Setup: create parent, family, child, and a chore that requires approval
  beforeAll(async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'bulkparent@example.com', familyName: 'BulkFam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;

    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'bulkkid', password: 'pw', displayName: 'Bulk Kid' })
      .expect(201);
    childId = c.body.id;

    const ch = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Bulk Chore', value: 5, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);
    choreId = ch.body.id;
  });

  it('bulk approve two chores at once — both succeed, two activity entries created', async () => {
    // Create two completions
    const comp1 = await request(app)
      .post(`/chores/${choreId}/complete`)
      .send({ childId, date: '2026-01-01' })
      .expect(200);

    // Need a second chore to create a second completion with different date
    const ch2 = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Bulk Chore 2', value: 3, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);

    const comp2 = await request(app)
      .post(`/chores/${ch2.body.id}/complete`)
      .send({ childId, date: '2026-01-02' })
      .expect(200);

    const res = await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ completionIds: [comp1.body.id, comp2.body.id] })
      .expect(200);

    expect(res.body.succeeded).toHaveLength(2);
    expect(res.body.succeeded).toContain(comp1.body.id);
    expect(res.body.succeeded).toContain(comp2.body.id);
    expect(res.body.failed).toHaveLength(0);

    // Verify activity was created (2 chore_approved entries in feed)
    const actRes = await request(app)
      .get(`/api/families/${familyId}/activity?limit=10`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const approvedEntries = actRes.body.entries.filter((e: any) => e.eventType === 'chore_approved');
    expect(approvedEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('bulk approve mix of chore completion + bonus claim — both succeed', async () => {
    // Create a new chore completion
    const ch3 = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Mix Chore', value: 4, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);

    const comp3 = await request(app)
      .post(`/chores/${ch3.body.id}/complete`)
      .send({ childId, date: '2026-01-03' })
      .expect(200);

    // Create a bonus and claim
    const bon = await request(app)
      .post(`/api/families/${familyId}/bonuses`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Mix Bonus', value: 10, claimType: 'one-time', childIds: [childId] })
      .expect(201);

    // Log in as the child to claim the bonus
    const childLoginRes = await request(app)
      .post('/auth/child/login')
      .send({ username: 'bulkkid', password: 'pw' })
      .expect(200);
    const childToken = childLoginRes.body.token;

    const claimRes = await request(app)
      .post(`/api/bonuses/${bon.body.id}/claim`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({})
      .expect(201);

    const res = await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ completionIds: [comp3.body.id], claimIds: [claimRes.body.id] })
      .expect(200);

    expect(res.body.succeeded).toHaveLength(2);
    expect(res.body.succeeded).toContain(comp3.body.id);
    expect(res.body.succeeded).toContain(claimRes.body.id);
    expect(res.body.failed).toHaveLength(0);
  });

  it('returns 400 when both arrays are empty', async () => {
    await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ completionIds: [], claimIds: [] })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe('no ids provided');
      });
  });

  it('returns 400 when body is missing ids entirely', async () => {
    await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({})
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe('no ids provided');
      });
  });

  it('chore from a different family fails, others succeed', async () => {
    // Create a second parent with their own family and child/chore
    const p2 = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'otherbulk@example.com', familyName: 'OtherFam', timezone: 'UTC' })
      .expect(200);
    const otherFamilyId = p2.body.familyId;

    const c2 = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${p2.body.token}`)
      .send({ familyId: otherFamilyId, username: 'otherbulkkid', password: 'pw', displayName: 'Other Kid' })
      .expect(201);

    const ch4 = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${p2.body.token}`)
      .send({ familyId: otherFamilyId, name: 'Other Chore', value: 2, recurrence: 'daily', requiresApproval: true, assignedChildIds: [c2.body.id] })
      .expect(201);

    const comp4 = await request(app)
      .post(`/chores/${ch4.body.id}/complete`)
      .send({ childId: c2.body.id, date: '2026-01-05' })
      .expect(200);

    // Create a valid chore for our own family
    const ch5 = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Own Chore', value: 7, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);

    const comp5 = await request(app)
      .post(`/chores/${ch5.body.id}/complete`)
      .send({ childId, date: '2026-01-05' })
      .expect(200);

    // Bulk approve: own completion should succeed, other family's completion should fail
    const res = await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ completionIds: [comp5.body.id, comp4.body.id] })
      .expect(200);

    expect(res.body.succeeded).toContain(comp5.body.id);
    // comp4 belongs to a different family — should fail
    const failedIds = res.body.failed.map((f: any) => f.id);
    expect(failedIds).toContain(comp4.body.id);
    expect(res.body.succeeded).not.toContain(comp4.body.id);
  });

  it('non-parent token gets 401/403', async () => {
    // Login as child
    const childLoginRes = await request(app)
      .post('/auth/child/login')
      .send({ username: 'bulkkid', password: 'pw' })
      .expect(200);
    const childToken = childLoginRes.body.token;

    const res = await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ completionIds: ['some-id'] });

    expect([401, 403]).toContain(res.status);
  });

  it('no auth token gets 401', async () => {
    const res = await request(app)
      .post('/api/approvals/bulk-approve')
      .send({ completionIds: ['some-id'] });

    expect([401, 403]).toContain(res.status);
  });

  it('partial failure reported correctly in response', async () => {
    // Create one valid completion and include one non-existent id
    const ch6 = await request(app)
      .post('/chores')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, name: 'Partial Chore', value: 6, recurrence: 'daily', requiresApproval: true, assignedChildIds: [childId] })
      .expect(201);

    const comp6 = await request(app)
      .post(`/chores/${ch6.body.id}/complete`)
      .send({ childId, date: '2026-01-10' })
      .expect(200);

    const fakeId = 'comp_does_not_exist_99999';

    const res = await request(app)
      .post('/api/approvals/bulk-approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ completionIds: [comp6.body.id, fakeId] })
      .expect(200);

    expect(res.body.succeeded).toContain(comp6.body.id);
    const failedIds = res.body.failed.map((f: any) => f.id);
    expect(failedIds).toContain(fakeId);
    // The failed entry should have an error message
    const failEntry = res.body.failed.find((f: any) => f.id === fakeId);
    expect(failEntry).toBeDefined();
    expect(typeof failEntry.error).toBe('string');
  });
});
