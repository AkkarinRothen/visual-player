import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionCommandBus, type ISessionTransport } from './sessionCommandBus';
import { CommandReceiptStore } from './commandReceiptStore';
import { peerService } from './peerService';
import type { DisplayState } from '../types';

describe('SessionCommandBus Suite', () => {
  let store: CommandReceiptStore;
  let bus: SessionCommandBus;

  const dummyState: DisplayState = {
    sceneName: 'Test Scene',
    backgroundUrl: 'https://example.com/bg.jpg',
    characters: [],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: 'Banner', visible: false },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 1, currentTurnIndex: 0, combatants: [] },
  };

  beforeEach(() => {
    store = new CommandReceiptStore();
    vi.spyOn(peerService, 'getStatus').mockReturnValue('connected');
    vi.spyOn(peerService, 'send').mockImplementation(() => {});
    bus = new SessionCommandBus({ sessionId: 'test-room', defaultTimeoutMs: 500 }, store);
  });

  it('1. Dispatches full state with assigned commandId and registers in store', () => {
    const cmdId = bus.dispatchFullState(dummyState, 5);

    expect(cmdId).toBeDefined();
    expect(cmdId.startsWith('full_state-')).toBe(true);

    const receipt = store.getReceipt(cmdId);
    expect(receipt).toBeDefined();
    expect(receipt?.status).toBe('sent');
    expect(peerService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FULL_STATE',
        commandId: cmdId,
      })
    );
  });

  it('2. Marks command as rejected if network is disconnected', () => {
    vi.spyOn(peerService, 'getStatus').mockReturnValue('disconnected');

    const cmdId = bus.dispatchLightning();
    const receipt = store.getReceipt(cmdId);

    expect(receipt?.status).toBe('rejected');
    expect(receipt?.errorCode).toBe('NETWORK_DISCONNECTED');
  });

  it('3. Resolves waitForResult when COMMAND_RESULT applied message is received', async () => {
    const cmdId = bus.dispatchShake();
    expect(store.getReceipt(cmdId)?.status).toBe('sent');

    // Simulate Display sending back COMMAND_RESULT via peerService message notification
    setTimeout(() => {
      (bus as any).handleCommandResult({
        commandId: cmdId,
        status: 'applied',
        revision: 12,
        checksum: 'checksum-1234',
        appliedAt: Date.now(),
      });
    }, 50);

    const receipt = await bus.waitForResult(cmdId, 1000);
    expect(receipt.status).toBe('applied');
    expect(receipt.revision).toBe(12);
    expect(receipt.checksum).toBe('checksum-1234');
  });

  it('4. Times out deterministically if Display does not respond before deadline', async () => {
    const cmdId = bus.dispatchBlackout(true);

    // Timeout is configured to 500ms
    const receipt = await bus.waitForResult(cmdId, 800);
    expect(receipt.status).toBe('timed_out');
    expect(receipt.errorCode).toBe('TIMEOUT');
  });

  it('5. Executes local checkpoint with saveFn and marks status as saved', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const cmdId = await bus.dispatchLocalCheckpoint('Test Checkpoint', dummyState, mockSave, 'camp-1');

    expect(mockSave).toHaveBeenCalledTimes(1);
    const receipt = store.getReceipt(cmdId);
    expect(receipt?.status).toBe('saved');
  });

  it('6. Supports decoupled ISessionTransport injection', () => {
    let msgListener: ((msg: unknown) => void) | null = null;
    const mockTransport: ISessionTransport = {
      send: vi.fn(),
      getStatus: vi.fn().mockReturnValue('connected'),
      onMessage: vi.fn((handler) => {
        msgListener = handler;
        return () => {
          msgListener = null;
        };
      }),
    };

    const customBus = new SessionCommandBus(
      { transport: mockTransport, sessionId: 'custom-session' },
      store
    );

    const cmdId = customBus.dispatchLightning();
    expect(mockTransport.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRIGGER_LIGHTNING', commandId: cmdId })
    );

    customBus.destroy();
    expect(msgListener).toBeNull();
  });

  it('7. Transitions command status to received upon receiving ACK_MESSAGE', () => {
    let msgListener: ((msg: unknown) => void) | null = null;
    const mockTransport: ISessionTransport = {
      send: vi.fn(),
      getStatus: vi.fn().mockReturnValue('connected'),
      onMessage: vi.fn((handler) => {
        msgListener = handler;
        return () => {
          msgListener = null;
        };
      }),
    };

    const customBus = new SessionCommandBus(
      { transport: mockTransport, sessionId: 'ack-session' },
      store
    );

    const cmdId = customBus.dispatchShake();
    const receipt = store.getReceipt(cmdId);
    expect(receipt?.status).toBe('sent');
    const msgId = receipt?.messageId!;

    // Trigger ACK_MESSAGE from transport
    msgListener!({
      type: 'ACK_MESSAGE',
      payload: { ackMessageId: msgId, receivedSequence: 1 },
    });

    expect(store.getReceipt(cmdId)?.status).toBe('received');
  });

  it('8. Drops COMMAND_RESULT from foreign sessionId', () => {
    let msgListener: ((msg: unknown) => void) | null = null;
    const mockTransport: ISessionTransport = {
      send: vi.fn(),
      getStatus: vi.fn().mockReturnValue('connected'),
      onMessage: vi.fn((handler) => {
        msgListener = handler;
        return () => {
          msgListener = null;
        };
      }),
    };

    const customBus = new SessionCommandBus(
      { transport: mockTransport, sessionId: 'expected-session' },
      store
    );

    const cmdId = customBus.dispatchShake();

    // Trigger COMMAND_RESULT with foreign session
    msgListener!({
      type: 'COMMAND_RESULT',
      payload: {
        commandId: cmdId,
        status: 'applied',
        revision: 10,
        checksum: 'abc',
        appliedAt: Date.now(),
        sessionId: 'foreign-session-xyz',
      },
    });

    // Should NOT have been applied
    expect(store.getReceipt(cmdId)?.status).toBe('sent');
  });

  it('9. Conserva como confirmada la instantánea exacta que la Mesa aplicó', () => {
    const movedState: DisplayState = {
      ...dummyState,
      characters: [
        {
          id: 'guard-1',
          name: 'Guardia',
          avatarUrl: 'https://example.com/guard.png',
          position: 'center-left',
          normalizedX: 31.5,
          normalizedY: 8.2,
          isSpeaking: false,
        },
      ],
    };

    const cmdId = bus.dispatchFullState(movedState, 6);
    (bus as any).handleCommandResult({
      commandId: cmdId,
      status: 'applied',
      revision: 6,
      checksum: 'moved-state',
      appliedAt: Date.now(),
      sessionId: 'test-room',
    });

    expect(bus.getMesaTelemetry()?.lastConfirmedStateSnapshot?.characters[0]).toEqual(
      expect.objectContaining({ id: 'guard-1', normalizedX: 31.5, normalizedY: 8.2 })
    );
  });
});
