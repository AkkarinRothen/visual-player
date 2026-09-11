import type { SFXTrack } from '../../types';

// Built-in Synthesizer SFX list
export const BUILTIN_SFX: SFXTrack[] = [
  { id: 'sfx-thunder', name: 'Trueno / Tormenta', category: 'environment', icon: 'Zap', soundType: 'synthesized', synthPreset: 'thunder' },
  { id: 'sfx-sword', name: 'Choque de Espadas', category: 'combat', icon: 'ShieldAlert', soundType: 'synthesized', synthPreset: 'sword_clash' },
  { id: 'sfx-magic', name: 'Hechizo Mágico', category: 'magic', icon: 'Sparkles', soundType: 'synthesized', synthPreset: 'magic_spell' },
  { id: 'sfx-gong', name: 'Gong de Combate', category: 'combat', icon: 'Swords', soundType: 'synthesized', synthPreset: 'gong' },
  { id: 'sfx-roar', name: 'Rugido de Monstruo', category: 'combat', icon: 'Skull', soundType: 'synthesized', synthPreset: 'monster_roar' },
  { id: 'sfx-door', name: 'Puerta Chirriante', category: 'mystery', icon: 'DoorOpen', soundType: 'synthesized', synthPreset: 'door_creak' },
  { id: 'sfx-bell', name: 'Campana de Templo', category: 'social', icon: 'Bell', soundType: 'synthesized', synthPreset: 'church_bell' },
  { id: 'sfx-fanfare', name: 'Fanfarria de Victoria', category: 'social', icon: 'Trophy', soundType: 'synthesized', synthPreset: 'fanfare_victory' },
  { id: 'sfx-heartbeat', name: 'Latido / Tensión', category: 'mystery', icon: 'Heart', soundType: 'synthesized', synthPreset: 'heartbeat' },
];
