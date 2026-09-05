import React from 'react';
import type {
  CharacterOnScreen,
  Character,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
  CameraTransform,
} from '../../../types';
import type { StageUnifiedItem, OcclusionFormState } from './directorTypes';
import {
  CalibrateAnchorModal,
  PrepareEntryModal,
  SaveCameraPresetModal,
  RelativeLayerModal,
  ViewLayersModal,
  SaveWaypointModal,
  MoveToWaypointModal,
  CreateOcclusionModal,
  SaveFormationModal,
} from './modals';

export interface DirectorModalsProps {
  characters: CharacterOnScreen[];
  campaignCharacters?: Character[];
  unifiedStageItems: StageUnifiedItem[];
  waypoints: StageWaypoint[];
  selectedIds: Set<string>;
  primarySelectedChar: CharacterOnScreen | null;

  // Anchor calibration modal
  calibratingAnchorCharId: string | null;
  setCalibratingAnchorCharId: (id: string | null) => void;
  calibratingOffsetValue: number;
  setCalibratingOffsetValue: React.Dispatch<React.SetStateAction<number>>;

  // Entry prep modal
  preparingEntryCharId: string | null;
  setPreparingEntryCharId: (id: string | null) => void;
  preparingTransition: 'fade' | 'slide-bottom' | 'slide-left' | 'slide-right';
  setPreparingTransition: (t: 'fade' | 'slide-bottom' | 'slide-left' | 'slide-right') => void;

  // Save preset modal
  savingPresetModalOpen: boolean;
  setSavingPresetModalOpen: (open: boolean) => void;
  presetNameInput: string;
  setPresetNameInput: (name: string) => void;

  // Relative layer modal
  relativeLayerModalOpen: 'front_of' | 'behind' | null;
  setRelativeLayerModalOpen: (val: 'front_of' | 'behind' | null) => void;

  // View layers modal
  viewLayersModalOpen: boolean;
  setViewLayersModalOpen: (open: boolean) => void;

  // Save waypoint modal
  savingWaypointModalOpen: boolean;
  setSavingWaypointModalOpen: (open: boolean) => void;
  waypointNameInput: string;
  setWaypointNameInput: (name: string) => void;

  // Move to waypoint modal
  movingToWaypointModalOpen: boolean;
  setMovingToWaypointModalOpen: (open: boolean) => void;

  // Create occlusion modal
  creatingOcclusionModalOpen: boolean;
  setCreatingOcclusionModalOpen: (open: boolean) => void;
  occlusionForm: OcclusionFormState;
  setOcclusionForm: React.Dispatch<React.SetStateAction<OcclusionFormState>>;

  // Save formation modal
  savingFormationModalOpen?: boolean;
  setSavingFormationModalOpen?: (open: boolean) => void;
  formationNameInput?: string;
  setFormationNameInput?: (name: string) => void;
  onSaveCurrentFormation?: () => void;

  // Action callbacks
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => void;
  onSaveWaypoint?: (waypoint: Omit<StageWaypoint, 'id'>) => void;
  onSaveOcclusionRegion?: (region: Omit<SceneOcclusionRegion, 'id'>) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateProp?: (propId: string, updates: Partial<SceneProp>, description: string) => void;
  onReorderLayers?: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => void;
  onUpdateCampaignCharacter?: (characterId: string, updates: Partial<Character>) => void;
  reorderRelativeTo: (subjectId: string, targetId: string, placement: 'front_of' | 'behind') => void;
}

export const DirectorModals: React.FC<DirectorModalsProps> = ({
  characters,
  campaignCharacters = [],
  unifiedStageItems,
  waypoints,
  selectedIds,
  primarySelectedChar,
  calibratingAnchorCharId,
  setCalibratingAnchorCharId,
  calibratingOffsetValue,
  setCalibratingOffsetValue,
  preparingEntryCharId,
  setPreparingEntryCharId,
  preparingTransition,
  setPreparingTransition,
  savingPresetModalOpen,
  setSavingPresetModalOpen,
  presetNameInput,
  setPresetNameInput,
  relativeLayerModalOpen,
  setRelativeLayerModalOpen,
  viewLayersModalOpen,
  setViewLayersModalOpen,
  savingWaypointModalOpen,
  setSavingWaypointModalOpen,
  waypointNameInput,
  setWaypointNameInput,
  movingToWaypointModalOpen,
  setMovingToWaypointModalOpen,
  creatingOcclusionModalOpen,
  setCreatingOcclusionModalOpen,
  occlusionForm,
  setOcclusionForm,
  savingFormationModalOpen = false,
  setSavingFormationModalOpen,
  formationNameInput = '',
  setFormationNameInput,
  onSaveCurrentFormation,
  onSaveCameraPreset,
  onSaveWaypoint,
  onSaveOcclusionRegion,
  onUpdateCharacter,
  onUpdateProp,
  onReorderLayers,
  onUpdateCampaignCharacter,
  reorderRelativeTo,
}) => {
  const calibratingChar = calibratingAnchorCharId
    ? characters.find((c) => c.id === calibratingAnchorCharId) || null
    : null;

  const preparingChar = preparingEntryCharId
    ? characters.find((c) => c.id === preparingEntryCharId) || null
    : null;

  return (
    <>
      <CalibrateAnchorModal
        char={calibratingChar}
        campaignCharacters={campaignCharacters}
        calibratingOffsetValue={calibratingOffsetValue}
        setCalibratingOffsetValue={setCalibratingOffsetValue}
        onClose={() => setCalibratingAnchorCharId(null)}
        onUpdateCharacter={onUpdateCharacter}
        onUpdateCampaignCharacter={onUpdateCampaignCharacter}
      />

      <PrepareEntryModal
        char={preparingChar}
        preparingTransition={preparingTransition}
        setPreparingTransition={setPreparingTransition}
        onClose={() => setPreparingEntryCharId(null)}
        onUpdateCharacter={onUpdateCharacter}
      />

      <SaveCameraPresetModal
        isOpen={savingPresetModalOpen}
        presetNameInput={presetNameInput}
        setPresetNameInput={setPresetNameInput}
        primarySelectedChar={primarySelectedChar}
        onSaveCameraPreset={onSaveCameraPreset}
        onClose={() => {
          setSavingPresetModalOpen(false);
          setPresetNameInput('');
        }}
      />

      <RelativeLayerModal
        relativeLayerModalOpen={relativeLayerModalOpen}
        primarySelectedChar={primarySelectedChar}
        unifiedStageItems={unifiedStageItems}
        reorderRelativeTo={reorderRelativeTo}
        onClose={() => setRelativeLayerModalOpen(null)}
      />

      <ViewLayersModal
        isOpen={viewLayersModalOpen}
        unifiedStageItems={unifiedStageItems}
        selectedIds={selectedIds}
        onClose={() => setViewLayersModalOpen(false)}
        onOpenCreateOcclusion={() => {
          setViewLayersModalOpen(false);
          setCreatingOcclusionModalOpen(true);
        }}
        onReorderLayers={onReorderLayers}
        onUpdateCharacter={onUpdateCharacter}
        onUpdateProp={onUpdateProp}
      />

      <SaveWaypointModal
        isOpen={savingWaypointModalOpen}
        primarySelectedChar={primarySelectedChar}
        waypointNameInput={waypointNameInput}
        setWaypointNameInput={setWaypointNameInput}
        onSaveWaypoint={onSaveWaypoint}
        onClose={() => setSavingWaypointModalOpen(false)}
      />

      <MoveToWaypointModal
        isOpen={movingToWaypointModalOpen}
        primarySelectedChar={primarySelectedChar}
        characters={characters}
        waypoints={waypoints}
        onClose={() => setMovingToWaypointModalOpen(false)}
        onUpdateCharacter={onUpdateCharacter}
      />

      <CreateOcclusionModal
        isOpen={creatingOcclusionModalOpen}
        occlusionForm={occlusionForm}
        setOcclusionForm={setOcclusionForm}
        onSaveOcclusionRegion={onSaveOcclusionRegion}
        onClose={() => setCreatingOcclusionModalOpen(false)}
      />

      <SaveFormationModal
        isOpen={savingFormationModalOpen}
        selectedCount={selectedIds.size}
        formationNameInput={formationNameInput}
        setFormationNameInput={setFormationNameInput}
        onSaveCurrentFormation={onSaveCurrentFormation}
        onClose={() => setSavingFormationModalOpen?.(false)}
      />
    </>
  );
};

export * from './modals';
