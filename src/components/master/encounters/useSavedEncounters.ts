import { useState } from 'react';
import type { Campaign, SavedEncounter, EncounterCombatant, Combatant } from '../../../types';

interface UseSavedEncountersProps {
  campaign: Campaign | null;
  isCombatActive: boolean;
  onLaunchEncounterLive: (encounter: SavedEncounter, combatants: Combatant[]) => void;
  onLoadEncounterToStaging: (encounter: SavedEncounter, combatants: Combatant[]) => void;
  onSaveEncounter: (encounter: SavedEncounter) => void;
  onDeleteEncounter: (id: string) => void;
  onClose: () => void;
}

export function useSavedEncounters({
  campaign,
  isCombatActive,
  onLaunchEncounterLive,
  onLoadEncounterToStaging,
  onSaveEncounter,
  onDeleteEncounter,
  onClose,
}: UseSavedEncountersProps) {
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingEncounter, setEditingEncounter] = useState<SavedEncounter | null>(null);

  // Quick Launch initiative resolution dialog
  const [resolvingEncounter, setResolvingEncounter] = useState<SavedEncounter | null>(null);
  const [resolutionMode, setResolutionMode] = useState<'live' | 'staging'>('live');
  const [combatantsWithInitiative, setCombatantsWithInitiative] = useState<Combatant[]>([]);

  // Editor form state
  const [encName, setEncName] = useState<string>('');
  const [encDesc, setEncDesc] = useState<string>('');
  const [encDifficulty, setEncDifficulty] = useState<'facil' | 'medio' | 'dificil' | 'letal'>('medio');
  const [encRewards, setEncRewards] = useState<string>('');
  const [encNotes, setEncNotes] = useState<string>('');
  const [encCombatants, setEncCombatants] = useState<EncounterCombatant[]>([]);

  // Open Quick Launch Dialog
  const openLaunchDialog = (enc: SavedEncounter, mode: 'live' | 'staging') => {
    setResolvingEncounter(enc);
    setResolutionMode(mode);

    // Roll or calculate initiative for all combatants
    const instantiated: Combatant[] = enc.combatants.map((c) => {
      let init = c.fixedInitiative ?? 10;
      if (c.initiativeType === 'roll_d20') {
        const roll = Math.floor(Math.random() * 20) + 1;
        init = roll + (c.initiativeModifier ?? 0);
      }

      return {
        id: `cbt-${c.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: c.name,
        avatarUrl: c.avatarUrl,
        initiative: init,
        currentHp: c.maxHp,
        maxHp: c.maxHp,
        showHpToPlayers: c.showHpToPlayers,
        conditions: c.initialConditions || [],
        isMonster: c.isMonster,
        isWaveReinforcement: c.isWaveReinforcement,
        triggerRound: c.triggerRound,
        isDeployed: !c.isWaveReinforcement, // Wave reinforcements start undeployed
      };
    });

    // Sort by initiative descending
    instantiated.sort((a, b) => b.initiative - a.initiative);
    setCombatantsWithInitiative(instantiated);
  };

  const reRollAllInitiatives = () => {
    if (!resolvingEncounter) return;
    const next = combatantsWithInitiative.map((c, idx) => {
      const template = resolvingEncounter.combatants[idx] || resolvingEncounter.combatants[0];
      const roll = Math.floor(Math.random() * 20) + 1;
      const mod = template.initiativeModifier || 0;
      return { ...c, initiative: roll + mod };
    });
    next.sort((a, b) => b.initiative - a.initiative);
    setCombatantsWithInitiative(next);
  };

  const updateInitiative = (idx: number, value: number) => {
    const next = [...combatantsWithInitiative];
    next[idx].initiative = value;
    next.sort((a, b) => b.initiative - a.initiative);
    setCombatantsWithInitiative(next);
  };

  const confirmLaunch = () => {
    if (!resolvingEncounter) return;

    if (resolutionMode === 'live') {
      if (
        isCombatActive &&
        !window.confirm('⚠️ Ya hay un combate en curso. ¿Deseas reemplazarlo con este nuevo encuentro?')
      ) {
        return;
      }
      onLaunchEncounterLive(resolvingEncounter, combatantsWithInitiative);
    } else {
      onLoadEncounterToStaging(resolvingEncounter, combatantsWithInitiative);
    }

    setResolvingEncounter(null);
    onClose();
  };

  // Editor Actions
  const openCreateModal = () => {
    setEditingEncounter(null);
    setEncName('');
    setEncDesc('');
    setEncDifficulty('medio');
    setEncRewards('350 XP, 50 PO');
    setEncNotes('');
    setEncCombatants([
      {
        id: `cbt-${Date.now()}-1`,
        name: 'Monstruo Hostil',
        avatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
        maxHp: 30,
        currentHp: 30,
        isMonster: true,
        showHpToPlayers: false,
        initiativeType: 'roll_d20',
        initiativeModifier: 2,
      },
    ]);
    setShowEditor(true);
  };

  const openEditModal = (enc: SavedEncounter) => {
    setEditingEncounter(enc);
    setEncName(enc.name);
    setEncDesc(enc.description);
    setEncDifficulty(enc.difficulty);
    setEncRewards(enc.rewardsSummary || '');
    setEncNotes(enc.dmNotes || '');
    setEncCombatants(enc.combatants);
    setShowEditor(true);
  };

  const handleSaveEncounterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!encName.trim() || encCombatants.length === 0 || !campaign) return;

    const saved: SavedEncounter = {
      id: editingEncounter ? editingEncounter.id : `enc-${Date.now()}`,
      campaignId: campaign.id,
      name: encName,
      description: encDesc,
      difficulty: encDifficulty,
      rewardsSummary: encRewards,
      dmNotes: encNotes,
      combatants: encCombatants,
      turnTimerSeconds: 60,
    };

    onSaveEncounter(saved);
    setShowEditor(false);
  };

  const addCombatantFromLibrary = (char: { name: string; defaultAvatarUrl: string; maxHp?: number }) => {
    const newCbt: EncounterCombatant = {
      id: `cbt-${Date.now()}-${encCombatants.length + 1}`,
      name: char.name,
      avatarUrl: char.defaultAvatarUrl,
      maxHp: char.maxHp || 30,
      currentHp: char.maxHp || 30,
      isMonster: false,
      showHpToPlayers: true,
      initiativeType: 'roll_d20',
      initiativeModifier: 2,
    };
    setEncCombatants([...encCombatants, newCbt]);
  };

  const addGenericMonster = () => {
    const newMonster: EncounterCombatant = {
      id: `cbt-mob-${Date.now()}-${encCombatants.length + 1}`,
      name: `Enemigo ${encCombatants.length + 1}`,
      avatarUrl: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=600&auto=format&fit=crop&q=80',
      maxHp: 25,
      currentHp: 25,
      isMonster: true,
      showHpToPlayers: false,
      initiativeType: 'roll_d20',
      initiativeModifier: 1,
    };
    setEncCombatants([...encCombatants, newMonster]);
  };

  const updateCombatantInForm = (idx: number, updated: Partial<EncounterCombatant>) => {
    const next = [...encCombatants];
    next[idx] = { ...next[idx], ...updated };
    setEncCombatants(next);
  };

  const removeCombatantFromForm = (idx: number) => {
    if (encCombatants.length <= 1) return;
    setEncCombatants(encCombatants.filter((_, i) => i !== idx));
  };

  const handleDeleteEncounter = (id: string, name: string) => {
    if (window.confirm(`¿Eliminar el encuentro "${name}"?`)) {
      onDeleteEncounter(id);
    }
  };

  return {
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
  };
}
