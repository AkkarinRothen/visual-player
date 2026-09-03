import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandReceiptStore } from './commandReceiptStore';

describe('CommandReceiptStore Suite', () => {
  let store: CommandReceiptStore;

  beforeEach(() => {
    store = new CommandReceiptStore(10);
  });

  it('1. Registers and transitions a command through its complete lifecycle to applied', () => {
    const listener = vi.fn();
    const cmdId = 'cmd-test-1';

    const unsub = store.subscribe(cmdId, listener);

    // 1. Register
    const r1 = store.registerCommand(cmdId, 'FULL_STATE', {
      sessionId: 'sess-100',
      connectionEpoch: 2,
      params: { scene: 'Tavern' },
    });
    expect(r1.status).toBe('queued');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));

    // 2. Mark Sent
    store.markSent(cmdId, 'msg-123');
    expect(store.getReceipt(cmdId)?.status).toBe('sent');
    expect(store.getReceipt(cmdId)?.messageId).toBe('msg-123');

    // 3. Mark Received (Transport ACK)
    store.markReceived(cmdId);
    expect(store.getReceipt(cmdId)?.status).toBe('received');

    // 4. Mark Applied (Domain ACK from Display)
    store.markApplied(cmdId, { revision: 15, checksum: 'sha-abc', appliedAt: 123456 });
    const finalReceipt = store.getReceipt(cmdId);
    expect(finalReceipt?.status).toBe('applied');
    expect(finalReceipt?.revision).toBe(15);
    expect(finalReceipt?.checksum).toBe('sha-abc');
    expect(finalReceipt?.completedAt).toBe(123456);

    unsub();
  });

  it('2. Correctly handles local operation status saved for checkpoints', () => {
    const cmdId = 'cmd-local-cp';
    store.registerCommand(cmdId, 'CHECKPOINT_LOCAL');
    expect(store.getReceipt(cmdId)?.status).toBe('queued');

    store.markSaved(cmdId);
    expect(store.getReceipt(cmdId)?.status).toBe('saved');
  });

  it('3. Marks rejected and timed_out accurately without overwriting completed states', () => {
    const cmdId1 = 'cmd-timeout-test';
    store.registerCommand(cmdId1, 'PLAY_SFX');
    store.markSent(cmdId1, 'msg-sfx');
    store.markTimedOut(cmdId1);

    expect(store.getReceipt(cmdId1)?.status).toBe('timed_out');
    expect(store.getReceipt(cmdId1)?.errorCode).toBe('TIMEOUT');

    // Trying to mark sent after timeout should have no effect
    store.markSent(cmdId1, 'msg-late');
    expect(store.getReceipt(cmdId1)?.status).toBe('timed_out');

    const cmdId2 = 'cmd-reject-test';
    store.registerCommand(cmdId2, 'UPDATE_COMBAT');
    store.markRejected(cmdId2, { code: 'EPOCH_MISMATCH', message: 'Stale connection epoch' });
    expect(store.getReceipt(cmdId2)?.status).toBe('rejected');
    expect(store.getReceipt(cmdId2)?.errorCode).toBe('EPOCH_MISMATCH');
  });

  it('4. Prunes completed receipts older than specified TTL', () => {
    const oldCmd = 'cmd-old';
    store.registerCommand(oldCmd, 'FULL_STATE');
    store.markApplied(oldCmd, { appliedAt: Date.now() - 10000 });

    const recentCmd = 'cmd-recent';
    store.registerCommand(recentCmd, 'FULL_STATE');
    store.markApplied(recentCmd, { appliedAt: Date.now() });

    // Clear receipts older than 5000ms
    store.clearOlderThan(5000);

    expect(store.getReceipt(oldCmd)).toBeUndefined();
    expect(store.getReceipt(recentCmd)).toBeDefined();
  });

  it('5. Enforces max history size with FIFO trimming', () => {
    for (let i = 0; i < 15; i++) {
      store.registerCommand(`cmd-${i}`, 'PING');
    }

    expect(store.getAllReceipts().length).toBe(10);
    expect(store.getReceipt('cmd-0')).toBeUndefined();
    expect(store.getReceipt('cmd-14')).toBeDefined();
  });
});
