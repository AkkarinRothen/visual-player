import React from 'react';
import '../../../styles/scenePresetModal.css';
import type { ScenePresetModalProps } from './scenePreset/scenePresetTypes';
import { useScenePreset } from './scenePreset/useScenePreset';
import { ScenePresetHeader } from './scenePreset/ScenePresetHeader';
import { ScenePresetSaveView } from './scenePreset/ScenePresetSaveView';
import { ScenePresetListColumn } from './scenePreset/ScenePresetListColumn';
import { ScenePresetDetailColumn } from './scenePreset/ScenePresetDetailColumn';
import { ScenePresetFooter } from './scenePreset/ScenePresetFooter';

export const ScenePresetModal: React.FC<ScenePresetModalProps> = (props) => {
  const { isOpen, mode, stagedState, onClose } = props;

  const {
    presetName,
    setPresetName,
    description,
    setDescription,
    tagsInput,
    setTagsInput,
    selectedConvId,
    setSelectedConvId,
    isSaving,
    saveSuccess,
    searchQuery,
    setSearchQuery,
    selectedPresetId,
    selectedPreset,
    filteredPresets,
    dependencyReport,
    charResolutions,
    setCharResolutions,
    convResolution,
    setConvResolution,
    isScanning,
    isInstantiating,
    confirmReplaceStaged,
    setConfirmReplaceStaged,
    allAvailableConversations,
    selectPresetForInspection,
    handleSave,
    handleInstantiate,
  } = useScenePreset(props);

  if (!isOpen) return null;

  return (
    <div className="scene-preset-overlay" onClick={onClose}>
      <div className="scene-preset-modal" onClick={(e) => e.stopPropagation()}>
        <ScenePresetHeader mode={mode} onClose={onClose} />

        {/* Modal Body */}
        <div className="scene-preset-body">
          {mode === 'save' ? (
            <ScenePresetSaveView
              stagedState={stagedState}
              presetName={presetName}
              setPresetName={setPresetName}
              description={description}
              setDescription={setDescription}
              tagsInput={tagsInput}
              setTagsInput={setTagsInput}
              selectedConvId={selectedConvId}
              setSelectedConvId={setSelectedConvId}
              allAvailableConversations={allAvailableConversations}
            />
          ) : (
            <div className="preset-browser-layout">
              <ScenePresetListColumn
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredPresets={filteredPresets}
                selectedPresetId={selectedPresetId}
                onSelectPreset={selectPresetForInspection}
              />
              <ScenePresetDetailColumn
                selectedPreset={selectedPreset}
                isScanning={isScanning}
                dependencyReport={dependencyReport}
                charResolutions={charResolutions}
                setCharResolutions={setCharResolutions}
                convResolution={convResolution}
                setConvResolution={setConvResolution}
                confirmReplaceStaged={confirmReplaceStaged}
                setConfirmReplaceStaged={setConfirmReplaceStaged}
                isInstantiating={isInstantiating}
                onInstantiate={handleInstantiate}
              />
            </div>
          )}
        </div>

        <ScenePresetFooter
          mode={mode}
          onClose={onClose}
          isSaving={isSaving}
          saveSuccess={saveSuccess}
          presetName={presetName}
          onSave={handleSave}
          selectedPreset={selectedPreset}
          confirmReplaceStaged={confirmReplaceStaged}
          setConfirmReplaceStaged={setConfirmReplaceStaged}
          isInstantiating={isInstantiating}
          onInstantiate={handleInstantiate}
        />
      </div>
    </div>
  );
};
