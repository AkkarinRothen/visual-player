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
  X,
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

export interface FullScreenPreviewModalProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  hasPendingChanges: boolean;
  onChangePreviewTab: (tab: 'live' | 'staged') => void;
  onSendToScreen: () => void;
  onClose: () => void;
  mesaTelemetry?: MesaTelemetryInfo | null;
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

export const FullScreenPreviewModal: React.FC<FullScreenPreviewModalProps> = ({
  liveState,
  stagedState,
  operationMode,
  previewTab,
  hasPendingChanges,
  onChangePreviewTab,
  onSendToScreen,
  onClose,
  mesaTelemetry,
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
  const [inspectingPending, setInspectingPending] = useState<boolean>(false);
  const [isDirectorMode, setIsDirectorMode] = useState<boolean>(false);

  const hasAck = !!mesaTelemetry?.hasReceivedInitialMesaAck;
  const confirmedState = mesaTelemetry?.lastConfirmedStateSnapshot || null;
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
    <div className="modal-overlay preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-shell" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar */}
        <div className="preview-modal-header">
          <div className="preview-modal-tabs">
            <button
              className={`preview-tab-btn ${previewTab === 'live' ? 'active' : ''}`}
              onClick={() => {
                onChangePreviewTab('live');
                setInspectingPending(false);
              }}
            >
              <span className="dot-live"></span>
              <span>En Pantalla (Mesa)</span>
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
                <span>Borrador Preparado</span>
              </button>
            )}
          </div>

          <div className="preview-modal-actions">
            {previewTab === 'live' && !hasAck && (
              <button
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                  inspectingPending
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
                onClick={() => setInspectingPending(!inspectingPending)}
                title="Alternar entre estado de la Mesa y vista previa local esperada"
              >
                <Eye size={12} />
                <span>{inspectingPending ? 'Ver estado Mesa' : 'Ver vista prevista'}</span>
              </button>
            )}

            {previewTab === 'live' && hasAck && pendingCommandsCount > 0 && (
              <button
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                  inspectingPending
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
                onClick={() => setInspectingPending(!inspectingPending)}
                title={inspectingPending ? 'Volver a la vista confirmada' : 'Inspeccionar cambios en vuelo'}
              >
                <RefreshCw size={12} className={inspectingPending ? 'animate-spin' : ''} />
                <span>{inspectingPending ? 'Ver confirmada' : 'Ver pendientes en vuelo'}</span>
              </button>
            )}

            {/* Director Mode Button */}
            <button
              type="button"
              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                isDirectorMode
                  ? 'bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
              onClick={() => setIsDirectorMode(!isDirectorMode)}
              title="Activar / Desactivar Modo Dirección para mover y dirigir personajes en pantalla"
            >
              <Move size={12} />
              <span>{isDirectorMode ? 'Salir Dirección' : 'Modo Dirección'}</span>
            </button>

            {operationMode === 'staging' && hasPendingChanges && (
              <button
                className="btn-primary-sm send-staged-btn"
                onClick={() => {
                  onSendToScreen();
                  onClose();
                }}
              >
                <Send size={14} />
                <span>Enviar a Pantalla</span>
              </button>
            )}
            <button className="icon-btn-ghost" onClick={onClose} title="Cerrar Vista Previa">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Screen Preview Stage Container (Faithful 1:1 StageViewport) */}
        <div
          className="preview-stage-viewport relative overflow-hidden"
          style={{ width: '100%', height: '520px', background: '#000' }}
        >
          {previewTab === 'live' && !hasAck && !inspectingPending ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center">
              <Clock size={36} className="text-amber-400/80 mb-3 animate-pulse" />
              <h3 className="text-base font-semibold text-slate-200">Sin confirmación de la Mesa</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                La Mesa aún no ha confirmado la recepción de una escena publicada. Pulsa en “Ver vista prevista” para ver el estado local que se enviará.
              </p>
            </div>
          ) : (
            <StageViewport
              state={activeState}
              isScaledPreview={true}
              aspectRatio={targetAspectRatio}
              showBanner={!activeState.combatState?.isActive}
            />
          )}

          {/* Director Overlay (When Director Mode is Active) */}
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

          {/* Watermark Pill */}
          <div className="preview-watermark-pill flex items-center gap-3">
            {previewTab === 'staged' ? (
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>Borrador en preparación (No publicado a los jugadores)</span>
              </div>
            ) : inspectingPending ? (
              <div className="flex items-center gap-1.5 text-amber-300">
                <Eye size={14} />
                <span>
                  {hasAck
                    ? `Vista en tránsito (${pendingCommandsCount} cambios pendientes de confirmar)`
                    : 'Vista prevista local (Aún no confirmada por la Mesa)'}
                </span>
              </div>
            ) : !hasAck ? (
              <div className="flex items-center gap-1.5 text-amber-300">
                <Clock size={14} />
                <span>Sin confirmación de la Mesa física</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 font-semibold">
                  {mesaTelemetry.commandStatus === 'timed_out' ? (
                    <span className="text-amber-400 inline-flex items-center gap-1" title="La orden no recibió acuse de recibo antes del tiempo límite. Pulsa 'Comprobar Mesa' para verificar el estado real.">
                      <Clock size={14} />
                      <span>Sin respuesta de Mesa (Incierto) • Rev. {mesaTelemetry.lastAppliedRevision}</span>
                    </span>
                  ) : mesaTelemetry.commandStatus === 'error' ? (
                    <span className="text-rose-400 inline-flex items-center gap-1" title={mesaTelemetry.lastErrorMessage || 'Error en Mesa'}>
                      <AlertCircle size={14} />
                      <span>Error en Mesa • Rev. {mesaTelemetry.lastAppliedRevision}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-300 inline-flex items-center gap-1">
                      <CheckCircle size={14} />
                      <span>
                        Mesa Confirmada • Rev. {mesaTelemetry.lastAppliedRevision} (
                        {mesaTelemetry.viewport
                          ? `${mesaTelemetry.viewport.width}×${mesaTelemetry.viewport.height}`
                          : '16:9'}
                        )
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs border-l border-slate-700 pl-3">
                  {assetsStatus?.failedCount && assetsStatus.failedCount > 0 ? (
                    <span className="text-rose-400 font-medium inline-flex items-center gap-1">
                      <AlertTriangle size={12} />
                      <span>{assetsStatus.failedCount} imágenes fallidas</span>
                    </span>
                  ) : assetsStatus && !assetsStatus.isReady ? (
                    <span className="text-amber-300 font-medium inline-flex items-center gap-1">
                      <ImageIcon size={12} />
                      <span>Cargando imágenes ({assetsStatus.missingCount} pendientes)</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                      <ImageIcon size={12} />
                      <span>Imágenes listas</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs border-l border-slate-700 pl-3">
                  {audioStatus === 'interaction_required' ? (
                    <span className="text-amber-300 font-medium inline-flex items-center gap-1">
                      <VolumeX size={12} />
                      <span>Requiere interacción táctil en Mesa</span>
                    </span>
                  ) : audioStatus === 'enabled' ? (
                    <span className="text-sky-300 font-medium inline-flex items-center gap-1">
                      <Volume2 size={12} />
                      <span>Audio habilitado</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">Audio no iniciado</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pending asset alert overlay */}
          {isPendingLocalAsset && hasAck && (
            <div className="absolute top-3 right-3 bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-md flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400" />
              <span>Imágenes pendientes de carga completa en la pantalla de los jugadores</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
