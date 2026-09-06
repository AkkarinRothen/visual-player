import React, { useState, useEffect } from 'react';
import type { Campaign, CombatCondition, CombatState, Combatant, SavedEncounter, Scene } from '../../types';
import { soundEngine } from '../../services/soundEngine';
import { SavedEncountersModal } from './SavedEncountersModal';
import {
  calculateRemainingTimerSeconds,
  startCombatTurnTimer,
  pauseCombatTurnTimer,
  addSecondsToCombatTurnTimer,
  resetCombatTurnTimer,
  advanceCombatTurnWithTimer,
} from '../../domain/combat/combatTimerCoordinator';
import {
  addConditionToCombatant,
  removeConditionFromCombatant,
} from '../../domain/combat/combatConditionsCatalog';
import {
  Swords,
  Play,
  Square,
  Dices,
  UserPlus,
  BookOpen,
  Plus,
} from 'lucide-react';
import { CombatantCard } from './combat/CombatantCard';
import { CombatTimerControls } from './combat/CombatTimerControls';
import { CombatVictoryModal } from './combat/CombatVictoryModal';
import { AddCombatantModal } from './combat/AddCombatantModal';
import type { VictorySummaryData, NewCombatantFormData } from './combat/combatTypes';

export interface CombatTabProps {
  combatState: CombatState;
  campaign: Campaign | null;
  currentScene: Scene | null;
  encounters?: SavedEncounter[];
  onUpdateCombatState: (state: CombatState) => void;
  onSaveEncounter?: (encounter: SavedEncounter) => void;
  onDeleteEncounter?: (id: string) => void;
}

export const CombatTab: React.FC<CombatTabProps> = ({
  combatState,
  campaign,
  currentScene: _currentScene,
  encounters = [],
  onUpdateCombatState,
  onSaveEncounter = () => {},
  onDeleteEncounter = () => {},
}) => {
  const [localRemaining, setLocalRemaining] = useState<number>(() =>
    calculateRemainingTimerSeconds(combatState)
  );
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEncountersModal, setShowEncountersModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [victorySummary, setVictorySummary] = useState<VictorySummaryData | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    if (!showAddModal && !showVictoryModal && !showEncountersModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        else if (showVictoryModal) setShowVictoryModal(false);
        else if (showEncountersModal) setShowEncountersModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showVictoryModal, showEncountersModal]);

  const [newCombatant, setNewCombatant] = useState<NewCombatantFormData>({
    name: '',
    avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    initiative: 10,
    hp: 30,
    isMonster: true,
  });

  // Filter deployed vs undeployed (wave reinforcements)
  const deployedCombatants = combatState.combatants.filter((c) => c.isDeployed !== false);
  const pendingWaveReinforcements = combatState.combatants.filter((c) => c.isDeployed === false);

  // Check if any wave reinforcement is ready to trigger in current round
  const readyWaveReinforcements = pendingWaveReinforcements.filter(
    (c) => (c.triggerRound || 2) <= combatState.round
  );

  // High-precision local countdown timer computed from absolute epoch (zero network traffic)
  useEffect(() => {
    const updateCountdown = () => {
      setLocalRemaining(calculateRemainingTimerSeconds(combatState));
    };

    updateCountdown();

    if (!combatState.isTimerRunning) return;

    const interval = window.setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [
    combatState.isTimerRunning,
    combatState.turnTimerEndsAt,
    combatState.turnTimerRemainingSeconds,
    combatState.turnTimerSeconds,
    combatState.turnTimerTotalSeconds,
    combatState.turnId,
  ]);

  // Launch Encounter Live from SavedEncountersModal
  const handleLaunchEncounterLive = (encounter: SavedEncounter, combatants: Combatant[]) => {
    soundEngine.playSynth('combat_start');
    const newState: CombatState = {
      isActive: true,
      round: 1,
      currentTurnIndex: 0,
      combatants,
      turnTimerTotalSeconds: encounter.turnTimerSeconds || 60,
      turnTimerSeconds: encounter.turnTimerSeconds || 60,
      turnTimerRemainingSeconds: encounter.turnTimerSeconds || 60,
      isTimerRunning: false,
      showTurnTimerToPlayers: true,
      encounterName: encounter.name,
      rewardsSummary: encounter.rewardsSummary,
    };
    onUpdateCombatState(newState);
  };

  // Load Encounter to Staging
  const handleLoadEncounterToStaging = (encounter: SavedEncounter, combatants: Combatant[]) => {
    const newState: CombatState = {
      isActive: true,
      round: 1,
      currentTurnIndex: 0,
      combatants,
      turnTimerTotalSeconds: encounter.turnTimerSeconds || 60,
      turnTimerSeconds: encounter.turnTimerSeconds || 60,
      turnTimerRemainingSeconds: encounter.turnTimerSeconds || 60,
      isTimerRunning: false,
      showTurnTimerToPlayers: true,
      encounterName: encounter.name,
      rewardsSummary: encounter.rewardsSummary,
    };
    onUpdateCombatState(newState);
  };

  // Deploy Wave Reinforcement
  const handleDeployReinforcement = (cbtId: string) => {
    soundEngine.playSynth('gong');
    const updated = combatState.combatants.map((c) =>
      c.id === cbtId ? { ...c, isDeployed: true } : c
    );
    onUpdateCombatState({ ...combatState, combatants: updated });
  };

  // Deploy All Ready Reinforcements
  const handleDeployAllReady = () => {
    soundEngine.playSynth('gong');
    const updated = combatState.combatants.map((c) =>
      (c.triggerRound || 2) <= combatState.round ? { ...c, isDeployed: true } : c
    );
    onUpdateCombatState({ ...combatState, combatants: updated });
  };

  // Start / End Combat
  const handleToggleCombat = () => {
    if (!combatState.isActive) {
      soundEngine.playSynth('combat_start');
      const newState: CombatState = {
        ...combatState,
        isActive: true,
        round: 1,
        currentTurnIndex: 0,
        turnTimerTotalSeconds: 60,
        turnTimerSeconds: 60,
        turnTimerRemainingSeconds: 60,
        isTimerRunning: false,
        showTurnTimerToPlayers: combatState.showTurnTimerToPlayers !== false,
      };
      onUpdateCombatState(newState);
    } else {
      // Calculate Victory Summary
      const defeated = combatState.combatants
        .filter((c) => c.isMonster && c.currentHp <= 0)
        .map((c) => c.name);
      const survivors = combatState.combatants
        .filter((c) => !c.isMonster && c.currentHp > 0)
        .map((c) => c.name);

      setVictorySummary({
        rounds: combatState.round,
        defeatedMonsters: defeated,
        survivors,
        rewards: combatState.rewardsSummary || 'Sin recompensas registradas',
      });
      setShowVictoryModal(true);

      soundEngine.playSynth('fanfare_victory');
      onUpdateCombatState({
        ...combatState,
        isActive: false,
        isTimerRunning: false,
        turnTimerEndsAt: null,
      });
    }
  };

  // Next / Previous Turn using deterministic coordinator
  const handleNextTurn = () => {
    if (deployedCombatants.length === 0) return;
    soundEngine.playSynth('gong');
    const nextIndex = (combatState.currentTurnIndex + 1) % deployedCombatants.length;
    const isNewRound = nextIndex === 0;
    const nextRound = isNewRound ? combatState.round + 1 : combatState.round;
    const updated = advanceCombatTurnWithTimer(combatState, nextIndex, nextRound);
    onUpdateCombatState(updated);
  };

  const handlePrevTurn = () => {
    if (deployedCombatants.length === 0) return;
    soundEngine.playSynth('pop');
    const prevIndex = combatState.currentTurnIndex - 1;
    let nextIndex = prevIndex;
    let nextRound = combatState.round;
    if (prevIndex < 0) {
      if (combatState.round > 1) {
        nextRound = combatState.round - 1;
        nextIndex = deployedCombatants.length - 1;
      } else {
        nextIndex = 0;
      }
    }
    const updated = advanceCombatTurnWithTimer(combatState, nextIndex, nextRound);
    onUpdateCombatState(updated);
  };

  const handleToggleTimer = () => {
    if (combatState.isTimerRunning) {
      onUpdateCombatState(pauseCombatTurnTimer(combatState));
    } else {
      onUpdateCombatState(startCombatTurnTimer(combatState));
    }
  };

  const handleAddTimerSeconds = (seconds: number = 30) => {
    onUpdateCombatState(addSecondsToCombatTurnTimer(combatState, seconds));
  };

  const handleResetTimer = () => {
    onUpdateCombatState(resetCombatTurnTimer(combatState));
  };

  const toggleShowTimerToPlayers = () => {
    const next = combatState.showTurnTimerToPlayers === false ? true : false;
    onUpdateCombatState({
      ...combatState,
      showTurnTimerToPlayers: next,
    });
  };

  // Roll Initiatives
  const handleRollInitiatives = () => {
    soundEngine.playSynth('heartbeat');
    const updated = combatState.combatants
      .map((c) => ({
        ...c,
        initiative: Math.floor(Math.random() * 20) + 1,
      }))
      .sort((a, b) => b.initiative - a.initiative);

    onUpdateCombatState({
      ...combatState,
      combatants: updated,
      currentTurnIndex: 0,
    });
  };

  // Import Campaign Characters
  const handleImportAllCharacters = () => {
    if (!campaign) return;
    const newCombatants: Combatant[] = campaign.characters.map((ch) => ({
      id: `comb-${ch.id}-${Date.now()}`,
      name: ch.name,
      avatarUrl: ch.defaultAvatarUrl,
      initiative: Math.floor(Math.random() * 20) + 1,
      currentHp: ch.maxHp || 45,
      maxHp: ch.maxHp || 45,
      showHpToPlayers: false,
      conditions: [],
      isMonster: false,
      isDeployed: true,
    }));

    const merged = [...combatState.combatants, ...newCombatants].sort(
      (a, b) => b.initiative - a.initiative
    );

    onUpdateCombatState({
      ...combatState,
      combatants: merged,
    });
  };

  // Modify HP
  const handleModifyHp = (id: string, delta: number) => {
    const updated = combatState.combatants.map((c) => {
      if (c.id === id) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.currentHp + delta));
        if (newHp === 0) {
          soundEngine.playSynth('sword_clash');
        }
        return { ...c, currentHp: newHp };
      }
      return c;
    });

    onUpdateCombatState({ ...combatState, combatants: updated });
  };

  // Toggle Condition
  const handleToggleCondition = (id: string, condition: CombatCondition) => {
    const updated = combatState.combatants.map((c) => {
      if (c.id === id) {
        const exists = c.conditions.includes(condition);
        if (exists) {
          return removeConditionFromCombatant(c, condition);
        } else {
          return addConditionToCombatant(c, condition, true, combatState.round);
        }
      }
      return c;
    });

    onUpdateCombatState({ ...combatState, combatants: updated });
  };

  // Toggle HP Visibility to Players
  const handleToggleHpVisibility = (id: string) => {
    const updated = combatState.combatants.map((c) =>
      c.id === id ? { ...c, showHpToPlayers: !c.showHpToPlayers } : c
    );
    onUpdateCombatState({ ...combatState, combatants: updated });
  };

  // Remove Combatant
  const handleRemoveCombatant = (id: string) => {
    const updated = combatState.combatants.filter((c) => c.id !== id);
    onUpdateCombatState({
      ...combatState,
      combatants: updated,
      currentTurnIndex: Math.min(combatState.currentTurnIndex, Math.max(0, updated.length - 1)),
    });
  };

  // Add Custom Combatant
  const handleAddCustomCombatant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCombatant.name) return;

    const created: Combatant = {
      id: `comb-custom-${Date.now()}`,
      name: newCombatant.name,
      avatarUrl: newCombatant.avatarUrl,
      initiative: newCombatant.initiative,
      currentHp: newCombatant.hp,
      maxHp: newCombatant.hp,
      showHpToPlayers: false,
      conditions: [],
      isMonster: newCombatant.isMonster,
      isDeployed: true,
    };

    const updated = [...combatState.combatants, created].sort(
      (a, b) => b.initiative - a.initiative
    );

    onUpdateCombatState({ ...combatState, combatants: updated });
    setShowAddModal(false);
    setNewCombatant({
      name: '',
      avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      initiative: 10,
      hp: 30,
      isMonster: true,
    });
  };

  return (
    <div className="combat-tab-root">
      {/* 1. Combat Control Header Bar */}
      <section className="control-section combat-header-section">
        <div className="combat-main-controls">
          <button
            className={`combat-toggle-btn ${combatState.isActive ? 'active' : ''}`}
            onClick={handleToggleCombat}
          >
            {combatState.isActive ? <Square size={16} /> : <Play size={16} />}
            <span>{combatState.isActive ? 'Finalizar Combate' : 'Iniciar Combate'}</span>
          </button>

          {combatState.isActive && (
            <div className="round-counter-chip">
              <span>RONDA {combatState.round}</span>
              {combatState.encounterName && <span className="enc-name-sub">({combatState.encounterName})</span>}
            </div>
          )}
        </div>

        {combatState.isActive && (
          <CombatTimerControls
            isTimerRunning={!!combatState.isTimerRunning}
            showTurnTimerToPlayers={combatState.showTurnTimerToPlayers !== false}
            localRemaining={localRemaining}
            onPrevTurn={handlePrevTurn}
            onNextTurn={handleNextTurn}
            onToggleTimer={handleToggleTimer}
            onAddTimerSeconds={handleAddTimerSeconds}
            onResetTimer={handleResetTimer}
            onToggleShowTimerToPlayers={toggleShowTimerToPlayers}
          />
        )}
      </section>

      {/* 2. Setup Tools Bar */}
      <div className="combat-setup-tools">
        <button
          className="setup-tool-btn highlight"
          onClick={() => setShowEncountersModal(true)}
          title="Biblioteca de Encuentros Guardados"
        >
          <BookOpen size={14} className="text-amber-400" />
          <span>📚 Encuentros Guardados</span>
        </button>

        <button className="setup-tool-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={14} />
          <span>+ Combatiente</span>
        </button>
        <button className="setup-tool-btn" onClick={handleRollInitiatives} title="Tirar d20 para todos">
          <Dices size={14} />
          <span>Tirar Iniciativas</span>
        </button>
        <button className="setup-tool-btn" onClick={handleImportAllCharacters}>
          <UserPlus size={14} />
          <span>Importar Campaña</span>
        </button>
      </div>

      {/* 3. Wave Reinforcements Arrival Alert Banner */}
      {combatState.isActive && readyWaveReinforcements.length > 0 && (
        <div className="wave-arrival-banner">
          <div className="flex-align-gap">
            <span className="wave-icon-pulse">🌊</span>
            <strong>
              ¡Refuerzo en Ronda {combatState.round}! ({readyWaveReinforcements.length} enemigos listos)
            </strong>
          </div>
          <button className="btn-deploy-wave" onClick={handleDeployAllReady}>
            <span>📢 Desplegar a la Batalla</span>
          </button>
        </div>
      )}

      {/* 4. Active Deployed Combatants List */}
      <div className="combatants-list">
        {deployedCombatants.length === 0 ? (
          <div className="empty-combat-state">
            <Swords size={36} className="text-amber-500/40 mb-2" />
            <p>No hay combatientes activos en el encuentro.</p>
            <span className="text-xs text-slate-400">
              Pulsa "📚 Encuentros Guardados" o "Importar Campaña" para desplegar la batalla.
            </span>
          </div>
        ) : (
          deployedCombatants.map((c, index) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={combatState.isActive && index === combatState.currentTurnIndex}
              onModifyHp={handleModifyHp}
              onToggleHpVisibility={handleToggleHpVisibility}
              onToggleCondition={handleToggleCondition}
              onRemoveCombatant={handleRemoveCombatant}
            />
          ))
        )}
      </div>

      {/* 5. Pending Hidden Reinforcements Section */}
      {pendingWaveReinforcements.length > 0 && (
        <section className="control-section wave-reinforcements-section">
          <div className="section-header">
            <span className="section-title">
              🌊 Refuerzos Ocultos en Reserva ({pendingWaveReinforcements.length})
            </span>
          </div>
          <div className="wave-reserve-list">
            {pendingWaveReinforcements.map((c) => (
              <div key={c.id} className="wave-reserve-card">
                <img src={c.avatarUrl} alt={c.name} className="cbt-avatar" />
                <div className="wave-reserve-info">
                  <strong>{c.name}</strong>
                  <span>
                    {c.maxHp} HP • Programado para Ronda {c.triggerRound || 2}
                  </span>
                </div>
                <button
                  className="btn-primary-sm deploy-single-btn"
                  onClick={() => handleDeployReinforcement(c.id)}
                >
                  <span>📢 Desplegar Ahora</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL: SAVED ENCOUNTERS LIBRARY */}
      {showEncountersModal && (
        <SavedEncountersModal
          campaign={campaign}
          encounters={encounters}
          isCombatActive={combatState.isActive}
          onLaunchEncounterLive={handleLaunchEncounterLive}
          onLoadEncounterToStaging={handleLoadEncounterToStaging}
          onSaveEncounter={onSaveEncounter}
          onDeleteEncounter={onDeleteEncounter}
          onClose={() => setShowEncountersModal(false)}
        />
      )}

      {/* MODAL: VICTORY SUMMARY */}
      <CombatVictoryModal
        isOpen={showVictoryModal}
        summary={victorySummary}
        onClose={() => setShowVictoryModal(false)}
      />

      {/* Modal: Add Combatant */}
      <AddCombatantModal
        isOpen={showAddModal}
        formData={newCombatant}
        onFormDataChange={setNewCombatant}
        onSubmit={handleAddCustomCombatant}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};
