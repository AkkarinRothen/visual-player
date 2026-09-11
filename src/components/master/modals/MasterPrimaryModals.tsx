import React, { Suspense, lazy } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CameraTransform,
  DisplayState,
  HistoryEvent,
  Scene,
  SessionCheckpoint,
  PublishCategoryKey,
} from '../../../types';
import { soundEngine } from '../../../services/soundEngine';
import { QuickMomentsDropdown } from '../QuickMomentsDropdown';
import { Send, Trash2 } from 'lucide-react';
import { modalLoaders } from './modalPrefetch';

const SelectivePublishModal = lazy(() => modalLoaders.selectivePublish().then(m => ({ default: m.SelectivePublishModal })));
const FullScreenPreviewModal = lazy(() => modalLoaders.fullScreenPreview().then(m => ({ default: m.FullScreenPreviewModal })));
const ConnectionDiagnosticModal = lazy(() => modalLoaders.connectionDiagnostic().then(m => ({ default: m.ConnectionDiagnosticModal })));
const HistoryModal = lazy(() => modalLoaders.history().then(m => ({ default: m.HistoryModal })));
const CheckpointsModal = lazy(() => modalLoaders.checkpoints().then(m => ({ default: m.CheckpointsModal })));
const CampaignPickerModal = lazy(() => modalLoaders.campaignPicker().then(m => ({ default: m.CampaignPickerModal })));
const SceneEditModal = lazy(() => modalLoaders.sceneEdit().then(m => ({ default: m.SceneEditModal })));
const CharacterEditModal = lazy(() => modalLoaders.characterEdit().then(m => ({ default: m.CharacterEditModal })));
const SummonCharacterModal = lazy(() => modalLoaders.summonCharacter().then(m => ({ default: m.SummonCharacterModal })));
const MasterQRModal = lazy(() => modalLoaders.masterQR().then(m => ({ default: m.MasterQRModal })));
const NetworkDiagnosticsModal = lazy(() => modalLoaders.networkDiagnostics().then(m => ({ default: m.NetworkDiagnosticsModal })));

import { useMasterModalStore } from '../../../stores/useMasterModalStore';
import { useDisplayStore, selectPendingChangesCount } from '../../../stores/useDisplayStore';
import { useCampaignStore } from '../../../stores/useCampaignStore';

export interface MasterPrimaryModalsProps {
  campaign?: Campaign | null;
  campaignList?: Campaign[];
  setCampaign?: React.Dispatch<React.SetStateAction<Campaign | null>>;
  setCampaignList?: React.Dispatch<React.SetStateAction<Campaign[]>>;
  liveState?: DisplayState;
  stagedState?: DisplayState;
  activeDisplay?: DisplayState;
  operationMode?: 'live' | 'staging';
  previewTab?: 'live' | 'staged';
  setPreviewTab?: (tab: 'live' | 'staged') => void;
  setOperationMode?: (mode: 'live' | 'staging') => void;
  pendingChangesCount?: number;
  currentScene?: Scene | null;
  mesaTelemetry?: any;
  pendingCommandsCount?: number;
  pastEvents?: HistoryEvent[];
  checkpointsList?: SessionCheckpoint[];
  roomCode?: string;
  pairingSecret?: string;
  connectionStatus?: string;
  latencyMs?: number;
  joinUrl?: string;
  // Modals Visibility
  showSelectivePublishModal?: boolean;
  setShowSelectivePublishModal?: (show: boolean) => void;
  showFullScreenPreview?: boolean;
  setShowFullScreenPreview?: (show: boolean) => void;
  showDiagnosticsModal?: boolean;
  setShowDiagnosticsModal?: (show: boolean) => void;
  showQuickMoments?: boolean;
  setShowQuickMoments?: (show: boolean) => void;
  showHistoryModal?: boolean;
  setShowHistoryModal?: (show: boolean) => void;
  showCheckpointsModal?: boolean;
  setShowCheckpointsModal?: (show: boolean) => void;
  showUnsavedStagingDialog?: boolean;
  setShowUnsavedStagingDialog?: (show: boolean) => void;
  showCampaignPickerModal?: boolean;
  setShowCampaignPickerModal?: (show: boolean) => void;
  showNewSceneModal?: boolean;
  setShowNewSceneModal?: (show: boolean) => void;
  editingScene?: Scene | null;
  setEditingScene?: (scene: Scene | null) => void;
  showNewCharModal?: boolean;
  setShowNewCharModal?: (show: boolean) => void;
  editingChar?: Character | null;
  setEditingChar?: (char: Character | null) => void;
  showSummonModal?: boolean;
  setShowSummonModal?: (show: boolean) => void;
  showQRModal?: boolean;
  setShowQRModal?: (show: boolean) => void;
  // Actions
  publishAllStaged?: () => void;
  publishSelectiveStaged?: (keys: PublishCategoryKey[]) => void;
  discardStaged?: () => void;
  broadcastFullState?: (state: DisplayState) => void;
  connectToRoom?: (code: string, secret?: string) => Promise<void> | void;
  handleExecuteMacro?: (macro: any) => void;
  handleLoadMacroToStaging?: (macro: any) => void;
  handleRestoreFromHistory?: (evt: HistoryEvent) => void;
  handleSaveManualCheckpoint?: (name: string) => Promise<void>;
  handleRestoreCheckpoint?: (cp: SessionCheckpoint) => Promise<void>;
  handleDeleteCheckpoint?: (id: string) => Promise<void>;
  handleSwitchCampaign?: (camp: Campaign) => Promise<void>;
  handleDuplicateCampaign?: (id: string) => Promise<void>;
  handleDeleteCampaign?: (id: string, title: string) => Promise<void>;
  selectScene?: (scene: Scene) => void;
  summonCharacter?: (char: Character) => void;
  undo?: () => void;
  // Director actions
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => Promise<void>;
  onSaveWaypoint?: (waypoint: any) => Promise<void>;
  onSaveOcclusionRegion?: (region: any) => Promise<void>;
  onDeleteWaypoint?: (id: string) => Promise<void>;
  onDeleteOcclusionRegion?: (id: string) => Promise<void>;
  onUpdateCharacter?: (id: string, updates: any, desc: string) => Promise<void>;
  onUpdateProp?: (id: string, updates: any, desc: string) => Promise<void>;
  onReorderLayers?: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => Promise<void> | void;
  onUpdateCampaignCharacter?: (id: string, updates: Partial<Character>) => Promise<void>;
  onUpdateMultipleCharacterPositions?: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => Promise<void> | void;
  onFocusCamera?: (focalX: number, focalY: number) => Promise<void> | void;
  onOpenCharacterLibrary?: () => void;
  onRemoveCharacters?: (ids: string[]) => void;
  onAddCharacter?: (character: CharacterOnScreen, description: string) => Promise<void> | void;
  onLiveDragMove?: (updates: { id: string; normalizedX: number; normalizedY: number }[]) => void;
}

export const MasterPrimaryModals: React.FC<MasterPrimaryModalsProps> = (props) => {
  const modalStore = useMasterModalStore();
  const displayStore = useDisplayStore();
  const campaignStore = useCampaignStore();

  const campaign = props.campaign !== undefined ? props.campaign : campaignStore.campaign;
  const campaignList = props.campaignList ?? campaignStore.campaignList;
  const setCampaign = props.setCampaign ?? campaignStore.setCampaign;
  const setCampaignList = props.setCampaignList ?? campaignStore.setCampaignList;
  const liveState = props.liveState ?? displayStore.liveState;
  const stagedState = props.stagedState ?? displayStore.stagedState;
  const activeDisplay = props.activeDisplay ?? (displayStore.operationMode === 'live' ? displayStore.liveState : displayStore.stagedState);
  const operationMode = props.operationMode ?? displayStore.operationMode;
  const previewTab = props.previewTab ?? 'live';
  const setPreviewTab = props.setPreviewTab ?? (() => {});
  const setOperationMode = props.setOperationMode ?? displayStore.setOperationMode;
  const pendingChangesCount = props.pendingChangesCount ?? selectPendingChangesCount(displayStore);
  const currentScene = props.currentScene ?? null;
  const mesaTelemetry = props.mesaTelemetry;
  const pendingCommandsCount = props.pendingCommandsCount ?? 0;
  const pastEvents = props.pastEvents ?? displayStore.pastEvents;
  const checkpointsList = props.checkpointsList ?? [];
  const roomCode = props.roomCode;
  const pairingSecret = props.pairingSecret;
  const connectionStatus = props.connectionStatus ?? 'disconnected';
  const latencyMs = props.latencyMs ?? 0;
  const joinUrl = props.joinUrl ?? '';

  const showSelectivePublishModal = props.showSelectivePublishModal ?? modalStore.showSelectivePublishModal;
  const setShowSelectivePublishModal = props.setShowSelectivePublishModal ?? modalStore.setShowSelectivePublishModal;
  const showFullScreenPreview = props.showFullScreenPreview ?? modalStore.showFullScreenPreview;
  const setShowFullScreenPreview = props.setShowFullScreenPreview ?? modalStore.setShowFullScreenPreview;
  const showDiagnosticsModal = props.showDiagnosticsModal ?? modalStore.showDiagnosticsModal;
  const setShowDiagnosticsModal = props.setShowDiagnosticsModal ?? modalStore.setShowDiagnosticsModal;
  const showQuickMoments = props.showQuickMoments ?? modalStore.showQuickMoments;
  const setShowQuickMoments = props.setShowQuickMoments ?? modalStore.setShowQuickMoments;
  const showHistoryModal = props.showHistoryModal ?? modalStore.showHistoryModal;
  const setShowHistoryModal = props.setShowHistoryModal ?? modalStore.setShowHistoryModal;
  const showCheckpointsModal = props.showCheckpointsModal ?? modalStore.showCheckpointsModal;
  const setShowCheckpointsModal = props.setShowCheckpointsModal ?? modalStore.setShowCheckpointsModal;
  const showUnsavedStagingDialog = props.showUnsavedStagingDialog ?? modalStore.showUnsavedStagingDialog;
  const setShowUnsavedStagingDialog = props.setShowUnsavedStagingDialog ?? modalStore.setShowUnsavedStagingDialog;
  const showCampaignPickerModal = props.showCampaignPickerModal ?? modalStore.showCampaignPickerModal;
  const setShowCampaignPickerModal = props.setShowCampaignPickerModal ?? modalStore.setShowCampaignPickerModal;
  const showNewSceneModal = props.showNewSceneModal ?? modalStore.showNewSceneModal;
  const setShowNewSceneModal = props.setShowNewSceneModal ?? modalStore.setShowNewSceneModal;
  const editingScene = props.editingScene ?? null;
  const setEditingScene = props.setEditingScene ?? (() => {});
  const showNewCharModal = props.showNewCharModal ?? modalStore.showNewCharModal;
  const setShowNewCharModal = props.setShowNewCharModal ?? modalStore.setShowNewCharModal;
  const editingChar = props.editingChar ?? null;
  const setEditingChar = props.setEditingChar ?? (() => {});
  const showSummonModal = props.showSummonModal ?? modalStore.showSummonModal;
  const setShowSummonModal = props.setShowSummonModal ?? modalStore.setShowSummonModal;
  const showQRModal = props.showQRModal ?? modalStore.showQRModal;
  const setShowQRModal = props.setShowQRModal ?? modalStore.setShowQRModal;

  const publishAllStaged = props.publishAllStaged ?? displayStore.publishAllStaged;
  const publishSelectiveStaged = props.publishSelectiveStaged ?? displayStore.publishSelectiveStaged;
  const discardStaged = props.discardStaged ?? displayStore.discardStaged;
  const broadcastFullState = props.broadcastFullState ?? (() => {});
  const connectToRoom = props.connectToRoom ?? (() => {});
  const handleExecuteMacro = props.handleExecuteMacro ?? (() => {});
  const handleLoadMacroToStaging = props.handleLoadMacroToStaging ?? (() => {});
  const handleRestoreFromHistory = props.handleRestoreFromHistory ?? (() => {});
  const handleSaveManualCheckpoint = props.handleSaveManualCheckpoint ?? (async () => {});
  const handleRestoreCheckpoint = props.handleRestoreCheckpoint ?? (async () => {});
  const handleDeleteCheckpoint = props.handleDeleteCheckpoint ?? (async () => {});
  const handleSwitchCampaign = props.handleSwitchCampaign ?? (async (c) => campaignStore.selectCampaign(c.id));
  const handleDuplicateCampaign = props.handleDuplicateCampaign ?? (async (id) => { await campaignStore.duplicateCampaign(id); });
  const handleDeleteCampaign = props.handleDeleteCampaign ?? (async (id) => { await campaignStore.deleteCampaign(id); });
  const selectScene = props.selectScene ?? (() => {});
  const summonCharacter = props.summonCharacter ?? (() => {});
  const undo = props.undo ?? displayStore.undo;

  const onSaveCameraPreset = props.onSaveCameraPreset ?? (async () => {});
  const onSaveWaypoint = props.onSaveWaypoint ?? (async () => {});
  const onSaveOcclusionRegion = props.onSaveOcclusionRegion ?? (async () => {});
  const onDeleteWaypoint = props.onDeleteWaypoint ?? (async () => {});
  const onDeleteOcclusionRegion = props.onDeleteOcclusionRegion ?? (async () => {});
  const onUpdateCharacter = props.onUpdateCharacter ?? (async () => {});
  const onUpdateProp = props.onUpdateProp ?? (async () => {});
  const onReorderLayers = props.onReorderLayers ?? (() => {});
  const onUpdateCampaignCharacter = props.onUpdateCampaignCharacter ?? (async () => {});
  const onUpdateMultipleCharacterPositions = props.onUpdateMultipleCharacterPositions ?? (() => {});
  const onFocusCamera = props.onFocusCamera ?? (() => {});
  const onOpenCharacterLibrary = props.onOpenCharacterLibrary ?? (() => modalStore.setShowSummonModal(true));
  const onRemoveCharacters = props.onRemoveCharacters ?? (() => {});
  const onAddCharacter = props.onAddCharacter;
  const onLiveDragMove = props.onLiveDragMove;
  return (
    <Suspense fallback={null}>
      {/* SELECTIVE PUBLISH MODAL */}
      {showSelectivePublishModal && (
        <SelectivePublishModal
          liveState={liveState}
          stagedState={stagedState}
          campaign={campaign}
          onPublishSelective={(keys) => {
            publishSelectiveStaged(keys);
            setPreviewTab('live');
          }}
          onPublishAll={() => {
            publishAllStaged();
            setPreviewTab('live');
          }}
          onClose={() => setShowSelectivePublishModal(false)}
        />
      )}

      {/* FULL SCREEN PREVIEW MODAL */}
      {showFullScreenPreview && (
        <FullScreenPreviewModal
          liveState={liveState}
          stagedState={stagedState}
          operationMode={operationMode}
          previewTab={previewTab}
          hasPendingChanges={pendingChangesCount > 0}
          onChangePreviewTab={setPreviewTab}
          onSendToScreen={() => {
            publishAllStaged();
            setPreviewTab('live');
          }}
          onClose={() => setShowFullScreenPreview(false)}
          mesaTelemetry={mesaTelemetry}
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
      )}

      {/* CONNECTION DIAGNOSTIC & MESA AUDIT/RESYNC MODAL */}
      {showDiagnosticsModal && (
        <ConnectionDiagnosticModal
          isOpen={showDiagnosticsModal}
          onClose={() => setShowDiagnosticsModal(false)}
          liveState={liveState}
          onResyncMesa={() => {
            broadcastFullState(liveState);
          }}
        />
      )}

      {/* QUICK MOMENTS DROPDOWN */}
      {showQuickMoments && (
        <QuickMomentsDropdown
          macros={campaign?.macros || []}
          onExecuteMacro={handleExecuteMacro}
          onLoadMacroToStaging={handleLoadMacroToStaging}
          onClose={() => setShowQuickMoments(false)}
        />
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <HistoryModal
          pastEvents={pastEvents}
          onRestoreEvent={handleRestoreFromHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* CHECKPOINTS MODAL */}
      {showCheckpointsModal && (
        <CheckpointsModal
          checkpoints={checkpointsList}
          onSaveManualCheckpoint={handleSaveManualCheckpoint}
          onRestoreCheckpoint={handleRestoreCheckpoint}
          onDeleteCheckpoint={handleDeleteCheckpoint}
          onClose={() => setShowCheckpointsModal(false)}
        />
      )}

      {/* DIALOG: UNSAVED STAGING CHANGES WHEN SWITCHING TO LIVE */}
      {showUnsavedStagingDialog && (
        <div className="modal-overlay" onClick={() => setShowUnsavedStagingDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cambios Pendientes en Borrador</h2>
            </div>
            <p className="modal-dialog-text">
              Tienes <strong>{pendingChangesCount} cambios preparados</strong> que aún no se han enviado a la pantalla. ¿Qué deseas hacer al volver al modo En Vivo?
            </p>
            <div className="modal-dialog-actions-vertical">
              <button
                className="btn-primary full"
                onClick={() => {
                  publishAllStaged();
                  setOperationMode('live');
                  setShowUnsavedStagingDialog(false);
                }}
              >
                <Send size={16} />
                <span>Publicar y Enviar a Pantalla</span>
              </button>

              <button
                className="btn-secondary full"
                onClick={() => {
                  setOperationMode('live');
                  setShowUnsavedStagingDialog(false);
                }}
              >
                <span>Conservar como Borrador (Sin Publicar)</span>
              </button>

              <button
                className="btn-danger full"
                onClick={() => {
                  discardStaged();
                  setOperationMode('live');
                  setShowUnsavedStagingDialog(false);
                }}
              >
                <Trash2 size={16} />
                <span>Descartar Borrador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CAMPAIGN PICKER & MANAGER */}
      {showCampaignPickerModal && (
        <CampaignPickerModal
          isOpen={showCampaignPickerModal}
          campaigns={campaignList}
          activeCampaignId={campaign?.id}
          onSelectCampaign={handleSwitchCampaign}
          onCreateCampaign={async (title, desc) => {
            const { createCampaign, getAllCampaigns, setActiveCampaignId } = await import('../../../db');
            const { DEMO_SCENES, DEMO_CHARACTERS, DEMO_MACROS } = await import('../../../db/demoData');
            const newCamp: Campaign = {
              id: `camp-${Date.now()}`,
              title,
              description: desc,
              scenes: DEMO_SCENES,
              characters: DEMO_CHARACTERS,
              macros: DEMO_MACROS,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await createCampaign(newCamp);
            const list = await getAllCampaigns();
            setCampaignList(list);
            setCampaign(newCamp);
            await setActiveCampaignId(newCamp.id);
            selectScene(newCamp.scenes[0]);
            setShowCampaignPickerModal(false);
          }}
          onDuplicateCampaign={handleDuplicateCampaign}
          onDeleteCampaign={(campId) => handleDeleteCampaign(campId, '')}
          onClose={() => setShowCampaignPickerModal(false)}
        />
      )}

      {/* MODAL: EDIT / CREATE SCENE */}
      {showNewSceneModal && (
        <SceneEditModal
          isOpen={showNewSceneModal}
          sceneToEdit={editingScene}
          onSave={async (sceneData) => {
            if (!sceneData.name || !sceneData.backgroundUrl || !campaign) return;
            const { updateCampaign } = await import('../../../db');
            if (editingScene) {
              const updatedScene: Scene = {
                ...editingScene,
                name: sceneData.name,
                backgroundUrl: sceneData.backgroundUrl,
                locationBanner: sceneData.locationBanner || sceneData.name,
                subtitle: sceneData.subtitle || '',
                weather: sceneData.weather || 'none',
                lighting: sceneData.lighting || 'normal',
                ambientAudioUrl: sceneData.ambientAudioUrl || '',
                ambientAudioName: sceneData.ambientAudioName || '',
                dmNotes: sceneData.dmNotes || '',
              };
              const updatedScenes = campaign.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
              const updatedCamp = { ...campaign, scenes: updatedScenes };
              await updateCampaign(updatedCamp);
              setCampaign(updatedCamp);
              if (activeDisplay.currentSceneId === updatedScene.id) {
                selectScene(updatedScene);
              }
            } else {
              const newScene: Scene = {
                id: `scene-${Date.now()}`,
                name: sceneData.name,
                backgroundUrl: sceneData.backgroundUrl,
                locationBanner: sceneData.locationBanner || sceneData.name,
                subtitle: sceneData.subtitle || '',
                weather: sceneData.weather || 'none',
                lighting: sceneData.lighting || 'normal',
                ambientAudioUrl: sceneData.ambientAudioUrl || '',
                ambientAudioName: sceneData.ambientAudioName || '',
                dmNotes: sceneData.dmNotes || '',
              };
              const updatedScenes = [...campaign.scenes, newScene];
              const updatedCamp = { ...campaign, scenes: updatedScenes };
              await updateCampaign(updatedCamp);
              setCampaign(updatedCamp);
            }
            setEditingScene(null);
          }}
          onClose={() => {
            setShowNewSceneModal(false);
            setEditingScene(null);
          }}
        />
      )}

      {/* MODAL: EDIT / CREATE CHARACTER */}
      {showNewCharModal && (
        <CharacterEditModal
          isOpen={showNewCharModal}
          charToEdit={editingChar}
          onSave={async (charData) => {
            if (!charData.name || !charData.defaultAvatarUrl || !campaign) return;
            const { updateCampaign } = await import('../../../db');
            if (editingChar) {
              const updatedChar: Character = {
                ...editingChar,
                name: charData.name,
                roleOrTitle: charData.roleOrTitle || 'Aventurero',
                defaultAvatarUrl: charData.defaultAvatarUrl,
                bio: charData.bio || '',
                maxHp: charData.maxHp || 30,
              };
              const updatedChars = campaign.characters.map((c) => (c.id === updatedChar.id ? updatedChar : c));
              const updatedCamp = { ...campaign, characters: updatedChars };
              await updateCampaign(updatedCamp);
              setCampaign(updatedCamp);
            } else {
              const newChar: Character = {
                id: `char-${Date.now()}`,
                name: charData.name,
                roleOrTitle: charData.roleOrTitle || 'Aventurero',
                defaultAvatarUrl: charData.defaultAvatarUrl,
                bio: charData.bio || '',
                maxHp: charData.maxHp || 30,
              };
              const updatedChars = [...campaign.characters, newChar];
              const updatedCamp = { ...campaign, characters: updatedChars };
              await updateCampaign(updatedCamp);
              setCampaign(updatedCamp);
            }
            setEditingChar(null);
          }}
          onClose={() => {
            setShowNewCharModal(false);
            setEditingChar(null);
          }}
        />
      )}

      {/* MODAL: SUMMON NPC */}
      {showSummonModal && (
        <SummonCharacterModal
          isOpen={showSummonModal}
          characters={campaign?.characters || []}
          onSummon={summonCharacter}
          onClose={() => setShowSummonModal(false)}
        />
      )}

      {/* MODAL: QR & CONNECTION */}
      {showQRModal && (
        <MasterQRModal
          isOpen={showQRModal}
          joinUrl={joinUrl}
          roomCode={roomCode || ''}
          latencyMs={latencyMs}
          onReconnect={() => connectToRoom(roomCode || '', pairingSecret)}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* MODAL: NETWORK DIAGNOSTICS & CHAOS */}
      {showDiagnosticsModal && (
        <NetworkDiagnosticsModal
          roomCode={roomCode || ''}
          connectionStatus={connectionStatus as any}
          latencyMs={latencyMs}
          liveState={liveState}
          onForceResync={() => {
            broadcastFullState(liveState);
            soundEngine.playSynth('magic_spell');
            alert('¡Estado completo (FULL_STATE) transmitido a la Tablet!');
          }}
          onClose={() => setShowDiagnosticsModal(false)}
        />
      )}
    </Suspense>
  );
};
