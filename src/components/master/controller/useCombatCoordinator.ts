import type {
  CombatState,
  CameraTransform,
  CombatTrackingMode,
  DuckingPreset,
  DisplayState,
  CombatCondition,
} from '../../../types';
import { soundEngine, DUCKING_PRESETS } from '../../../services/soundEngine';
import {
  advanceCombatTurnWithTimer,
  startCombatTurnTimer,
  pauseCombatTurnTimer,
  addSecondsToCombatTurnTimer,
  resetCombatTurnTimer,
} from '../../../domain/combat/combatTimerCoordinator';
import {
  addConditionToCombatant,
  removeConditionFromCombatant,
} from '../../../domain/combat/combatConditionsCatalog';

export interface UseCombatCoordinatorOptions {
  liveState: DisplayState;
  updateDisplay: (
    updater: (prev: DisplayState) => DisplayState,
    description: string,
    syncImmediate?: boolean
  ) => void;
  handleSetCameraTransform: (camera: CameraTransform, durationMs?: number) => Promise<void>;
}

export function useCombatCoordinator({
  liveState,
  updateDisplay,
  handleSetCameraTransform,
}: UseCombatCoordinatorOptions) {
  const handleNextCombatTurn = () => {
    const cs = liveState.combatState;
    if (!cs?.isActive || cs.combatants.length === 0) return;
    soundEngine.playSynth('gong');
    const deployed = cs.combatants.filter((c) => c.isDeployed !== false);
    const nextIndex = cs.currentTurnIndex + 1;
    const isNewRound = nextIndex >= deployed.length;
    const newTurnIndex = isNewRound ? 0 : nextIndex;
    const newRound = isNewRound ? cs.round + 1 : cs.round;
    const activeCombatant = deployed[newTurnIndex];
    const targetChar = activeCombatant
      ? liveState.characters.find((c) => c.id === activeCombatant.characterId || c.id === activeCombatant.id)
      : null;

    const baseUpdated = advanceCombatTurnWithTimer(cs, newTurnIndex, newRound);
    const updatedCombat: CombatState = {
      ...baseUpdated,
      suggestedFocusCharacterId: targetChar ? targetChar.id : null,
    };

    let newCamera = liveState.camera;
    if (cs.trackingMode === 'auto' && targetChar) {
      newCamera = {
        focalPoint: {
          x: targetChar.normalizedX ?? 50,
          y: targetChar.normalizedY ?? 50,
        },
        zoom: 1.35,
      };
    }

    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat, camera: newCamera || prev.camera }),
      `Avanzado Turno: Ronda ${updatedCombat.round}`
    );
  };

  const handlePrevCombatTurn = () => {
    const cs = liveState.combatState;
    if (!cs?.isActive || cs.combatants.length === 0) return;
    const deployed = cs.combatants.filter((c) => c.isDeployed !== false);
    const prevIndex = cs.currentTurnIndex - 1;
    let newTurnIndex = prevIndex;
    let newRound = cs.round;

    if (prevIndex < 0) {
      if (cs.round > 1) {
        newRound = cs.round - 1;
        newTurnIndex = Math.max(0, deployed.length - 1);
      } else {
        newTurnIndex = 0;
      }
    }

    const activeCombatant = deployed[newTurnIndex];
    const targetChar = activeCombatant
      ? liveState.characters.find((c) => c.id === activeCombatant.characterId || c.id === activeCombatant.id)
      : null;

    const baseUpdated = advanceCombatTurnWithTimer(cs, newTurnIndex, newRound);
    const updatedCombat: CombatState = {
      ...baseUpdated,
      suggestedFocusCharacterId: targetChar ? targetChar.id : null,
    };

    let newCamera = liveState.camera;
    if (cs.trackingMode === 'auto' && targetChar) {
      newCamera = {
        focalPoint: {
          x: targetChar.normalizedX ?? 50,
          y: targetChar.normalizedY ?? 50,
        },
        zoom: 1.35,
      };
    }

    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat, camera: newCamera || prev.camera }),
      `Retrocedido Turno: Ronda ${updatedCombat.round}`
    );
  };

  const handleToggleCombatTimer = () => {
    const cs = liveState.combatState;
    if (!cs?.isActive) return;
    const updated = cs.isTimerRunning ? pauseCombatTurnTimer(cs) : startCombatTurnTimer(cs);
    updateDisplay((prev) => ({ ...prev, combatState: updated }), 'Temporizador de Combate');
  };

  const handleAddCombatTimerSeconds = (seconds: number = 30) => {
    const cs = liveState.combatState;
    if (!cs?.isActive) return;
    const updated = addSecondsToCombatTurnTimer(cs, seconds);
    updateDisplay((prev) => ({ ...prev, combatState: updated }), `Añadir +${seconds}s al Turno`);
  };

  const handleResetCombatTimer = () => {
    const cs = liveState.combatState;
    if (!cs?.isActive) return;
    const updated = resetCombatTurnTimer(cs);
    updateDisplay((prev) => ({ ...prev, combatState: updated }), 'Reiniciar Temporizador');
  };

  const handleToggleCombatTimerVisibility = () => {
    const cs = liveState.combatState;
    if (!cs?.isActive) return;
    const next = cs.showTurnTimerToPlayers === false ? true : false;
    const updated: CombatState = { ...cs, showTurnTimerToPlayers: next };
    updateDisplay((prev) => ({ ...prev, combatState: updated }), 'Visibilidad del Reloj en Mesa');
  };

  const handleFocusCombatant = async (characterId: string) => {
    const targetChar = liveState.characters.find(
      (c) => c.id === characterId || (c as any).characterId === characterId
    );
    if (!targetChar) return;

    const posX = targetChar.normalizedX ?? 50;
    const posY = targetChar.normalizedY ?? 50;
    const newCamera: CameraTransform = {
      focalPoint: { x: posX, y: posY },
      zoom: 1.35,
    };
    await handleSetCameraTransform(newCamera);
  };

  const handleToggleCombatTrackingMode = async (mode: CombatTrackingMode) => {
    const updatedCombat: CombatState = {
      ...liveState.combatState,
      trackingMode: mode,
    };
    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat }),
      `Seguimiento de Combate: ${mode}`,
      true
    );
  };

  const handleToggleDmSpeakingDucked = () => {
    const nextDucked = !liveState.isDmSpeakingDucked;
    if (nextDucked) {
      soundEngine.acquireDucking('dm_speaking', liveState.duckingProfile);
    } else {
      soundEngine.releaseDucking('dm_speaking');
    }
    updateDisplay(
      (prev) => ({ ...prev, isDmSpeakingDucked: nextDucked }),
      nextDucked ? 'Voz DM Activada (Audio Atenuado)' : 'Voz DM Finalizada (Audio Normal)',
      true
    );
  };

  const handleSelectDuckingPreset = (preset: DuckingPreset) => {
    const profile = DUCKING_PRESETS[preset];
    soundEngine.setDuckingProfile(profile);
    updateDisplay(
      (prev) => ({ ...prev, duckingProfile: profile }),
      `Perfil de Atenuación: ${preset}`,
      true
    );
  };

  const handleUpdateCombatantHp = (combatantId: string, newHp: number) => {
    const cs = liveState.combatState;
    if (!cs) return;
    const target = cs.combatants.find((c) => c.id === combatantId);
    if (!target) return;
    const clamped = Math.max(0, Math.min(target.maxHp, newHp));
    if (clamped === 0 && target.currentHp > 0) {
      soundEngine.playSynth('sword_clash');
    }
    const updatedCombatants = cs.combatants.map((c) =>
      c.id === combatantId ? { ...c, currentHp: clamped } : c
    );
    const updatedCombat: CombatState = {
      ...cs,
      combatants: updatedCombatants,
    };
    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat }),
      `HP de ${target.name}: ${clamped}/${target.maxHp}`
    );
  };

  const handleToggleCombatantCondition = (combatantId: string, condition: string) => {
    const cs = liveState.combatState;
    if (!cs) return;
    const target = cs.combatants.find((c) => c.id === combatantId);
    if (!target) return;
    const cond = condition as CombatCondition;
    const updatedCombatants = cs.combatants.map((c) => {
      if (c.id === combatantId) {
        const exists = c.conditions.includes(cond);
        if (exists) {
          return removeConditionFromCombatant(c, cond);
        } else {
          return addConditionToCombatant(c, cond, true, cs.round);
        }
      }
      return c;
    });
    const updatedCombat: CombatState = {
      ...cs,
      combatants: updatedCombatants,
    };
    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat }),
      `Condición alterada: ${condition}`
    );
  };

  const handleStartCombat = () => {
    const cs = liveState.combatState;
    let combatants = cs?.combatants || [];
    if (combatants.length === 0 && liveState.characters.length > 0) {
      combatants = liveState.characters.map((ch, idx) => ({
        id: `comb-${ch.id}-${Date.now() + idx}`,
        characterId: ch.id,
        name: ch.name,
        avatarUrl: ch.avatarUrl,
        initiative: Math.floor(Math.random() * 20) + 1,
        currentHp: 45,
        maxHp: 45,
        showHpToPlayers: false,
        conditions: [],
        isMonster: false,
        isDeployed: true,
      })).sort((a, b) => b.initiative - a.initiative);
    }
    soundEngine.playSynth('heartbeat');
    const updatedCombat: CombatState = {
      ...cs,
      isActive: true,
      round: 1,
      currentTurnIndex: 0,
      combatants,
      turnTimerRemainingSeconds: 60,
      isTimerRunning: false,
      showTurnTimerToPlayers: cs?.showTurnTimerToPlayers !== false,
    };
    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat }),
      'Inicio de Combate'
    );
  };

  const handleEndCombat = () => {
    const cs = liveState.combatState;
    if (!cs) return;
    soundEngine.playSynth('fanfare_victory');
    const updatedCombat: CombatState = {
      ...cs,
      isActive: false,
      isTimerRunning: false,
      turnTimerEndsAt: null,
    };
    updateDisplay(
      (prev) => ({ ...prev, combatState: updatedCombat }),
      'Fin de Combate'
    );
  };

  return {
    handleNextCombatTurn,
    handlePrevCombatTurn,
    handleToggleCombatTimer,
    handleAddCombatTimerSeconds,
    handleResetCombatTimer,
    handleToggleCombatTimerVisibility,
    handleFocusCombatant,
    handleToggleCombatTrackingMode,
    handleToggleDmSpeakingDucked,
    handleSelectDuckingPreset,
    handleUpdateCombatantHp,
    handleToggleCombatantCondition,
    handleStartCombat,
    handleEndCombat,
  };
}
