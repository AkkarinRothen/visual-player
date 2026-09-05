import React, { useState } from 'react';
import type {
  DisplayState,
  Character,
  CharacterOnScreen,
  CameraTransform,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
} from '../../types';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  Move,
} from 'lucide-react';
import { StageViewport } from '../display/StageViewport';
import { CharacterDirectorOverlay } from './CharacterDirectorOverlay';
import type { MesaTelemetryInfo } from '../../services/sessionCommandBus';

export interface LiveMiniPreviewProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  onChangePreviewTab: (tab: 'live' | 'staged') => void;
  onOpenFullScreen: () => void;
  mesaTelemetry?: MesaTelemetryInfo | null;
  isConnected?: boolean;
  pendingCommandsCount?: number;
  campaignCharacters?: Character[];
  groundLineY?: number;
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  props?: SceneProp[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  camera?: CameraTransform;
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => void;
  onSaveWaypoint?: (waypoint: Omit<StageWaypoint, 'id'>) => void;
  onSaveOcclusionRegion?: (region: Omit<SceneOcclusionRegion, 'id'>) => void;
  onDeleteWaypoint?: (waypointId: string) => void;
  onDeleteOcclusionRegion?: (regionId: string) => void;
  onUpdateCharacter?: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateProp?: (propId: string, updates: Partial<SceneProp>, description: string) => void;
  onReorderLayers?: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => void;
  onUpdateCampaignCharacter?: (characterId: string, updates: Partial<Character>) => void;
  onUpdateMultipleCharacterPositions?: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => void;
  onFocusCamera?: (focalX: number, focalY: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onOpenCharacterLibrary?: () => void;
  onRemoveCharacters?: (ids: string[]) => void;
  onAddCharacter?: (character: CharacterOnScreen, description: string) => void;
  onLiveDragMove?: (updates: { id: string; normalizedX: number; normalizedY: number }[]) => void;
  followMesaLive?: boolean;
  setFollowMesaLive?: (follow: boolean) => void;
}

function formatTimeAgo(timestampMs?: number): string {
  if (!timestampMs) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - timestampMs) / 1000));
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

export const LiveMiniPreview: React.FC<LiveMiniPreviewProps> = ({
  liveState,
  stagedState,
  operationMode,
  previewTab,
  onChangePreviewTab,
  onOpenFullScreen,
  mesaTelemetry,
  isConnected = false,
  pendingCommandsCount = 0,
  campaignCharacters = [],
  groundLineY,
  savedCameraPresets,
  props,
  occlusionRegions,
  waypoints,
  camera,
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
  onUndo,
  canUndo = false,
  onOpenCharacterLibrary,
  onRemoveCharacters,
  onAddCharacter,
  onLiveDragMove,
  followMesaLive,
  setFollowMesaLive,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [inspectingPending, setInspectingPending] = useState<boolean>(false);
  const [isDirectorMode, setIsDirectorMode] = useState<boolean>(false);

  const hasAck = !!mesaTelemetry?.hasReceivedInitialMesaAck;
  const confirmedState = mesaTelemetry?.lastConfirmedStateSnapshot || null;

  // Decide what state to render
  const activeState =
    previewTab === 'staged'
      ? stagedState
      : inspectingPending
      ? liveState
      : confirmedState || liveState;

  const targetAspectRatio = mesaTelemetry?.viewport?.aspectRatio || 16 / 9;
  const assetsStatus = mesaTelemetry?.assetsStatus;
  const audioStatus = mesaTelemetry?.audioStatus || 'unknown';

  const isPendingLocalAsset =
    assetsStatus &&
    !assetsStatus.isReady &&
    (activeState.characters.length > 0 || !!activeState.backgroundUrl);

  return (
    <div className="mini-preview-root">
      <div className="mini-preview-header">
        <div className="preview-mode-tabs">
          <button
            className={`preview-tab-btn ${previewTab === 'live' ? 'active' : ''}`}
            onClick={() => {
              onChangePreviewTab('live');
              setInspectingPending(false);
            }}
          >
            <span className="dot-live"></span>
            <span>En Pantalla</span>
          </button>
          {operationMode === 'staging' && (
            <button
              className={`preview-tab-btn ${previewTab === 'staged' ? 'active staged' : ''}`}
              onClick={() => {
                onChangePreviewTab('staged');
                setInspectingPending(false);
              }}
            >
              <span className="dot-staged"></span>
              <span>Borrador</span>
            </button>
          )}
        </div>

        <div className="preview-header-actions">
          {previewTab === 'live' && !hasAck && isConnected && (
            <button
              className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                inspectingPending
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
              onClick={() => setInspectingPending(!inspectingPending)}
              title="Alternar entre estado de la Mesa y vista previa local esperada"
            >
              <Eye size={10} />
              <span>{inspectingPending ? 'Ver estado Mesa' : 'Vista prevista'}</span>
            </button>
          )}

          {previewTab === 'live' && hasAck && pendingCommandsCount > 0 && (
            <button
              className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
                inspectingPending
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
              onClick={() => setInspectingPending(!inspectingPending)}
              title={inspectingPending ? 'Volver a la vista confirmada' : 'Inspeccionar cambios en vuelo'}
            >
              <RefreshCw size={10} className={inspectingPending ? 'animate-spin' : ''} />
              <span>{inspectingPending ? 'Ver confirmada' : 'Ver pendientes'}</span>
            </button>
          )}

          {/* Director Mode Toggle Button */}
          <button
            className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${
              isDirectorMode
                ? 'bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
            onClick={() => setIsDirectorMode(!isDirectorMode)}
            title="Activar / Desactivar Modo Dirección para mover y dirigir personajes directamente"
          >
            <Move size={10} />
            <span>{isDirectorMode ? 'Salir Dirección' : 'Modo Dirección'}</span>
          </button>

          <button
            className="icon-btn-ghost"
            onClick={onOpenFullScreen}
            title="Abrir Vista Previa Completa"
          >
            <Maximize2 size={14} />
          </button>
          <button
            className="icon-btn-ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir Vista Previa' : 'Plegar Vista Previa'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div
          className="mini-preview-viewport relative"
          onClick={!isDirectorMode ? onOpenFullScreen : undefined}
          title={!isDirectorMode ? 'Pulsar para vista previa completa' : undefined}
          style={{ height: isDirectorMode ? '220px' : '148px', transition: 'height 250ms ease' }}
        >
          {/* Faithful 1:1 Stage Viewport (16:9 canvas with neutral bands fitting Mesa aspect ratio) */}
          {previewTab === 'live' && !hasAck && !inspectingPending && isConnected ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-3 text-center">
              <Clock size={20} className="text-amber-400/80 mb-1 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Sin confirmación de la Mesa</span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Esperando el primer reporte de estado publicado
              </span>
            </div>
          ) : (
            <StageViewport
              state={activeState}
              isScaledPreview={true}
              aspectRatio={targetAspectRatio}
              showBanner={true}
            />
          )}

          {/* Character Director Overlay (When Director Mode is active) */}
          {isDirectorMode && onUpdateCharacter && (
            <CharacterDirectorOverlay
              characters={activeState.characters}
              props={activeState.props || props}
              occlusionRegions={activeState.occlusionRegions || occlusionRegions}
              waypoints={activeState.waypoints || waypoints}
              campaignCharacters={campaignCharacters}
              isStaging={previewTab === 'staged'}
              groundLineY={activeState.groundLineY || groundLineY}
              camera={activeState.camera || camera}
              savedCameraPresets={activeState.savedCameraPresets || savedCameraPresets}
              onSaveCameraPreset={onSaveCameraPreset}
              onSaveWaypoint={onSaveWaypoint}
              onSaveOcclusionRegion={onSaveOcclusionRegion}
              onDeleteWaypoint={onDeleteWaypoint}
              onDeleteOcclusionRegion={onDeleteOcclusionRegion}
              onUpdateCharacter={onUpdateCharacter}
              onUpdateProp={onUpdateProp}
              onReorderLayers={onReorderLayers}
              onUpdateCampaignCharacter={onUpdateCampaignCharacter}
              onUpdateMultipleCharacterPositions={
                onUpdateMultipleCharacterPositions || (() => {})
              }
              onFocusCamera={onFocusCamera}
              onUndo={onUndo}
              canUndo={canUndo}
              onOpenCharacterLibrary={onOpenCharacterLibrary}
              onRemoveCharacters={onRemoveCharacters}
              onAddCharacter={onAddCharacter}
              onLiveDragMove={onLiveDragMove}
              followMesaLive={followMesaLive}
              setFollowMesaLive={setFollowMesaLive}
            />
          )}

          {/* Telemetry and 3 Independent Indicators Bar */}
          <div className="mini-preview-watermark flex flex-wrap items-center justify-between gap-1 text-[10px] leading-tight">
            {previewTab === 'staged' ? (
              <span className="inline-flex items-center gap-1 text-purple-300 font-semibold">
                <Clock size={10} />
                <span>BORRADOR PREPARADO (No publicado)</span>
              </span>
            ) : !isConnected ? (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <AlertTriangle size={10} />
                <span>
                  {mesaTelemetry?.lastConfirmedAt
                    ? `ÚLTIMA CONFIRMACIÓN ${formatTimeAgo(mesaTelemetry.lastConfirmedAt).toUpperCase()} (Desconectada)`
                    : 'SIMULACIÓN LOCAL (Mesa desconectada)'}
                </span>
              </span>
            ) : inspectingPending ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                <Clock size={10} />
                <span>
                  {hasAck
                    ? `PENDIENTE DE CONFIRMAR (${pendingCommandsCount} en vuelo)`
                    : 'VISTA PREVISTA (Sin confirmar por Mesa)'}
                </span>
              </span>
            ) : !hasAck ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Clock size={10} />
                <span>Sin confirmación de la Mesa</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full justify-between">
                {/* 1. Estado de comando */}
                <div className="inline-flex items-center gap-1">
                  {pendingCommandsCount > 0 ? (
                    <span className="text-amber-300 font-semibold inline-flex items-center gap-1">
                      <Send size={10} className="animate-pulse" />
                      <span>Enviando ({pendingCommandsCount})</span>
                    </span>
                  ) : mesaTelemetry?.commandStatus === 'timed_out' ? (
                    <span className="text-amber-400 font-semibold inline-flex items-center gap-1" title="La orden no recibió acuse de recibo antes del tiempo límite. Pulsa 'Comprobar Mesa' para auditar el estado real.">
                      <Clock size={10} />
                      <span>Sin respuesta (Incierto)</span>
                    </span>
                  ) : mesaTelemetry?.commandStatus === 'error' ? (
                    <span className="text-rose-400 font-semibold inline-flex items-center gap-1" title={mesaTelemetry.lastErrorMessage || 'Error en Mesa'}>
                      <AlertCircle size={10} />
                      <span>Error en Mesa</span>
                    </span>
                  ) : (
                    <span className="text-emerald-300 font-semibold inline-flex items-center gap-1">
                      <CheckCircle size={10} />
                      <span>Rev. {mesaTelemetry?.lastAppliedRevision ?? 1}</span>
                    </span>
                  )}
                </div>

                {/* 2. Recursos Visuales / Imágenes */}
                <div className="inline-flex items-center gap-1">
                  {assetsStatus?.failedCount && assetsStatus.failedCount > 0 ? (
                    <span className="text-rose-400 font-medium inline-flex items-center gap-0.5">
                      <AlertTriangle size={10} />
                      <span>{assetsStatus.failedCount} img fallidas</span>
                    </span>
                  ) : assetsStatus && !assetsStatus.isReady ? (
                    <span className="text-amber-300 font-medium inline-flex items-center gap-0.5">
                      <ImageIcon size={10} />
                      <span>Cargando ({assetsStatus.missingCount} pend.)</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400/90 font-medium inline-flex items-center gap-0.5">
                      <ImageIcon size={10} />
                      <span>Img listas</span>
                    </span>
                  )}
                </div>

                {/* 3. Audio */}
                <div className="inline-flex items-center gap-1">
                  {audioStatus === 'interaction_required' ? (
                    <span
                      className="text-amber-300 font-medium inline-flex items-center gap-0.5"
                      title="El navegador de la Mesa requiere un toque para permitir sonido"
                    >
                      <VolumeX size={10} />
                      <span>Tocar Mesa</span>
                    </span>
                  ) : audioStatus === 'enabled' ? (
                    <span className="text-sky-300 font-medium inline-flex items-center gap-0.5">
                      <Volume2 size={10} />
                      <span>Audio OK</span>
                    </span>
                  ) : audioStatus === 'error' ? (
                    <span className="text-rose-400 font-medium inline-flex items-center gap-0.5">
                      <VolumeX size={10} />
                      <span>Audio error</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">Audio -</span>
                  )}
                </div>
              </div>
            )}

            {/* Warning if GM shows image that is still pending on Mesa */}
            {isPendingLocalAsset && isConnected && hasAck && (
              <div className="w-full text-center text-[9px] text-amber-400 font-medium bg-amber-950/40 py-0.5 rounded border border-amber-500/20 mt-0.5">
                ⚠️ Imagen pendiente de descarga en la Mesa
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
