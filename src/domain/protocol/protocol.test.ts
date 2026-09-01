import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVersionedMessage,
  validateIncomingMessage,
  MessageDeduplicator,
  SequenceTracker,
  resetSequenceCounters,
} from './protocolEngine';
import { ReliableDeliveryQueue } from './reliableQueue';

describe('Versioned SyncMessage Protocol v1', () => {
  beforeEach(() => {
    resetSequenceCounters();
  });

  it('creates valid versioned envelopes with monotonic sequences and tier mappings', () => {
    const criticalMsg = createVersionedMessage('FULL_STATE', { sceneName: 'Taberna' });
    expect(criticalMsg.protocolVersion).toBe(1);
    expect(criticalMsg.tier).toBe('critical');
    expect(criticalMsg.requiresAck).toBe(true);
    expect(criticalMsg.sequenceNumber).toBe(1);

    const continuousMsg = createVersionedMessage('TURN_TIMER_TICK', { seconds: 45 });
    expect(continuousMsg.tier).toBe('continuous');
    expect(continuousMsg.requiresAck).toBe(false);
    expect(continuousMsg.sequenceNumber).toBe(2);

    const ephemeralMsg = createVersionedMessage('TRIGGER_LIGHTNING', null);
    expect(ephemeralMsg.tier).toBe('ephemeral');
    expect(ephemeralMsg.requiresAck).toBe(false);
    expect(ephemeralMsg.sequenceNumber).toBe(3);
  });

  it('validates incoming v1 messages correctly', () => {
    const msg = createVersionedMessage('END_COMBAT', {});
    const result = validateIncomingMessage(msg);

    expect(result.isValid).toBe(true);
    expect(result.isLegacy).toBe(false);
    expect(result.message?.type).toBe('END_COMBAT');
  });

  it('transparently upgrades legacy unversioned messages into v1 envelopes', () => {
    const legacyRaw = { type: 'FULL_STATE', payload: { sceneName: 'Bosque' } };
    const result = validateIncomingMessage(legacyRaw);

    expect(result.isValid).toBe(true);
    expect(result.isLegacy).toBe(true);
    expect(result.message?.protocolVersion).toBe(1);
    expect(result.message?.type).toBe('FULL_STATE');
    expect(result.message?.tier).toBe('critical');
  });

  it('rejects malformed or non-object payloads', () => {
    expect(validateIncomingMessage(null).isValid).toBe(false);
    expect(validateIncomingMessage('corrupt string').isValid).toBe(false);
    expect(validateIncomingMessage({ foo: 'bar' }).isValid).toBe(false);
  });

  it('deduplicates critical messages using MessageDeduplicator', () => {
    const deduplicator = new MessageDeduplicator(10);
    const msgId = 'msg-unique-123';

    // First time -> should process
    expect(deduplicator.shouldProcess(msgId)).toBe(true);

    // Second time (duplicate retry) -> should ignore
    expect(deduplicator.shouldProcess(msgId)).toBe(false);

    // Third time -> should ignore
    expect(deduplicator.shouldProcess(msgId)).toBe(false);

    // Different message -> should process
    expect(deduplicator.shouldProcess('msg-unique-456')).toBe(true);
  });

  it('drops out-of-order continuous stream messages using SequenceTracker', () => {
    const tracker = new SequenceTracker();
    const stream = 'timer-stream';

    // Sequence 10 arrives -> Accept
    expect(tracker.isNewer(stream, 10)).toBe(true);

    // Sequence 12 arrives -> Accept
    expect(tracker.isNewer(stream, 12)).toBe(true);

    // Delayed sequence 11 arrives -> Drop (stale)
    expect(tracker.isNewer(stream, 11)).toBe(false);

    // Duplicate sequence 12 arrives -> Drop
    expect(tracker.isNewer(stream, 12)).toBe(false);

    // Sequence 15 arrives -> Accept
    expect(tracker.isNewer(stream, 15)).toBe(true);
  });

  it('resolves ReliableDeliveryQueue when ACK is received', async () => {
    vi.useFakeTimers();
    const mockSend = vi.fn();
    const queue = new ReliableDeliveryQueue(mockSend);

    const msg = createVersionedMessage('UPDATE_COMBAT', { round: 2 });
    const deliveryPromise = queue.sendWithAck(msg, 3);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(queue.getPendingCount()).toBe(1);

    // Simulate incoming ACK
    const ackProcessed = queue.handleAck({
      ackMessageId: msg.messageId,
      receivedSequence: msg.sequenceNumber,
    });

    expect(ackProcessed).toBe(true);
    expect(queue.getPendingCount()).toBe(0);

    const success = await deliveryPromise;
    expect(success).toBe(true);

    vi.useRealTimers();
  });
});
