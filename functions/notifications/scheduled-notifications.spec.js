import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin BEFORE importing the module under test ──────────────

const mockSendEachForMulticast = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    doc: mockDoc,
  }),
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast: mockSendEachForMulticast }),
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts, handler) => handler,
}));

import {
  computeResidency,
  checkResidencyAndNotify,
} from './scheduled-notifications.js';

// ── Hjelpe-fabrikkfunksjoner ─────────────────────────────────────────────────

function makeRotation(startDate, startLabel = 'Mamma') {
  return { startDate, startLabel, frequency: 'bi-weekly' };
}

function makeUserData({ baseRotation = null, residencyOverrides = {}, householdLabel = null, fcmTokens = ['token-abc'] } = {}) {
  return { baseRotation, residencyOverrides, householdLabel, fcmTokens };
}

// ── computeResidency ──────────────────────────────────────────────────────────

describe('computeResidency', () => {
  describe('uten rotasjon', () => {
    it('returnerer householdLabel når det ikke er noen rotasjon', () => {
      const data = makeUserData({ householdLabel: 'Pappa' });
      expect(computeResidency('2026-04-22', data)).toBe('Pappa');
    });

    it('returnerer null når householdLabel og baseRotation begge mangler', () => {
      expect(computeResidency('2026-04-22', makeUserData())).toBeNull();
    });
  });

  describe('med bi-weekly rotasjon', () => {
    // Rotasjon starter 2026-04-17 (fredag) hos Mamma.
    // Slot 0 (17.–30. april) → Mamma
    // Slot 1 (1.–14. mai)    → Pappa
    // Slot 2 (15.–28. mai)   → Mamma
    const rotation = makeRotation('2026-04-17', 'Mamma');

    it('slot 0: startdatoen tilhører startLabel (Mamma)', () => {
      const data = makeUserData({ baseRotation: rotation });
      expect(computeResidency('2026-04-17', data)).toBe('Mamma');
    });

    it('slot 0: siste dag i slot-en (30. april) er fortsatt Mamma', () => {
      const data = makeUserData({ baseRotation: rotation });
      expect(computeResidency('2026-04-30', data)).toBe('Mamma');
    });

    it('slot 1: bytter til Pappa 1. mai', () => {
      const data = makeUserData({ baseRotation: rotation });
      expect(computeResidency('2026-05-01', data)).toBe('Pappa');
    });

    it('slot 2: bytter tilbake til Mamma 15. mai', () => {
      const data = makeUserData({ baseRotation: rotation });
      expect(computeResidency('2026-05-15', data)).toBe('Mamma');
    });

    it('startLabel Pappa gir motsatt rotasjon', () => {
      const pappaFirst = makeRotation('2026-04-17', 'Pappa');
      const data = makeUserData({ baseRotation: pappaFirst });
      expect(computeResidency('2026-04-17', data)).toBe('Pappa');
      expect(computeResidency('2026-05-01', data)).toBe('Mamma');
    });
  });

  describe('overrides', () => {
    it('override overstyrer rotasjonen', () => {
      const rotation = makeRotation('2026-04-17', 'Mamma');
      const data = makeUserData({
        baseRotation: rotation,
        residencyOverrides: { '2026-04-22': 'Pappa' },
      });
      // Uten override ville dette vært Mamma (slot 0)
      expect(computeResidency('2026-04-22', data)).toBe('Pappa');
    });

    it('override null returnerer null (ingen byttedag)', () => {
      const rotation = makeRotation('2026-04-17', 'Mamma');
      const data = makeUserData({
        baseRotation: rotation,
        residencyOverrides: { '2026-04-22': null },
      });
      expect(computeResidency('2026-04-22', data)).toBeNull();
    });

    it('override på én dag påvirker ikke nabodager', () => {
      const rotation = makeRotation('2026-04-17', 'Mamma');
      const data = makeUserData({
        baseRotation: rotation,
        residencyOverrides: { '2026-04-22': 'Pappa' },
      });
      expect(computeResidency('2026-04-21', data)).toBe('Mamma');
      expect(computeResidency('2026-04-23', data)).toBe('Mamma');
    });
  });
});

// ── checkResidencyAndNotify ──────────────────────────────────────────────────

describe('checkResidencyAndNotify', () => {
  // Rotasjon: Mamma slot 0: 17.–30. april → byttedag er 1. mai
  const rotation = makeRotation('2026-04-17', 'Mamma');

  beforeEach(() => {
    vi.clearAllMocks();

    // Standard: én bruker med token, rotasjon satt
    const userData = makeUserData({ baseRotation: rotation, fcmTokens: ['tok1'] });
    const userDoc = { id: 'uid1', data: () => userData };
    mockCollection.mockReturnValue({ get: () => Promise.resolve({ docs: [userDoc] }) });
    mockDoc.mockReturnValue({ update: mockUpdate });

    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });
  });

  describe('notifyEveBeforeSwitch — kvelden FØR byttedag', () => {
    it('sender varsel når i dag og i morgen har ulik residency', async () => {
      // 30. april = Mamma, 1. mai = Pappa → byttedag i morgen
      await checkResidencyAndNotify('2026-04-30', '2026-05-01', (parent) => ({
        notification: { title: 'Test', body: `${parent} tar over` },
      }));

      expect(mockSendEachForMulticast).toHaveBeenCalledOnce();
      const call = mockSendEachForMulticast.mock.calls[0][0];
      expect(call.tokens).toEqual(['tok1']);
    });

    it('sender IKKE varsel når i dag og i morgen har samme residency', async () => {
      // 17. april og 18. april er begge Mamma (slot 0) → ingen byttedag
      await checkResidencyAndNotify('2026-04-17', '2026-04-18', (parent) => ({
        notification: { title: 'Test', body: `${parent} tar over` },
      }));

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('payload-builder mottar riktig forelder (Pappa)', async () => {
      const buildPayload = vi.fn().mockReturnValue({ notification: { title: 'X', body: 'Y' } });
      // 1. mai = Pappa
      await checkResidencyAndNotify('2026-04-30', '2026-05-01', buildPayload);

      expect(buildPayload).toHaveBeenCalledWith('Pappa', expect.any(Object));
    });

    it('payload-builder mottar riktig forelder (Mamma)', async () => {
      const buildPayload = vi.fn().mockReturnValue({ notification: { title: 'X', body: 'Y' } });
      // 14. mai = Pappa, 15. mai = Mamma
      await checkResidencyAndNotify('2026-05-14', '2026-05-15', buildPayload);

      expect(buildPayload).toHaveBeenCalledWith('Mamma', expect.any(Object));
    });
  });

  describe('notifyOnSwitchDay — på selve byttedagen', () => {
    it('sender varsel når i går og i dag har ulik residency', async () => {
      // I går 30. april = Mamma, i dag 1. mai = Pappa
      await checkResidencyAndNotify('2026-04-30', '2026-05-01', (parent) => ({
        notification: { title: 'Byttedag', body: `${parent} tar over` },
      }));

      expect(mockSendEachForMulticast).toHaveBeenCalledOnce();
    });

    it('sender IKKE varsel når i går og i dag har samme residency', async () => {
      await checkResidencyAndNotify('2026-04-17', '2026-04-18', (parent) => ({
        notification: { title: 'Byttedag', body: `${parent} tar over` },
      }));

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  describe('token-håndtering', () => {
    it('sender IKKE varsel til bruker uten tokens', async () => {
      const userDoc = { id: 'uid-no-tokens', data: () => makeUserData({ baseRotation: rotation, fcmTokens: [] }) };
      mockCollection.mockReturnValue({ get: () => Promise.resolve({ docs: [userDoc] }) });

      await checkResidencyAndNotify('2026-04-30', '2026-05-01', () => ({ notification: {} }));

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('rydder opp ugyldige tokens etter sending', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: { code: 'messaging/registration-token-not-registered' } }],
      });

      const userData = makeUserData({ baseRotation: rotation, fcmTokens: ['ugyldig-token'] });
      const userDoc = { id: 'uid1', data: () => userData };
      mockCollection.mockReturnValue({ get: () => Promise.resolve({ docs: [userDoc] }) });

      await checkResidencyAndNotify('2026-04-30', '2026-05-01', () => ({ notification: {} }));

      expect(mockUpdate).toHaveBeenCalledWith({ fcmTokens: [] });
    });

    it('beholder gyldige tokens og fjerner kun ugyldige', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      });

      const userData = makeUserData({ baseRotation: rotation, fcmTokens: ['gyldig', 'ugyldig'] });
      const userDoc = { id: 'uid1', data: () => userData };
      mockCollection.mockReturnValue({ get: () => Promise.resolve({ docs: [userDoc] }) });

      await checkResidencyAndNotify('2026-04-30', '2026-05-01', () => ({ notification: {} }));

      expect(mockUpdate).toHaveBeenCalledWith({ fcmTokens: ['gyldig'] });
    });

    it('oppdaterer IKKE Firestore hvis alle tokens er gyldige', async () => {
      await checkResidencyAndNotify('2026-04-30', '2026-05-01', () => ({ notification: {} }));

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('flere brukere', () => {
    it('varsler kun brukere med byttedag — ikke de uten', async () => {
      const withSwitch = makeUserData({ baseRotation: rotation, fcmTokens: ['tok-switch'] });
      const noRotation = makeUserData({ householdLabel: null, fcmTokens: ['tok-no-rotation'] });

      mockCollection.mockReturnValue({
        get: () => Promise.resolve({
          docs: [
            { id: 'uid-switch', data: () => withSwitch },
            { id: 'uid-no-rotation', data: () => noRotation },
          ],
        }),
      });

      await checkResidencyAndNotify('2026-04-30', '2026-05-01', () => ({ notification: {} }));

      expect(mockSendEachForMulticast).toHaveBeenCalledOnce();
      expect(mockSendEachForMulticast.mock.calls[0][0].tokens).toEqual(['tok-switch']);
    });
  });
});
