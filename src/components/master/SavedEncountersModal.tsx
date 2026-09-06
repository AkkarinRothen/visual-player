import React from 'react';
import type { SavedEncountersModalProps } from './encounters/savedEncountersTypes';
import { useSavedEncounters } from './encounters/useSavedEncounters';
import { EncounterHeader } from './encounters/EncounterHeader';
import { EncounterGrid } from './encounters/EncounterGrid';
import { EncounterLaunchDialog } from './encounters/EncounterLaunchDialog';
import { EncounterEditorModal } from './encounters/EncounterEditorModal';

export const SavedEncountersModal: React.FC<SavedEncountersModalProps> = (props) => {
  const { campaign, encounters, onClose } = props;

  const {
    showEditor,
    setShowEditor,
    editingEncounter,
    resolvingEncounter,
    setResolvingEncounter,
    resolutionMode,
    combatantsWithInitiative,
    encName,
    setEncName,
    encDesc,
    setEncDesc,
    encDifficulty,
    setEncDifficulty,
    encRewards,
    setEncRewards,
    encNotes,
    setEncNotes,
    encCombatants,
    openLaunchDialog,
    reRollAllInitiatives,
    updateInitiative,
    confirmLaunch,
    openCreateModal,
    openEditModal,
    handleSaveEncounterForm,
    addCombatantFromLibrary,
    addGenericMonster,
    updateCombatantInForm,
    removeCombatantFromForm,
    handleDeleteEncounter,
  } = useSavedEncounters(props);

  return (
    <div className="modal-overlay encounters-modal-overlay" onClick={onClose}>
      <div className="modal-content encounters-modal" onClick={(e) => e.stopPropagation()}>
        <EncounterHeader onClose={onClose} />

        <EncounterGrid
          encounters={encounters}
          onOpenCreate={openCreateModal}
          onLaunchLive={(enc) => openLaunchDialog(enc, 'live')}
          onLaunchStaging={(enc) => openLaunchDialog(enc, 'staging')}
          onEdit={openEditModal}
          onDelete={handleDeleteEncounter}
        />

        {resolvingEncounter && (
          <EncounterLaunchDialog
            resolvingEncounter={resolvingEncounter}
            resolutionMode={resolutionMode}
            combatantsWithInitiative={combatantsWithInitiative}
            onReRollAllInitiatives={reRollAllInitiatives}
            onUpdateInitiative={updateInitiative}
            onConfirmLaunch={confirmLaunch}
            onCloseDialog={() => setResolvingEncounter(null)}
          />
        )}

        {showEditor && (
          <EncounterEditorModal
            isEditing={!!editingEncounter}
            campaign={campaign}
            encName={encName}
            setEncName={setEncName}
            encDesc={encDesc}
            setEncDesc={setEncDesc}
            encDifficulty={encDifficulty}
            setEncDifficulty={setEncDifficulty}
            encRewards={encRewards}
            setEncRewards={setEncRewards}
            encNotes={encNotes}
            setEncNotes={setEncNotes}
            encCombatants={encCombatants}
            onAddGenericMonster={addGenericMonster}
            onAddCombatantFromLibrary={addCombatantFromLibrary}
            onUpdateCombatant={updateCombatantInForm}
            onRemoveCombatant={removeCombatantFromForm}
            onSubmit={handleSaveEncounterForm}
            onClose={() => setShowEditor(false)}
          />
        )}
      </div>
    </div>
  );
};
