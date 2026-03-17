import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 7: Bonus System', () => {
  const app = createApp();
  let parentToken = '';
  let childToken = '';
  let otherParentToken = '';
  let familyId = '';
  let childId = '';
  let otherFamilyId = '';

  it('setup: parent, family, child', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'bonusparent@example.com', familyName: 'BonusFam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;

    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'bonuskid', password: 'pw', displayName: 'Bonus Kid' })
      .expect(201);
    childId = c.body.id;

    const childLogin = await request(app)
      .post('/auth/child/login')
      .send({ username: 'bonuskid', password: 'pw' })
      .expect(200);
    childToken = childLogin.body.token;

    // Other parent in different family
    const other = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'otherbonus@example.com', familyName: 'OtherFam', timezone: 'UTC' })
      .expect(200);
    otherParentToken = other.body.token;
    otherFamilyId = other.body.familyId;
  });

  // --- CRUD for bonuses ---
  describe('Parent manages bonuses', () => {
    let bonusId = '';

    it('parent can create a bonus', async () => {
      const res = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Clean Garage', value: 50, claimType: 'one-time' })
        .expect(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.name).toBe('Clean Garage');
      expect(res.body.value).toBe(50);
      expect(res.body.claimType).toBe('one-time');
      expect(res.body.active).toBe(true);
      bonusId = res.body.id;
    });

    it('validates bonus creation: missing name', async () => {
      await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ value: 10, claimType: 'unlimited' })
        .expect(400);
    });

    it('validates bonus creation: invalid value', async () => {
      await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Test', value: -5, claimType: 'unlimited' })
        .expect(400);

      await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Test', value: 0, claimType: 'unlimited' })
        .expect(400);
    });

    it('validates bonus creation: invalid claimType', async () => {
      await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Test', value: 10, claimType: 'weekly' })
        .expect(400);
    });

    it('parent can list all bonuses', async () => {
      const res = await request(app)
        .get(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.find((b: any) => b.id === bonusId)).toBeTruthy();
    });

    it('parent can update a bonus', async () => {
      const res = await request(app)
        .patch(`/api/bonuses/${bonusId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Clean Garage Updated', value: 75 })
        .expect(200);
      expect(res.body.name).toBe('Clean Garage Updated');
      expect(res.body.value).toBe(75);
    });

    it('parent can delete a bonus', async () => {
      const created = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Temporary', value: 10, claimType: 'unlimited' })
        .expect(201);
      await request(app)
        .delete(`/api/bonuses/${created.body.id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(204);
    });

    it('cross-family parent cannot create/update/delete bonuses', async () => {
      await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .send({ name: 'Cross', value: 10, claimType: 'unlimited' })
        .expect(403);

      await request(app)
        .patch(`/api/bonuses/${bonusId}`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .send({ name: 'Hacked' })
        .expect(403);

      await request(app)
        .delete(`/api/bonuses/${bonusId}`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .expect(403);
    });
  });

  // --- Child visibility ---
  describe('Child bonus visibility', () => {
    let globalBonusId = '';
    let assignedBonusId = '';
    let inactiveBonusId = '';
    let otherChildBonusId = '';

    it('setup: create global, assigned, inactive, and other-child bonuses', async () => {
      // Global bonus (visible to all)
      const global = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Global Bonus', value: 20, claimType: 'unlimited' })
        .expect(201);
      globalBonusId = global.body.id;

      // Bonus assigned specifically to our child
      const assigned = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Assigned Bonus', value: 30, claimType: 'unlimited', childIds: [childId] })
        .expect(201);
      assignedBonusId = assigned.body.id;

      // Inactive bonus
      const inactive = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Inactive Bonus', value: 5, claimType: 'unlimited' })
        .expect(201);
      inactiveBonusId = inactive.body.id;
      await request(app)
        .patch(`/api/bonuses/${inactiveBonusId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ active: false })
        .expect(200);

      // Create a second child and a bonus only for that child
      const c2 = await request(app)
        .post('/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ familyId, username: 'bonuskid2', password: 'pw', displayName: 'Bonus Kid 2' })
        .expect(201);
      const otherChildId = c2.body.id;

      const otherChildBonus = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Other Child Bonus', value: 15, claimType: 'one-time', childIds: [otherChildId] })
        .expect(201);
      otherChildBonusId = otherChildBonus.body.id;
    });

    it('child sees only active bonuses visible to them', async () => {
      const res = await request(app)
        .get(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);
      const ids = res.body.map((b: any) => b.id);
      // Should see global and assigned
      expect(ids).toContain(globalBonusId);
      expect(ids).toContain(assignedBonusId);
      // Should NOT see inactive or other-child-specific bonus
      expect(ids).not.toContain(inactiveBonusId);
      expect(ids).not.toContain(otherChildBonusId);
    });

    it('child from different family cannot list bonuses', async () => {
      // Create a child in another family
      const c3 = await request(app)
        .post('/children')
        .set('Authorization', `Bearer ${otherParentToken}`)
        .send({ familyId: otherFamilyId, username: 'otherfamilykid', password: 'pw', displayName: 'Other Family Kid' })
        .expect(201);
      const c3Login = await request(app)
        .post('/auth/child/login')
        .send({ username: 'otherfamilykid', password: 'pw' })
        .expect(200);
      await request(app)
        .get(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${c3Login.body.token}`)
        .expect(403);
    });
  });

  // --- Claiming ---
  describe('Child claiming bonuses', () => {
    let unlimitedBonusId = '';
    let oneTimeBonusId = '';
    let inactiveBonusId = '';

    it('setup: create unlimited and one-time bonuses', async () => {
      const unlimited = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Unlimited Bonus', value: 10, claimType: 'unlimited' })
        .expect(201);
      unlimitedBonusId = unlimited.body.id;

      const oneTime = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'One-Time Bonus', value: 25, claimType: 'one-time' })
        .expect(201);
      oneTimeBonusId = oneTime.body.id;

      const inactive = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Inactive Claim Bonus', value: 5, claimType: 'unlimited' })
        .expect(201);
      inactiveBonusId = inactive.body.id;
      await request(app)
        .patch(`/api/bonuses/${inactiveBonusId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ active: false })
        .expect(200);
    });

    it('child can claim an unlimited bonus', async () => {
      const res = await request(app)
        .post(`/api/bonuses/${unlimitedBonusId}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ note: 'I did the task!' })
        .expect(201);
      expect(res.body.bonusId).toBe(unlimitedBonusId);
      expect(res.body.status).toBe('pending');
      expect(res.body.note).toBe('I did the task!');
    });

    it('child can claim an unlimited bonus multiple times', async () => {
      await request(app)
        .post(`/api/bonuses/${unlimitedBonusId}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send()
        .expect(201);
      // claim again
      await request(app)
        .post(`/api/bonuses/${unlimitedBonusId}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send()
        .expect(201);
    });

    it('child can claim a one-time bonus once', async () => {
      await request(app)
        .post(`/api/bonuses/${oneTimeBonusId}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send()
        .expect(201);
    });

    it('child cannot claim a one-time bonus twice (409)', async () => {
      await request(app)
        .post(`/api/bonuses/${oneTimeBonusId}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send()
        .expect(409);
    });

    it('child cannot claim an inactive bonus', async () => {
      await request(app)
        .post(`/api/bonuses/${inactiveBonusId}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send()
        .expect(400);
    });

    it('parent cannot claim a bonus (child-only route)', async () => {
      await request(app)
        .post(`/api/bonuses/${unlimitedBonusId}/claim`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send()
        .expect(401);
    });
  });

  // --- Approve / Reject ---
  describe('Parent approves and rejects claims', () => {
    let approveClaimId = '';
    let rejectClaimId = '';
    let approveBonus: any;

    it('setup: create bonus and have child claim it twice', async () => {
      const b = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Approval Test Bonus', value: 40, claimType: 'unlimited' })
        .expect(201);
      approveBonus = b.body;

      const claim1 = await request(app)
        .post(`/api/bonuses/${b.body.id}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ note: 'First claim' })
        .expect(201);
      approveClaimId = claim1.body.id;

      const claim2 = await request(app)
        .post(`/api/bonuses/${b.body.id}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ note: 'Second claim' })
        .expect(201);
      rejectClaimId = claim2.body.id;
    });

    it('parent can see pending claims for family', async () => {
      const res = await request(app)
        .get(`/api/families/${familyId}/bonuses/claims/pending`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((c: any) => c.id === approveClaimId);
      expect(found).toBeTruthy();
      expect(found.bonus).toBeTruthy();
      expect(found.bonus.id).toBe(approveBonus.id);
    });

    it('cross-family parent cannot see pending claims', async () => {
      await request(app)
        .get(`/api/families/${familyId}/bonuses/claims/pending`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .expect(403);
    });

    it('parent can approve a claim and child balance increases', async () => {
      const balBefore = await request(app).get(`/bank/${childId}`).expect(200);
      const prevBal = balBefore.body.balance.available;

      const res = await request(app)
        .post(`/api/bonuses/claims/${approveClaimId}/approve`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.claim.status).toBe('approved');
      expect(res.body.claim.resolvedBy).toBeTruthy();

      const balAfter = await request(app).get(`/bank/${childId}`).expect(200);
      expect(balAfter.body.balance.available).toBe(prevBal + approveBonus.value);
    });

    it('parent can reject a claim with reason', async () => {
      const res = await request(app)
        .post(`/api/bonuses/claims/${rejectClaimId}/reject`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ reason: 'Did not complete the task' })
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.claim.status).toBe('rejected');
      expect(res.body.claim.rejectionReason).toBe('Did not complete the task');
      expect(res.body.claim.resolvedBy).toBeTruthy();
    });

    it('cannot approve or reject a non-pending claim', async () => {
      // approveClaimId is now 'approved'
      await request(app)
        .post(`/api/bonuses/claims/${approveClaimId}/approve`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(400);

      // rejectClaimId is now 'rejected'
      await request(app)
        .post(`/api/bonuses/claims/${rejectClaimId}/reject`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(400);
    });

    it('cross-family parent cannot approve claims', async () => {
      // Create a fresh claim
      const b = await request(app)
        .post(`/api/families/${familyId}/bonuses`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ name: 'Cross Family Test', value: 5, claimType: 'unlimited' })
        .expect(201);
      const claim = await request(app)
        .post(`/api/bonuses/${b.body.id}/claim`)
        .set('Authorization', `Bearer ${childToken}`)
        .send()
        .expect(201);
      await request(app)
        .post(`/api/bonuses/claims/${claim.body.id}/approve`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .expect(403);
    });

    it('child cannot access parent-only claim endpoints (returns 401)', async () => {
      await request(app)
        .get(`/api/families/${familyId}/bonuses/claims/pending`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(401);

      await request(app)
        .post(`/api/bonuses/claims/${approveClaimId}/approve`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(401);

      await request(app)
        .post(`/api/bonuses/claims/${rejectClaimId}/reject`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(401);
    });
  });
});
