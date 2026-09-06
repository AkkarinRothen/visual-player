import type { Campaign, SavedEncounter, EncounterCombatant, Combatant } from '../../../types';

export interface SavedEncountersModalProps {
  campaign: Campaign | null;
  encounters: SavedEncounter[];
  isCombatActive: boolean;
  onLaunchEncounterLive: (encounter: SavedEncounter, combatants: Combatant[]) => void;
  onLoadEncounterToStaging: (encounter: SavedEncounter, combatants: Combatant[]) => void;
  onSaveEncounter: (encounter: SavedEncounter) => void;
  onDeleteEncounter: (id: string) => void;
  onClose: () => void;
}

export interface EncounterCardProps {
  encounter: SavedEncounter;
  onLaunchLive: (encounter: SavedEncounter) => void;
  onLaunchStaging: (encounter: SavedEncounter) => void;
  onEdit: (encounter: SavedEncounter) => void;
  onDelete: (id: string, name: string) => void;
}

export interface EncounterGridProps {
  encounters: SavedEncounter[];
  onOpenCreate: () => void;
  onLaunchLive: (encounter: SavedEncounter) => void;
  onLaunchStaging: (encounter: SavedEncounter) => void;
  onEdit: (encounter: SavedEncounter) => void;
  onDelete: (id: string, name: string) => void;
}

export interface EncounterLaunchDialogProps {
  resolvingEncounter: SavedEncounter;
  resolutionMode: 'live' | 'staging';
  combatantsWithInitiative: Combatant[];
  onReRollAllInitiatives: () => void;
  onUpdateInitiative: (index: number, value: number) => void;
  onConfirmLaunch: () => void;
  onCloseDialog: () => void;
}

export interface EncounterEditorModalProps {
  isEditing: boolean;
  campaign: Campaign | null;
  encName: string;
  setEncName: (name: string) => void;
  encDesc: string;
  setEncDesc: (desc: string) => void;
  encDifficulty: 'facil' | 'medio' | 'dificil' | 'letal';
  setEncDifficulty: (diff: 'facil' | 'medio' | 'dificil' | 'letal') => void;
  encRewards: string;
  setEncRewards: (rewards: string) => void;
  encNotes: string;
  setEncNotes: (notes: string) => void;
  encCombatants: EncounterCombatant[];
  onAddGenericMonster: () => void;
  onAddCombatantFromLibrary: (char: { name: string; defaultAvatarUrl: string; maxHp?: number }) => void;
  onUpdateCombatant: (index: number, updated: Partial<EncounterCombatant>) => void;
  onRemoveCombatant: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}
