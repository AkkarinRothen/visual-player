import type { SoundboardBank, SoundboardCategory, SoundboardPad } from '../../types';

export const DEFAULT_SOUNDBOARD_PADS: SoundboardPad[] = [
  // ─── COMBATE ───
  {
    id: 'pad-sword',
    label: 'Espadazo',
    category: 'combat',
    sfxPreset: 'sword_clash',
    icon: 'Swords',
    color: 'amber',
    retriggerPolicy: 'restart',
  },
  {
    id: 'pad-fireball',
    label: 'Bola de Fuego',
    category: 'combat',
    sfxPreset: 'fireball',
    icon: 'Flame',
    color: 'orange',
    retriggerPolicy: 'restart',
  },
  {
    id: 'pad-magic',
    label: 'Hechizo Arcano',
    category: 'combat',
    sfxPreset: 'magic_spell',
    icon: 'Sparkles',
    color: 'purple',
    retriggerPolicy: 'restart',
  },

  // ─── AMBIENTE ───
  {
    id: 'pad-thunder',
    label: 'Trueno',
    category: 'ambient',
    sfxPreset: 'thunder',
    icon: 'Zap',
    color: 'yellow',
    retriggerPolicy: 'ignore',
  },
  {
    id: 'pad-door',
    label: 'Puerta Chirriante',
    category: 'ambient',
    sfxPreset: 'door_creak',
    icon: 'DoorClosed',
    color: 'stone',
    retriggerPolicy: 'ignore',
  },
  {
    id: 'pad-bell',
    label: 'Campana Fúnebre',
    category: 'ambient',
    sfxPreset: 'bell_toll',
    icon: 'Bell',
    color: 'slate',
    retriggerPolicy: 'restart',
  },

  // ─── CRIATURAS ───
  {
    id: 'pad-roar',
    label: 'Rugido Monstruoso',
    category: 'creature',
    sfxPreset: 'monster_roar',
    icon: 'Skull',
    color: 'red',
    retriggerPolicy: 'restart',
  },
  {
    id: 'pad-whisper',
    label: 'Susurros Oscuros',
    category: 'creature',
    sfxPreset: 'whisper',
    icon: 'Eye',
    color: 'violet',
    retriggerPolicy: 'ignore',
  },
  {
    id: 'pad-growl',
    label: 'Gruñido Siniestro',
    category: 'creature',
    sfxPreset: 'monster_roar',
    icon: 'Ghost',
    color: 'emerald',
    retriggerPolicy: 'restart',
  },

  // ─── NARRATIVA ───
  {
    id: 'pad-mystery',
    label: 'Misterio / Pista',
    category: 'narrative',
    sfxPreset: 'magic_spell',
    icon: 'Key',
    color: 'indigo',
    retriggerPolicy: 'restart',
  },
  {
    id: 'pad-danger',
    label: 'Peligro Inminente',
    category: 'narrative',
    sfxPreset: 'bell_toll',
    icon: 'AlertTriangle',
    color: 'rose',
    retriggerPolicy: 'restart',
  },
  {
    id: 'pad-victory',
    label: 'Victoria Heroica',
    category: 'narrative',
    sfxPreset: 'sword_clash',
    icon: 'Trophy',
    color: 'amber',
    retriggerPolicy: 'restart',
  },
];

export function getDefaultSoundboardBank(campaignName?: string): SoundboardBank {
  return {
    id: 'bank-default',
    name: campaignName ? `Efectos: ${campaignName}` : 'Batería de Efectos Rápida',
    pads: [...DEFAULT_SOUNDBOARD_PADS],
  };
}

export function filterPadsByCategory(
  pads: SoundboardPad[],
  category: SoundboardCategory | 'all'
): SoundboardPad[] {
  if (category === 'all') return pads;
  return pads.filter((p) => p.category === category);
}
