import type { ActiveCombatCondition, CombatCondition, Combatant } from '../../types';

export interface ConditionMetadata {
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const COMBAT_CONDITIONS_CATALOG: Record<CombatCondition, ConditionMetadata> = {
  burning: {
    label: 'En Llamas',
    icon: '🔥',
    color: '#f97316',
    description: 'Sufre daño de fuego continuo al inicio de su turno.',
  },
  poisoned: {
    label: 'Envenenado',
    icon: '☠️',
    color: '#22c55e',
    description: 'Desventaja en tiradas de ataque y pruebas de característica.',
  },
  stunned: {
    label: 'Aturdido',
    icon: '⚡',
    color: '#eab308',
    description: 'Incapacitado, no puede moverse y falla salvaciones de Fuerza y Destreza.',
  },
  blinded: {
    label: 'Ciego',
    icon: '👁️‍🗨️',
    color: '#94a3b8',
    description: 'Falla pruebas que requieran vista; los ataques recibidos tienen ventaja.',
  },
  paralyzed: {
    label: 'Paralizado',
    icon: '🧊',
    color: '#06b6d4',
    description: 'Incapacitado y no puede hablar; ataques a quemarropa son críticos automáticos.',
  },
  invisible: {
    label: 'Invisible',
    icon: '👻',
    color: '#a855f7',
    description: 'Imposible de ver sin sentidos especiales; ventaja al atacar y desventaja al ser atacado.',
  },
  concentrating: {
    label: 'Concentración',
    icon: '🌀',
    color: '#3b82f6',
    description: 'Manteniendo un conjuro activo; debe superar tirada de salvación al recibir daño.',
  },
  blessed: {
    label: 'Bendito',
    icon: '✨',
    color: '#fbbf24',
    description: 'Suma +1d4 a tiradas de ataque y tiradas de salvación.',
  },
  cursed: {
    label: 'Maldito',
    icon: '🩸',
    color: '#ef4444',
    description: 'Afligido por un maleficio arcano o penalizadores mágicos.',
  },
  frightened: {
    label: 'Asustado',
    icon: '😱',
    color: '#f43f5e',
    description: 'Desventaja en tiradas mientras la fuente del miedo esté en línea de visión.',
  },
  prone: {
    label: 'Derribado',
    icon: '🛡️',
    color: '#d97706',
    description: 'En el suelo; levantarse cuesta la mitad del movimiento. Ataques cuerpo a cuerpo tienen ventaja.',
  },
  restrained: {
    label: 'Apresado',
    icon: '⛓️',
    color: '#64748b',
    description: 'Velocidad reducida a 0; desventaja en ataques propios y ventaja para los atacantes.',
  },
  charmed: {
    label: 'Hechizado',
    icon: '💖',
    color: '#ec4899',
    description: 'No puede atacar a quien lo hechizó; el inductor posee ventaja en pruebas sociales.',
  },
};

/**
 * Creates an ActiveCombatCondition instance using canonical catalog metadata.
 */
export function createActiveCondition(
  condition: CombatCondition,
  isPublic: boolean = true,
  round?: number
): ActiveCombatCondition {
  const meta = COMBAT_CONDITIONS_CATALOG[condition] || {
    label: condition,
    icon: '•',
    color: '#cbd5e1',
    description: 'Estado activo en combate.',
  };

  return {
    id: `cond-${condition}-${Date.now()}`,
    condition,
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    description: meta.description,
    isPublic,
    appliedAtRound: round,
  };
}

/**
 * Extracts ONLY public authorized conditions for a combatant.
 * Secret / private conditions are completely stripped from Table display payloads.
 */
export function filterPublicConditions(combatant: Combatant): ActiveCombatCondition[] {
  if (combatant.activeConditions && combatant.activeConditions.length > 0) {
    return combatant.activeConditions.filter((c) => c.isPublic !== false);
  }

  // Fallback to legacy string conditions (assumed public by default)
  if (combatant.conditions && combatant.conditions.length > 0) {
    return combatant.conditions.map((cond) => createActiveCondition(cond, true));
  }

  return [];
}

/**
 * Idempotently adds a condition to a combatant, maintaining both arrays in sync.
 */
export function addConditionToCombatant(
  combatant: Combatant,
  condition: CombatCondition,
  isPublic: boolean = true,
  round?: number
): Combatant {
  const active = combatant.activeConditions || [];
  if (active.some((c) => c.condition === condition)) {
    return combatant; // Already active, idempotent
  }

  const newCondition = createActiveCondition(condition, isPublic, round);
  const nextActive = [...active, newCondition];
  const nextConditions = Array.from(new Set([...combatant.conditions, condition]));

  return {
    ...combatant,
    conditions: nextConditions,
    activeConditions: nextActive,
  };
}

/**
 * Removes a condition by type from a combatant.
 */
export function removeConditionFromCombatant(
  combatant: Combatant,
  condition: CombatCondition
): Combatant {
  const nextConditions = combatant.conditions.filter((c) => c !== condition);
  const nextActive = (combatant.activeConditions || []).filter((c) => c.condition !== condition);

  return {
    ...combatant,
    conditions: nextConditions,
    activeConditions: nextActive,
  };
}
