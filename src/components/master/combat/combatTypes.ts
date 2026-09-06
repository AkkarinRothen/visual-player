import type { CombatCondition } from '../../../types';

export const CONDITIONS_LIST: { id: CombatCondition; label: string; icon: string }[] = [
  { id: 'burning', label: 'En Llamas', icon: '🔥' },
  { id: 'poisoned', label: 'Envenenado', icon: '☠️' },
  { id: 'stunned', label: 'Aturdido', icon: '⚡' },
  { id: 'blinded', label: 'Ciego', icon: '👁️‍🗨️' },
  { id: 'paralyzed', label: 'Paralizado', icon: '🧊' },
  { id: 'invisible', label: 'Invisible', icon: '👻' },
  { id: 'concentrating', label: 'Concentración', icon: '🌀' },
  { id: 'blessed', label: 'Bendito', icon: '✨' },
  { id: 'cursed', label: 'Maldito', icon: '🩸' },
  { id: 'frightened', label: 'Asustado', icon: '😱' },
  { id: 'prone', label: 'Derribado', icon: '🛡️' },
  { id: 'restrained', label: 'Apresado', icon: '⛓️' },
  { id: 'charmed', label: 'Hechizado', icon: '💖' },
];

export interface VictorySummaryData {
  rounds: number;
  defeatedMonsters: string[];
  survivors: string[];
  rewards: string;
}

export interface NewCombatantFormData {
  name: string;
  avatarUrl: string;
  initiative: number;
  hp: number;
  isMonster: boolean;
}
