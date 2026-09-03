import type {
  AckPayload,
  CommandResultPayload,
  DisplayViewportTelemetry,
  DisplayAssetsStatus,
  SyncMessageType,
  VersionedSyncMessage,
} from '../domain/protocol/types';
import type { CombatState, DisplayState, SessionCheckpoint, CinematicDialogue, CameraTransform, SceneLight, SceneZoneEmitter, SceneInteraction, HandoutState, CampaignRecap, WeatherStormEvent } from '../types';
import { peerService } from './peerService';
import {
  commandReceiptStore,
  type CommandReceipt,
  type CommandReceiptStore,
} from './commandReceiptStore';
import { sanitizeDisplayStateForDisplay } from '../domain/display/displaySanitizer';

export interface ISessionTransport {
  send: (msg: any) => void;
  onMessage: (handler: (msg: unknown) => void) => () => void;
  getStatus: () => string;
}

export interface MesaTelemetryInfo {
  viewport?: DisplayViewportTelemetry;
  assetsStatus?: DisplayAssetsStatus;
  lastAppliedRevision?: number;
  lastConfirmedAt?: number;
}

export interface CommandBusOptions {
  sessionId?: string;
  connectionEpoch?: number;
  defaultTimeoutMs?: number;
  transport?: ISessionTransport;
}

export class SessionCommandBus {
  private sessionId: string;
  private connectionEpoch: number;
  private defaultTimeoutMs: number;
  private store: CommandReceiptStore;
  private transport: ISessionTransport;
  private unsubMessage: (() => void) | null = null;
  private pendingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastMesaTelemetry: MesaTelemetryInfo | null = null;
  private telemetryListeners: Array<(telemetry: MesaTelemetryInfo | null) => void> = [];

  constructor(options: CommandBusOptions = {}, store: CommandReceiptStore = commandReceiptStore) {
    this.sessionId = options.sessionId || `sess-${Date.now()}`;
    this.connectionEpoch = options.connectionEpoch || 1;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 5000;
    this.transport = options.transport || peerService;
    this.store = store;

    this.initMessageListener();
  }

  public setTransport(transport: ISessionTransport): void {
    if (this.unsubMessage) {
      this.unsubMessage();
      this.unsubMessage = null;
    }
    this.transport = transport;
    this.initMessageListener();
  }

  private initMessageListener(): void {
    this.unsubMessage = this.transport.onMessage((msg: unknown) => {
      const vMsg = msg as VersionedSyncMessage;
      if (!vMsg || !vMsg.type) return;

      // Handle transport-level packet ACK
      if (vMsg.type === 'ACK_MESSAGE') {
        const ackPayload = vMsg.payload as AckPayload;
        if (ackPayload && ackPayload.ackMessageId) {
          this.store.markReceivedByMessageId(ackPayload.ackMessageId);
        }
        return;
      }

      // Handle domain-level COMMAND_RESULT
      if (vMsg.type === 'COMMAND_RESULT') {
        const payload = vMsg.payload as CommandResultPayload;
        if (payload && payload.commandId) {
          // Reject result if it belongs to a different session
          if (payload.sessionId && payload.sessionId !== this.sessionId) {
            console.warn(
              `[SessionCommandBus] Dropped COMMAND_RESULT from foreign session: "${payload.sessionId}" (active: "${this.sessionId}")`
            );
            return;
          }
          this.handleCommandResult(payload);
        }
      }
    });
  }

  private handleCommandResult(result: CommandResultPayload): void {
    const timer = this.pendingTimeouts.get(result.commandId);
    if (timer) {
      clearTimeout(timer);
      this.pendingTimeouts.delete(result.commandId);
    }

    if (result.status === 'applied') {
      this.store.markApplied(result.commandId, {
        revision: result.revision,
        checksum: result.checksum,
        appliedAt: result.appliedAt,
      });

      // Update confirmed telemetry from Mesa
      if (result.viewport || result.assetsStatus || result.revision) {
        this.lastMesaTelemetry = {
          viewport: result.viewport || this.lastMesaTelemetry?.viewport,
          assetsStatus: result.assetsStatus || this.lastMesaTelemetry?.assetsStatus,
          lastAppliedRevision: result.revision || this.lastMesaTelemetry?.lastAppliedRevision,
          lastConfirmedAt: result.appliedAt || Date.now(),
        };
        this.telemetryListeners.forEach((listener) => {
          try {
            listener(this.lastMesaTelemetry);
          } catch (e) {
            console.error('[SessionCommandBus] Error in telemetry listener:', e);
          }
        });
      }
    } else {
      this.store.markRejected(result.commandId, {
        code: result.errorCode,
        message: result.errorMessage,
      });
    }
  }

  public getMesaTelemetry(): MesaTelemetryInfo | null {
    return this.lastMesaTelemetry;
  }

  public onMesaTelemetry(listener: (telemetry: MesaTelemetryInfo | null) => void): () => void {
    this.telemetryListeners.push(listener);
    if (this.lastMesaTelemetry) {
      listener(this.lastMesaTelemetry);
    }
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((l) => l !== listener);
    };
  }

  public setConnectionEpoch(epoch: number): void {
    if (epoch !== this.connectionEpoch) {
      this.cancelPendingCommands(`Invalidado por cambio de época de conexión (${this.connectionEpoch} -> ${epoch})`);
      this.connectionEpoch = epoch;
    }
  }

  public setSessionId(id: string): void {
    if (id !== this.sessionId) {
      this.cancelPendingCommands(`Invalidado por cambio de sesión (${this.sessionId} -> ${id})`);
      this.sessionId = id;
    }
  }

  public cancelPendingCommands(reason?: string): void {
    for (const [cmdId, timer] of this.pendingTimeouts.entries()) {
      clearTimeout(timer);
      this.store.markCancelled(cmdId, reason || 'Comando cancelado por ciclo de sesión');
    }
    this.pendingTimeouts.clear();
  }

  public generateCommandId(prefix: string = 'cmd'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Internal generic dispatcher wrapping commandId lifecycle, timeouts, and transport send.
   */
  private sendCommand<T>(
    type: SyncMessageType,
    payload: T,
    options?: {
      commandId?: string;
      timeoutMs?: number;
      params?: Record<string, unknown>;
    }
  ): string {
    const commandId = options?.commandId || this.generateCommandId(type.toLowerCase());
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    this.store.registerCommand(commandId, type, {
      sessionId: this.sessionId,
      connectionEpoch: this.connectionEpoch,
      params: options?.params,
    });

    // Check if network is offline before sending
    if (this.transport.getStatus() !== 'connected') {
      this.store.markRejected(commandId, {
        code: 'NETWORK_DISCONNECTED',
        message: 'No hay conexión activa con la Mesa',
      });
      return commandId;
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Dispatch message with commandId, sessionId, and connectionEpoch attached
    const message = {
      type,
      payload,
      commandId,
      messageId,
      sessionId: this.sessionId,
      connectionEpoch: this.connectionEpoch,
    };

    this.transport.send(message as any);
    this.store.markSent(commandId, messageId);

    // Arm timeout timer
    const timer = setTimeout(() => {
      this.pendingTimeouts.delete(commandId);
      this.store.markTimedOut(commandId);
    }, timeoutMs);

    this.pendingTimeouts.set(commandId, timer);
    return commandId;
  }

  /**
   * Await the terminal outcome ('applied', 'rejected', 'timed_out', 'cancelled') for a command.
   */
  public waitForResult(commandId: string, timeoutMs?: number): Promise<CommandReceipt> {
    return new Promise((resolve) => {
      const current = this.store.getReceipt(commandId);
      if (
        current &&
        (current.status === 'applied' ||
          current.status === 'rejected' ||
          current.status === 'timed_out' ||
          current.status === 'cancelled' ||
          current.status === 'saved')
      ) {
        resolve(current);
        return;
      }

      let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
      const unsub = this.store.subscribe(commandId, (receipt) => {
        if (
          receipt.status === 'applied' ||
          receipt.status === 'rejected' ||
          receipt.status === 'timed_out' ||
          receipt.status === 'cancelled' ||
          receipt.status === 'saved'
        ) {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          unsub();
          resolve(receipt);
        }
      });

      if (timeoutMs) {
        timeoutTimer = setTimeout(() => {
          unsub();
          const r = this.store.getReceipt(commandId);
          resolve(r || { commandId, type: 'unknown', status: 'timed_out', queuedAt: Date.now() });
        }, timeoutMs);
      }
    });
  }

  // ─── TYPED DOMAIN COMMANDS ───

  public dispatchFullState(state: DisplayState, revision?: number): string {
    const sanitizedState = sanitizeDisplayStateForDisplay(state);
    return this.sendCommand('FULL_STATE', sanitizedState, {
      params: { sceneName: state.sceneName, revision },
    });
  }

  public dispatchCombatUpdate(combat: CombatState): string {
    return this.sendCommand(combat.isActive ? 'UPDATE_COMBAT' : 'END_COMBAT', combat, {
      params: { round: combat.round, active: combat.isActive },
    });
  }

  public dispatchSfx(preset: string, audioUrl?: string, label?: string): string {
    return this.sendCommand(
      'PLAY_SFX',
      {
        id: `sfx-${Date.now()}`,
        name: label || preset,
        category: 'combat',
        icon: 'Volume2',
        soundType: audioUrl ? 'custom' : 'synthesized',
        synthPreset: preset,
        audioUrl,
      },
      { params: { preset, label } }
    );
  }

  public dispatchStopAllSfx(): string {
    return this.sendCommand('STOP_ALL_SFX', {}, { params: { action: 'stop_all' } });
  }

  public dispatchLightning(): string {
    return this.sendCommand('TRIGGER_LIGHTNING', {}, { params: { fx: 'lightning' } });
  }

  public dispatchStormLightning(event: WeatherStormEvent): string {
    return this.sendCommand('TRIGGER_STORM_LIGHTNING', event, {
      params: { eventId: event.id, delay: event.thunderDelayMs },
    });
  }

  public dispatchShake(): string {
    return this.sendCommand('TRIGGER_SHAKE', {}, { params: { fx: 'shake' } });
  }

  public dispatchBlackout(isBlackout: boolean): string {
    return this.sendCommand('SET_BLACKOUT', isBlackout, { params: { isBlackout } });
  }

  /**
   * Local checkpoint dispatch: persists directly in IndexedDB/Dexie and marks 'saved'.
   * Never fabricates a remote ACK from the Display.
   */
  public async dispatchLocalCheckpoint(
    name: string,
    state: DisplayState,
    saveFn: (cp: SessionCheckpoint) => Promise<void>,
    campaignId: string
  ): Promise<string> {
    const commandId = this.generateCommandId('checkpoint');
    this.store.registerCommand(commandId, 'CHECKPOINT_LOCAL', {
      sessionId: this.sessionId,
      connectionEpoch: this.connectionEpoch,
      params: { name },
    });

    try {
      const checkpoint: SessionCheckpoint = {
        id: `cp-${Date.now()}`,
        campaignId,
        name,
        type: 'manual',
        trigger: name,
        createdAt: Date.now(),
        state,
      };

      await saveFn(checkpoint);
      this.store.markSaved(commandId);
      return commandId;
    } catch (err: any) {
      this.store.markRejected(commandId, {
        code: 'DB_SAVE_FAILED',
        message: err?.message || 'Error guardando checkpoint en la base de datos local',
      });
      return commandId;
    }
  }

  public dispatchDialogue(dialogue: CinematicDialogue): string {
    return this.sendCommand('SET_CINEMATIC_DIALOGUE', dialogue, {
      params: { speakerName: dialogue.speakerName, style: dialogue.style },
    });
  }

  public dispatchDismissDialogue(): string {
    return this.sendCommand('DISMISS_CINEMATIC_DIALOGUE', {}, {
      params: { action: 'dismiss' },
    });
  }

  public dispatchCameraTransform(camera: CameraTransform, durationMs: number = 800): string {
    return this.sendCommand(
      'SET_CAMERA_TRANSFORM',
      { camera, durationMs },
      {
        params: { zoom: camera.zoom, focalPoint: camera.focalPoint },
      }
    );
  }

  public dispatchSceneLights(lights: SceneLight[]): string {
    return this.sendCommand('UPDATE_SCENE_LIGHTS', lights, {
      params: { count: lights.length },
    });
  }

  public dispatchZoneEmitters(emitters: SceneZoneEmitter[]): string {
    return this.sendCommand('UPDATE_ZONE_EMITTERS', emitters, {
      params: { count: emitters.length },
    });
  }

  public dispatchSceneInteractions(interactions: SceneInteraction[]): string {
    return this.sendCommand('UPDATE_SCENE_INTERACTIONS', interactions, {
      params: { count: interactions.length },
    });
  }

  public dispatchActiveHandout(handout: HandoutState | null): string {
    return this.sendCommand('UPDATE_ACTIVE_HANDOUT', handout, {
      params: { title: handout?.title || 'none', isRevealed: !!handout?.isFullyRevealed },
    });
  }

  public dispatchActiveRecap(recap: CampaignRecap | null): string {
    return this.sendCommand('UPDATE_ACTIVE_RECAP', recap, {
      params: {
        title: recap?.title || 'none',
        slideIndex: recap?.currentSlideIndex ?? -1,
        totalSlides: recap?.slides.length ?? 0,
      },
    });
  }

  public destroy(): void {
    if (this.unsubMessage) {
      this.unsubMessage();
      this.unsubMessage = null;
    }

    this.cancelPendingCommands('SessionCommandBus destruido');
  }
}

export const sessionCommandBus = new SessionCommandBus();
