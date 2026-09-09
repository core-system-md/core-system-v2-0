import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockUpdate, mockEq, mockIs } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockIs: vi.fn(),
}));

vi.mock('../src/infrastructure/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../src/core/offline/MutationQueue', () => ({
  mutationQueue: {
    getAllPending: vi.fn(),
    markSyncing: vi.fn(),
    remove: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock('../src/core/offline/CORE_SYSTEM_DRIVE', () => ({
  coreDrive: { put: vi.fn() },
}));

import { syncEngine } from '../src/core/offline/SyncEngine';

describe('offline sync delete contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIs.mockResolvedValue({ error: null });
    mockEq.mockReturnValue({ is: mockIs });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('converts supported deletes to soft-delete updates', async () => {
    await syncEngine.applyMutation({
      id: 'mutation-1',
      timestamp: Date.now(),
      status: 'pending',
      table: 'clinic_patients',
      operation: 'delete',
      payload: { id: 'patient-1' },
      retryCount: 0,
    });

    expect(mockFrom).toHaveBeenCalledWith('clinic_patients');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }));
    expect(mockEq).toHaveBeenCalledWith('id', 'patient-1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
  });

  it('rejects deletes for tables without a verified soft-delete contract', async () => {
    await expect(syncEngine.applyMutation({
      id: 'mutation-2',
      timestamp: Date.now(),
      status: 'pending',
      table: 'currency_reference',
      operation: 'delete',
      payload: { id: 'currency-1' },
      retryCount: 0,
    })).rejects.toThrow('Offline delete is not supported');

    expect(mockFrom).not.toHaveBeenCalled();
  });
});
