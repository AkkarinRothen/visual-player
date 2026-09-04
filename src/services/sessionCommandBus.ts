import type {
  AckPayload,
  SyncMessageType,
  DisplayViewportTelemetry,
  DisplayAssetsStatus,
  DisplayAudioStatus,
  AuditMesaReport,
  CommandResultPayload,
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
  audioStatus?: DisplayAudioStatus;
  commandStatus?: 'no_ack' | 'pending' | 'applied' | 'error' | 'timed_out';
  lastAppliedRevision?: number;
  lastConfirmedAt?: number;
  lastConfirmedStateSnapshot?: DisplayState;
  sessionId?: string;
  targetDeviceId?: string;
  hasReceivedInitialMesaAck?: boolean;
  lastAuditReport?: AuditMesaReport;
  lastErrorMessage?: string;
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
  private stateSnapshotsByCommandId: Map<string, DisplayState> = new Map();
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

      // Handle real-time viewport changes from Mesa (orientation, fullscreen, resize, asset loading, audio unlock)
      if (vMsg.type === 'MESA_VIEWPORT_CHANGED') {
        const p = vMsg.payload as {
          viewport: DisplayViewportTelemetry;
          assetsStatus?: DisplayAssetsStatus;
          audioStatus?: DisplayAudioStatus;
        };
        if (p && p.viewport) {
          this.lastMesaTelemetry = {
            viewport: p.viewport,
            assetsStatus: p.assetsStatus || this.lastMesaTelemetry?.assetsStatus,
            audioStatus: p.audioStatus || this.lastMesaTelemetry?.audioStatus,
            commandStatus: this.lastMesaTelemetry?.commandStatus,
            lastAppliedRevision: this.lastMesaTelemetry?.lastAppliedRevision,
            lastConfirmedAt: Date.now(),
            lastConfirmedStateSnapshot: this.lastMesaTelemetry?.lastConfirmedStateSnapshot,
            sessionId: this.sessionId,
            hasReceivedInitialMesaAck: this.lastMesaTelemetry?.hasReceivedInitialMesaAck ?? false,
          };
          this.emitTelemetry();
        }
        return;
      }

      // Handle non-destructive AUDIT_MESA_RESPONSE
      if (vMsg.type === 'AUDIT_MESA_RESPONSE') {
        const report = vMsg.payload as AuditMesaReport;
        if (report) {
          this.lastMesaTelemetry = {
            ...(this.lastMesaTelemetry || {}),
            viewport: report.viewport,
            assetsStatus: report.assetsStatus,
            audioStatus: report.audioStatus,
            lastAppliedRevision: report.revision,
            lastConfirmedAt: report.timestamp || Date.now(),
            sessionId: report.sessionId || this.sessionId,
            targetDeviceId: report.deviceId,
            hasReceivedInitialMesaAck: true,
            lastAuditReport: report,
            commandStatus: this.pendingTimeouts.size > 0 ? 'pending' : 'applied',
          };
          this.emitTelemetry();
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

  private emitTelemetry(): void {
    this.telemetryListeners.forEach((listener) => {
      try {
        listener(this.lastMesaTelemetry);
      } catch (e) {
        console.error('[SessionCommandBus] Error in telemetry listener:', e);
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

      const confirmedSnapshot = this.stateSnapshotsByCommandId.get(result.commandId);
      this.stateSnapshotsByCommandId.delete(result.commandId);

      // Update confirmed telemetry from Mesa
      this.lastMesaTelemetry = {
        viewport: result.viewport || this.lastMesaTelemetry?.viewport,
        assetsStatus: result.assetsStatus || this.lastMesaTelemetry?.assetsStatus,
        audioStatus: result.audioStatus || this.lastMesaTelemetry?.audioStatus || 'unknown',
        commandStatus: this.pendingTimeouts.size > 0 ? 'pending' : 'applied',
        lastAppliedRevision: result.revision || this.lastMesaTelemetry?.lastAppliedRevision,
        lastConfirmedAt: result.appliedAt || Date.now(),
        lastConfirmedStateSnapshot: confirmedSnapshot || this.lastMesaTelemetry?.lastConfirmedStateSnapshot,
        sessionId: result.sessionId || this.sessionId,
        targetDeviceId: result.targetDeviceId,
        hasReceivedInitialMesaAck: true,
      };
      this.emitTelemetry();
    } else {
      this.stateSnapshotsByCommandId.delete(result.commandId);
      this.store.markRejected(result.commandId, {
        code: result.errorCode,
        message: result.errorMessage,
      });
      this.lastMesaTelemetry = {
        ...(this.lastMesaTelemetry || {}),
        commandStatus: 'error',
        lastErrorMessage: result.errorMessage || result.errorCode || 'Error al aplicar comando en la Mesa',
      };
      this.emitTelemetry();
    }
  }

  public recordConfirmedState(state: DisplayState, revision?: number): void {
    this.lastMesaTelemetry = {
      ...(this.lastMesaTelemetry || {}),
      lastConfirmedStateSnapshot: state,
      lastAppliedRevision: revision ?? this.lastMesaTelemetry?.lastAppliedRevision,
      lastConfirmedAt: Date.now(),
      sessionId: this.sessionId,
      hasReceivedInitialMesaAck: true,
      commandStatus: this.pendingTimeouts.size > 0 ? 'pending' : 'applied',
    };
    this.emitTelemetry();
  }

  public requestMesaAudit(): void {
    if (this.transport.getStatus() !== 'connected') {
      console.warn('[SessionCommandBus] Cannot audit Mesa: transport disconnected');
      return;
    }
    const message = {
      type: 'AUDIT_MESA_REQUEST',
      payload: { timestamp: Date.now() },
      sessionId: this.sessionId,
      connectionEpoch: this.connectionEpoch,
    };
    this.transport.send(message as any);
  }

  public resyncMesa(publicState: DisplayState): void {
    if (this.transport.getStatus() !== 'connected') {
      console.warn('[SessionCommandBus] Cannot resync Mesa: transport disconnected');
      return;
    }
    // Cancel in-flight pending commands to avoid old commands overwriting the resynced state (Pregunta 8)
    this.pendingTimeouts.forEach((timer) => clearTimeout(timer));
    this.pendingTimeouts.clear();
    this.stateSnapshotsByCommandId.clear();
    // Advance connectionEpoch so Mesa strictly rejects any delayed command sent before this resync (Pregunta 4)
    this.connectionEpoch++;

    // Mark previous in-flight commands in store as superseded
    this.store.getAllReceipts().forEach((receipt) => {
      if (receipt.status === 'sent' || receipt.status === 'received') {
        this.store.markRejected(receipt.commandId, {
          code: 'SUPERSEDED_BY_RESYNC',
          message: 'Comando anterior invalidado por resincronización de Mesa',
        });
      }
    });

    this.recordConfirmedState(publicState);
    const message = {
      type: 'FULL_STATE',
      payload: sanitizeDisplayStateForDisplay(publicState),
      isResync: true,
      sessionId: this.sessionId,
      connectionEpoch: this.connectionEpoch,
    };
    this.transport.send(message as any);
  }

  public getSanitizedDiagnosticReport(): Record<string, unknown> {
    const receipts = this.store.getAllReceipts();
    const applied = receipts.filter((r) => r.status === 'applied').length;
    const pending = receipts.filter((r) => r.status === 'sent' || r.status === 'received').length;
    const rejected = receipts.filter((r) => r.status === 'rejected' || r.status === 'timed_out').length;

    return {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      connectionEpoch: this.connectionEpoch,
      transportStatus: this.transport.getStatus(),
      targetDeviceId: this.lastMesaTelemetry?.targetDeviceId || 'unknown',
      hasReceivedInitialMesaAck: !!this.lastMesaTelemetry?.hasReceivedInitialMesaAck,
      lastAppliedRevision: this.lastMesaTelemetry?.lastAppliedRevision ?? null,
      lastConfirmedAt: this.lastMesaTelemetry?.lastConfirmedAt ? new Date(this.lastMesaTelemetry.lastConfirmedAt).toISOString() : null,
      commandStatus: this.lastMesaTelemetry?.commandStatus || (this.lastMesaTelemetry?.hasReceivedInitialMesaAck ? 'applied' : 'no_ack'),
      viewport: this.lastMesaTelemetry?.viewport ? {
        width: this.lastMesaTelemetry.viewport.width,
        height: this.lastMesaTelemetry.viewport.height,
        aspectRatio: this.lastMesaTelemetry.viewport.aspectRatio,
      } : null,
      assetsStatus: this.lastMesaTelemetry?.assetsStatus ? {
        isReady: this.lastMesaTelemetry.assetsStatus.isReady,
        missingCount: this.lastMesaTelemetry.assetsStatus.missingCount,
        failedCount: this.lastMesaTelemetry.assetsStatus.failedCount ?? 0,
      } : null,
      audioStatus: this.lastMesaTelemetry?.audioStatus || 'unknown',
      commandsSummary: {
        total: receipts.length,
        applied,
        pending,
        rejected,
      },
    };
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

  public onTelemetry(listener: (telemetry: MesaTelemetryInfo | null) => void): () => void {
    return this.onMesaTelemetry(listener);
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

  public getPendingCommandsCount(): number {
    return this.pendingTimeouts.size;
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
      stateSnapshot?: DisplayState;
    }
  ): string {
    const commandId = options?.commandId || this.generateCommandId(type.toLowerCase());
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    if (options?.stateSnapshot) {
      this.stateSnapshotsByCommandId.set(commandId, options.stateSnapshot);
    }

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
      if (this.lastMesaTelemetry) {
        this.lastMesaTelemetry = {
          ...this.lastMesaTelemetry,
          commandStatus: this.pendingTimeouts.size > 0 ? 'pending' : 'timed_out',
        };
        this.emitTelemetry();
      }
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
