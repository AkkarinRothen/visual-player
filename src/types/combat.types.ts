
export type TacticalTeam = 'allies' | 'enemies' | 'neutral';

export interface TacticalGridConfig {
  enabled: boolean;
  type: 'square' | 'hex';
  columns: number;
  opacity: number;
}

export type CombatCondition =
  | 'poisoned'
  | 'stunned'
  | 'burning'
  | 'blinded'
  | 'paralyzed'
  | 'invisible'
  | 'concentrating'
  | 'blessed'
  | 'cursed'
  | 'frightened'
  | 'prone'
  | 'restrained'
  | 'charmed';

export interface ActiveCombatCondition {
  id: string;
  condition: CombatCondition;
  label: string;
  icon: string;
  color: string;
  description: string;
  isPublic: boolean;
  appliedAtRound?: number;
}

export interface Combatant {
  id: string;
  characterId?: string; // Explicit link to CharacterOnScreen/Character instance ID
  name: string;
  avatarUrl: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  showHpToPlayers: boolean;
  conditions: CombatCondition[];
  activeConditions?: ActiveCombatCondition[];
  isMonster: boolean;
  isWaveReinforcement?: boolean;
  triggerRound?: number;
  isDeployed?: boolean;
  isSecret?: boolean;
}

export type CombatTrackingMode = 'manual' | 'suggest' | 'auto';

export interface CombatState {
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  combatants: Combatant[];
  turnTimerSeconds?: number;
  isTimerRunning?: boolean;
  showTurnTimerToPlayers?: boolean;
  encounterName?: string;
  rewardsSummary?: string;
  trackingMode?: CombatTrackingMode;
  suggestedFocusCharacterId?: string | null;
  turnId?: string;
  turnTimerEndsAt?: number | null;
  turnTimerRemainingSeconds?: number;
  turnTimerTotalSeconds?: number;
  autoStartNextTurnTimer?: boolean;
  soundAlertOnExpire?: boolean;
}

export interface EncounterCombatant {
  id: string;
  name: string;
  avatarUrl: string;
  maxHp: number;
  currentHp: number;
  isMonster: boolean;
  showHpToPlayers: boolean;
  initiativeType: 'fixed' | 'roll_d20' | 'manual';
  fixedInitiative?: number;
  initiativeModifier?: number;
  initialConditions?: CombatCondition[];
  isWaveReinforcement?: boolean;
  triggerRound?: number;
}

export interface SavedEncounter {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  difficulty: 'facil' | 'medio' | 'dificil' | 'letal';
  combatants: EncounterCombatant[];
  dmNotes?: string;
  rewardsSummary?: string;
  turnTimerSeconds?: number;
  backgroundSceneId?: string;
}
