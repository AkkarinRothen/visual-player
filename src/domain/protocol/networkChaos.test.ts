import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatedNetworkTransport } from './transport';
import {
  createVersionedMessage,
  validateIncomingMessage,
  MessageDeduplicator,
  SequenceTracker,
  resetSequenceCounters,
} from './protocolEngine';
import { ReliableDeliveryQueue } from './reliableQueue';
import type { AckPayload, VersionedSyncMessage } from './types';

describe('Network Chaos & State Convergence Integration Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSequenceCounters();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers critical message with ACK despite initial packet loss via retry backoff', async () => {
    // 1. Setup transport with packet loss only on first attempt
    let attempts = 0;
    const transport = new SimulatedNetworkTransport({ latencyMs: 20 });
    const masterTransport = transport.getEndpointA();
    const tabletTransport = transport.getEndpointB();

    const tabletReceivedMessages: VersionedSyncMessage[] = [];
    const tabletDeduplicator = new MessageDeduplicator();

    // Tablet node listener
    tabletTransport.onReceive((raw) => {
      const validation = validateIncomingMessage(raw);
      if (validation.isValid && validation.message) {
        const msg = validation.message;
        if (msg.requiresAck) {
          // Send ACK back to master
          const ack = createVersionedMessage('ACK_MESSAGE', {
            ackMessageId: msg.messageId,
            receivedSequence: msg.sequenceNumber,
          });
          tabletTransport.send(ack);
        }

        if (tabletDeduplicator.shouldProcess(msg.messageId)) {
          tabletReceivedMessages.push(msg);
        }
      }
    });

    // Master node queue
    const masterQueue = new ReliableDeliveryQueue((msg) => {
      attempts++;
      if (attempts === 1) {
        // Drop attempt 1
        return;
      }
      masterTransport.send(msg);
    });

    masterTransport.onReceive((raw) => {
      const validation = validateIncomingMessage(raw);
      if (validation.isValid && validation.message?.type === 'ACK_MESSAGE') {
        masterQueue.handleAck(validation.message.payload as AckPayload);
      }
    });

    // Send critical message
    const criticalMsg = createVersionedMessage('FULL_STATE', { sceneName: 'Ruinas' });
    const deliveryPromise = masterQueue.sendWithAck(criticalMsg, 3);

    // Initial attempt dropped
    expect(attempts).toBe(1);
    expect(tabletReceivedMessages.length).toBe(0);

    // Advance timers by 350ms (triggering retry 1)
    await vi.advanceTimersByTimeAsync(350);

    expect(attempts).toBe(2);
    expect(tabletReceivedMessages.length).toBe(1);
    expect(tabletReceivedMessages[0].payload).toEqual({ sceneName: 'Ruinas' });

    // Ensure Master received ACK and settled promise
    const result = await deliveryPromise;
    expect(result).toBe(true);
    expect(masterQueue.getPendingCount()).toBe(0);
  });

  it('handles duplicate messages idempotently without mutating state twice but returning ACK', async () => {
    const transport = new SimulatedNetworkTransport({ latencyMs: 0 });
    const masterTransport = transport.getEndpointA();
    const tabletTransport = transport.getEndpointB();

    let processedCount = 0;
    let ackSentCount = 0;
    const tabletDeduplicator = new MessageDeduplicator();

    tabletTransport.onReceive((raw) => {
      const validation = validateIncomingMessage(raw);
      if (validation.isValid && validation.message) {
        const msg = validation.message;

        if (msg.requiresAck) {
          ackSentCount++;
          tabletTransport.send(
            createVersionedMessage('ACK_MESSAGE', {
              ackMessageId: msg.messageId,
              receivedSequence: msg.sequenceNumber,
            })
          );
        }

        if (tabletDeduplicator.shouldProcess(msg.messageId)) {
          processedCount++;
        }
      }
    });

    const msg = createVersionedMessage('UPDATE_COMBAT', { round: 3 });

    // Send original
    masterTransport.send(msg);
    // Send duplicate
    masterTransport.send(msg);

    expect(processedCount).toBe(1); // Processed only once
    expect(ackSentCount).toBe(2); // Responded ACK to both transmissions
  });

  it('filters out-of-order continuous stream messages keeping latest value', () => {
    const tracker = new SequenceTracker();
    const processedTicks: number[] = [];

    const handleTick = (seq: number, seconds: number) => {
      if (tracker.isNewer('timer', seq)) {
        processedTicks.push(seconds);
      }
    };

    // Messages sent: 60s (seq 1), 59s (seq 2), 58s (seq 3)
    // Messages arrive in order: seq 1, then seq 3, then delayed seq 2
    handleTick(1, 60); // OK
    handleTick(3, 58); // OK (newer)
    handleTick(2, 59); // Stale (seq 2 < 3) -> Dropped!

    expect(processedTicks).toEqual([60, 58]);
  });

  it('recovers from network partition and achieves 100% convergence via REQUEST_FULL_STATE', async () => {
    const transport = new SimulatedNetworkTransport({ latencyMs: 0 });
    const masterTransport = transport.getEndpointA();
    const tabletTransport = transport.getEndpointB();

    let masterState = { sceneName: 'Taberna', weather: 'none' };
    let tabletState = { sceneName: 'Taberna', weather: 'none' };

    // Tablet listener
    tabletTransport.onReceive((raw) => {
      const validation = validateIncomingMessage(raw);
      if (validation.isValid && validation.message) {
        if (validation.message.type === 'FULL_STATE') {
          tabletState = validation.message.payload as typeof masterState;
        }
      }
    });

    // Master listener
    masterTransport.onReceive((raw) => {
      const validation = validateIncomingMessage(raw);
      if (validation.isValid && validation.message) {
        if (validation.message.type === 'REQUEST_FULL_STATE') {
          masterTransport.send(createVersionedMessage('FULL_STATE', masterState));
        }
      }
    });

    // 1. Cut connection (Partition)
    transport.partitionNetwork();

    // 2. Master performs updates during partition
    masterState = { sceneName: 'Volcán de Fuego', weather: 'embers' };
    masterTransport.send(createVersionedMessage('FULL_STATE', masterState));

    // Tablet didn't receive due to partition
    expect(tabletState.sceneName).toBe('Taberna');

    // 3. Network heals and Tablet requests sync
    transport.healNetwork();
    tabletTransport.send(createVersionedMessage('REQUEST_FULL_STATE', null));

    // 4. Convergence achieved!
    expect(tabletState.sceneName).toBe('Volcán de Fuego');
    expect(tabletState.weather).toBe('embers');
    expect(tabletState).toEqual(masterState);
  });

  it('signals delivery failure when network partition persists across all retries', async () => {
    const transport = new SimulatedNetworkTransport({ latencyMs: 0, isPartitioned: true });
    const masterTransport = transport.getEndpointA();

    let sendAttempts = 0;
    const masterQueue = new ReliableDeliveryQueue((msg) => {
      sendAttempts++;
      masterTransport.send(msg);
    });

    const criticalMsg = createVersionedMessage('END_COMBAT', {});
    const deliveryPromise = masterQueue.sendWithAck(criticalMsg, 3);

    // Initial attempt
    expect(sendAttempts).toBe(1);

    // Advance past retry 1 (300ms) + retry 2 (600ms) + final wait (1200ms)
    await vi.advanceTimersByTimeAsync(2500);

    expect(sendAttempts).toBe(3);
    const success = await deliveryPromise;
    expect(success).toBe(false); // Delivery failed!
    expect(masterQueue.getPendingCount()).toBe(0);
  });
});
