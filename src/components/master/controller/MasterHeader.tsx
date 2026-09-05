import React from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CameraTransform,
  DisplayState,
  HistoryEvent,
  Scene,
} from '../../../types';
import { peerService } from '../../../services/peerService';
import { sessionRecoveryService } from '../../../services/sessionRecovery';
import { TransportStatusChip } from '../../common/TransportStatusChip';
import type { TransportStatusState } from '../../common/TransportStatusChip';
import { LiveMiniPreview } from '../LiveMiniPreview';
import type { VersionCompatibilityResult } from '../../../version';
import {
  Sparkles,
  RotateCcw,
  RotateCw,
  History,
  Bookmark,
  Activity,
  LogOut,
  WifiOff,
  AlertTriangle,
  X,
  Radio,
  Layers,
  CheckCheck,
  Send,
  EyeOff,
  Zap,
  Sliders,
  Swords,
  BookOpen,
  FolderOpen,
} from 'lucide-react';

export interface MasterHeaderProps {
  campaign: Campaign | null;
  roomCode?: string;
  pairingSecret?: string;
  connectionStatus: string;
  latencyMs: number;
  pastEvents: HistoryEvent[];
  futureEvents: HistoryEvent[];
  undo: () => void;
  redo: () => void;
  onExitToLobby?: () => void;
  connectToRoom: (code: string, secret?: string) => Promise<void> | void;
  versionCompatibility: VersionCompatibilityResult | null;
  runningMacro: any;
  cancelMacro: (restoreFn: (backup: DisplayState) => void) => void;
  restoreSnapshot: (state: DisplayState, desc: string) => void;
  operationMode: 'live' | 'staging';
  pendingChangesCount: number;
  onToggleOperationMode: (mode: 'live' | 'staging') => void;
  previewTab: 'live' | 'staged';
  setPreviewTab: (tab: 'live' | 'staged') => void;
  liveState: DisplayState;
  stagedState: DisplayState;
  activeDisplay: DisplayState;
  currentScene: Scene | null;
  mesaTelemetry: any;
  pendingCommandsCount: number;
  publishAllStaged: () => void;
  discardStaged: () => void;
  toggleBlackout: () => void;
  triggerLightning: () => void;
  triggerScreenShake: () => void;
  activeTab: 'live' | 'moments' | 'combat' | 'notes' | 'library';
  setActiveTab: (tab: 'live' | 'moments' | 'combat' | 'notes' | 'library') => void;
  sessionViewMode: 'session' | 'classic';
  // Modals openers
  onOpenCampaignPicker: () => void;
  onOpenQuickMoments: () => void;
  onOpenHistory: () => void;
  onOpenCheckpoints: () => void;
  onOpenDiagnostics: () => void;
  onOpenFullScreenPreview: () => void;
  onOpenSelectivePublish: () => void;
  // Director actions passed to LiveMiniPreview
  onSaveCameraPreset: (name: string, camera: CameraTransform) => Promise<void>;
  onSaveWaypoint: (waypoint: any) => Promise<void>;
  onSaveOcclusionRegion: (region: any) => Promise<void>;
  onDeleteWaypoint: (id: string) => Promise<void>;
  onDeleteOcclusionRegion: (id: string) => Promise<void>;
  onUpdateCharacter: (id: string, updates: any, desc: string) => Promise<void>;
  onUpdateProp: (id: string, updates: any, desc: string) => Promise<void>;
  onReorderLayers: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => Promise<void> | void;
  onUpdateCampaignCharacter: (id: string, updates: Partial<Character>) => Promise<void>;
  onUpdateMultipleCharacterPositions: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => Promise<void> | void;
  onFocusCamera: (focalX: number, focalY: number) => Promise<void> | void;
  onOpenCharacterLibrary: () => void;
  onRemoveCharacters: (ids: string[]) => void;
  onAddCharacter?: (character: CharacterOnScreen, description: string) => Promise<void> | void;
  onLiveDragMove?: (updates: { id: string; normalizedX: number; normalizedY: number }[]) => void;
}

export const MasterHeader: React.FC<MasterHeaderProps> = ({
  campaign,
  roomCode,
  pairingSecret,
  connectionStatus,
  latencyMs,
  pastEvents,
  futureEvents,
  undo,
  redo,
  onExitToLobby,
  connectToRoom,
  versionCompatibility,
  runningMacro,
  cancelMacro,
  restoreSnapshot,
  operationMode,
  pendingChangesCount,
  onToggleOperationMode,
  previewTab,
  setPreviewTab,
  liveState,
  stagedState,
  activeDisplay,
  currentScene,
  mesaTelemetry,
  pendingCommandsCount,
  publishAllStaged,
  discardStaged,
  toggleBlackout,
  triggerLightning,
  triggerScreenShake,
  activeTab,
  setActiveTab,
  sessionViewMode,
  onOpenCampaignPicker,
  onOpenQuickMoments,
  onOpenHistory,
  onOpenCheckpoints,
  onOpenDiagnostics,
  onOpenFullScreenPreview,
  onOpenSelectivePublish,
  onSaveCameraPreset,
  onSaveWaypoint,
  onSaveOcclusionRegion,
  onDeleteWaypoint,
  onDeleteOcclusionRegion,
  onUpdateCharacter,
  onUpdateProp,
  onReorderLayers,
  onUpdateCampaignCharacter,
  onUpdateMultipleCharacterPositions,
  onFocusCamera,
  onOpenCharacterLibrary,
  onRemoveCharacters,
  onAddCharacter,
  onLiveDragMove,
}) => {
  return (
    <header className="master-header">
      <div className="header-top">
        <div className="brand-group" onClick={onOpenCampaignPicker} style={{ cursor: 'pointer' }}>
          <h1 className="app-title">{campaign?.title || 'Visual Player'}</h1>
          <span className="app-badge">Cambiar</span>
        </div>

        <div className="connection-group" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {/* Quick Moments Button */}
          <button
            className="icon-action-btn moments-btn"
            onClick={onOpenQuickMoments}
            title="Disparador Rápido de Momentos / Macros"
          >
            <Sparkles size={15} className="text-amber-400" />
          </button>

          {/* Quick Undo / Redo / History / Checkpoint Actions */}
          <button
            className="icon-action-btn"
            onClick={undo}
            disabled={pastEvents.length === 0}
            title={pastEvents.length > 0 ? `Deshacer: ${pastEvents[0].description} (Ctrl+Z)` : 'Deshacer (Ctrl+Z)'}
            style={{ opacity: pastEvents.length === 0 ? 0.4 : 1 }}
          >
            <RotateCcw size={15} />
          </button>

          <button
            className="icon-action-btn"
            onClick={redo}
            disabled={futureEvents.length === 0}
            title={futureEvents.length > 0 ? `Rehacer: ${futureEvents[0].description} (Ctrl+Y)` : 'Rehacer (Ctrl+Y)'}
            style={{ opacity: futureEvents.length === 0 ? 0.4 : 1 }}
          >
            <RotateCw size={15} />
          </button>

          <button
            className="icon-action-btn"
            onClick={onOpenHistory}
            title="Ver Historial de Acciones"
          >
            <History size={15} />
          </button>

          <button
            className="icon-action-btn"
            onClick={onOpenCheckpoints}
            title="Puntos de Restauración (Checkpoints)"
          >
            <Bookmark size={15} />
          </button>

          <button
            className="icon-action-btn diagnostics-btn"
            onClick={onOpenDiagnostics}
            title="Diagnóstico de Red & Modo Caos (DEV)"
          >
            <Activity size={15} className={peerService.isChaosActive() ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
          </button>

          {/* Transport Status Chip */}
          {(() => {
            const transportStatus: TransportStatusState =
              connectionStatus === 'connected' ? 'internet'
              : connectionStatus === 'connecting' ? 'switching'
              : 'disconnected';
            return (
              <TransportStatusChip
                status={transportStatus}
                transportLabel="Internet"
                latencyMs={latencyMs > 0 ? latencyMs : undefined}
                role="master"
                onOpenDiagnostic={onOpenDiagnostics}
              />
            );
          })()}

          {onExitToLobby && (
            <button
              className="status-chip"
              onClick={() => {
                sessionRecoveryService.markCleanExit();
                onExitToLobby();
              }}
              title="Salir al Lobby"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {/* NON-INVASIVE FLOATING RECONNECTION TOAST */}
      {connectionStatus !== 'connected' && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(239, 68, 68, 0.18))',
          borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#fbbf24',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WifiOff size={14} className="animate-pulse" />
            <span>
              {connectionStatus === 'connecting'
                ? `Reconectando con la Mesa (${roomCode || '---'})... Los cambios se conservan.`
                : `Sin conexión con la Mesa (${roomCode || '---'}). Tus notas y fichas siguen disponibles.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => connectToRoom(roomCode || '', pairingSecret)}
            style={{
              background: 'rgba(245, 158, 11, 0.25)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              borderRadius: '6px',
              color: '#fbbf24',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reconectar
          </button>
        </div>
      )}

      {/* PERSISTENT CHAOS SIMULATION WARNING BANNER (DEV) */}
      {peerService.isChaosActive() && (
        <div className="chaos-warning-header-banner">
          <div className="flex-align-gap">
            <AlertTriangle size={15} className="text-amber-400 animate-bounce" />
            <span>
              <strong>MODO CAOS ACTIVO</strong>: {peerService.getChaosConfig().latencyMs}ms latencia • {Math.round(peerService.getChaosConfig().packetLossRate * 100)}% pérdida
              {peerService.getChaosConfig().isPartitioned && ' • CORTE TOTAL'}
            </span>
          </div>
          <div className="flex-align-gap">
            <button className="btn-chaos-mini" onClick={onOpenDiagnostics}>
              Ajustar
            </button>
            <button
              className="btn-chaos-mini reset"
              onClick={() => {
                peerService.resetChaos();
                alert('Red restablecida a condiciones normales (0ms, 0% pérdida).');
              }}
            >
              Restablecer
            </button>
          </div>
        </div>
      )}

      {/* VERSION COMPATIBILITY WARNING BANNER */}
      {versionCompatibility && versionCompatibility.status !== 'compatible' && (
        <div
          style={{
            padding: '6px 16px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: versionCompatibility.status === 'incompatible' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.2)',
            borderBottom: `1px solid ${versionCompatibility.status === 'incompatible' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)'}`,
            color: versionCompatibility.status === 'incompatible' ? '#fca5a5' : '#fbbf24',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} className={versionCompatibility.status === 'incompatible' ? 'text-red-400 animate-pulse' : 'text-amber-400'} />
            <span>
              <strong>{versionCompatibility.status === 'incompatible' ? 'AVISO CRÍTICO DE COMPATIBILIDAD' : 'AVISO DE CAPACIDADES'}</strong>: {versionCompatibility.message}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDiagnostics}
            style={{
              background: versionCompatibility.status === 'incompatible' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.25)',
              border: `1px solid ${versionCompatibility.status === 'incompatible' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)'}`,
              borderRadius: '6px',
              color: versionCompatibility.status === 'incompatible' ? '#fecaca' : '#fbbf24',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Diagnóstico
          </button>
        </div>
      )}

      {/* ACTIVE RUNNING MACRO SEQUENCE BAR */}
      {runningMacro && (
        <div className="running-macro-banner">
          <div className="running-macro-info">
            <Sparkles size={16} className="text-amber-400 animate-spin" />
            <span>
              Momento: <strong>{runningMacro.macro.name}</strong> (Paso {runningMacro.currentStepIndex + 1}/{runningMacro.totalSteps})
            </span>
          </div>
          <div className="running-macro-actions">
            <button
              className="macro-ctrl-btn danger"
              onClick={() => {
                cancelMacro((backup) => {
                  restoreSnapshot(backup, `Cancelada macro: ${runningMacro.macro.name}`);
                });
              }}
              title="Cancelar secuencia y restaurar estado anterior"
            >
              <X size={14} />
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* Operation Mode Selector Bar: Live vs Staging */}
      <div className="operation-mode-switcher-bar">
        <div className="mode-switch-group">
          <button
            className={`mode-switch-btn ${operationMode === 'live' ? 'active-live' : ''}`}
            onClick={() => onToggleOperationMode('live')}
          >
            <Radio size={14} className={operationMode === 'live' ? 'animate-pulse' : ''} />
            <span>⚡ EN VIVO</span>
          </button>

          <button
            className={`mode-switch-btn ${operationMode === 'staging' ? 'active-staging' : ''}`}
            onClick={() => onToggleOperationMode('staging')}
          >
            <Layers size={14} />
            <span>🛠️ PREPARACIÓN</span>
            {pendingChangesCount > 0 && (
              <span className="pending-badge-count">{pendingChangesCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Live Mini Preview Carousel in Header */}
      <LiveMiniPreview
        liveState={liveState}
        stagedState={stagedState}
        operationMode={operationMode}
        previewTab={previewTab}
        onChangePreviewTab={setPreviewTab}
        onOpenFullScreen={onOpenFullScreenPreview}
        mesaTelemetry={mesaTelemetry}
        isConnected={connectionStatus === 'connected'}
        pendingCommandsCount={pendingCommandsCount}
        campaignCharacters={campaign?.characters || []}
        groundLineY={currentScene?.groundLineY ?? liveState.groundLineY}
        savedCameraPresets={liveState.savedCameraPresets}
        props={currentScene?.props || liveState.props}
        occlusionRegions={currentScene?.occlusionRegions || liveState.occlusionRegions}
        waypoints={currentScene?.waypoints || liveState.waypoints}
        camera={liveState.camera}
        onSaveCameraPreset={onSaveCameraPreset}
        onSaveWaypoint={onSaveWaypoint}
        onSaveOcclusionRegion={onSaveOcclusionRegion}
        onDeleteWaypoint={onDeleteWaypoint}
        onDeleteOcclusionRegion={onDeleteOcclusionRegion}
        onUpdateCharacter={onUpdateCharacter}
        onUpdateProp={onUpdateProp}
        onReorderLayers={onReorderLayers}
        onUpdateCampaignCharacter={onUpdateCampaignCharacter}
        onUpdateMultipleCharacterPositions={onUpdateMultipleCharacterPositions}
        onFocusCamera={onFocusCamera}
        onUndo={undo}
        canUndo={pastEvents.length > 0}
        onOpenCharacterLibrary={onOpenCharacterLibrary}
        onRemoveCharacters={onRemoveCharacters}
        onAddCharacter={onAddCharacter}
        onLiveDragMove={onLiveDragMove}
      />

      {/* Floating / Sticky Staging Publish Bar */}
      {operationMode === 'staging' && pendingChangesCount > 0 && (
        <div className="staging-publish-sticky-bar">
          <div className="staging-info">
            <span className="staging-badge">BORRADOR</span>
            <span className="staging-count">{pendingChangesCount} cambios preparados</span>
          </div>
          <div className="staging-actions">
            <button
              className="btn-discard-staging"
              onClick={() => {
                discardStaged();
                setPreviewTab('live');
              }}
              title="Descartar borrador"
            >
              <RotateCcw size={14} />
              <span>Descartar</span>
            </button>

            <button
              className="btn-review-staging"
              onClick={onOpenSelectivePublish}
              title="Revisar diferencias e incoherencias antes de publicar"
            >
              <CheckCheck size={14} />
              <span>Revisar y Publicar</span>
            </button>

            <button
              className="btn-send-staging"
              onClick={() => {
                publishAllStaged();
                setPreviewTab('live');
              }}
              title="Enviar todos los cambios a la Tablet de un golpe"
            >
              <Send size={14} />
              <span>Publicar Todo</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Triggers Row */}
      <div className="quick-actions-bar">
        <button
          className={`action-pill ${activeDisplay.isBlackout ? 'blackout-active' : 'blackout-btn'}`}
          onClick={toggleBlackout}
        >
          <EyeOff size={16} />
          <span>{activeDisplay.isBlackout ? 'Encender Pantalla' : 'Blackout (Pánico)'}</span>
        </button>

        <button className="action-pill trigger-lightning-btn" onClick={triggerLightning}>
          <Zap size={16} />
          <span>Rayo</span>
        </button>

        <button className="action-pill trigger-shake-btn" onClick={triggerScreenShake}>
          <Activity size={16} />
          <span>Temblor</span>
        </button>
      </div>

      {/* Navigation Tabs (5 Tabs) */}
      <nav className="tab-navigation five-tabs">
        <button
          className={`nav-tab ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Sliders size={16} />
          <span>{sessionViewMode === 'session' ? 'Sesión' : 'En Vivo'}</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'moments' ? 'active' : ''}`}
          onClick={() => setActiveTab('moments')}
        >
          <Sparkles size={16} />
          <span>Momentos</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'combat' ? 'active' : ''}`}
          onClick={() => setActiveTab('combat')}
        >
          <Swords size={16} />
          <span>Combate</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <BookOpen size={16} />
          <span>Notas DM</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <FolderOpen size={16} />
          <span>Campañas</span>
        </button>
      </nav>
    </header>
  );
};
