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
  ChevronRight,
  ChevronLeft,
  Dices,
  UserPlus,
  Eye,
  EyeOff,
  Heart,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  BookOpen,
  Award,
  Sparkles,
  X,
  Copy,
} from 'lucide-react';

interface CombatTabProps {
  combatState: CombatState;
  campaign: Campaign | null;
  currentScene: Scene | null;
  encounters?: SavedEncounter[];
  onUpdateCombatState: (state: CombatState) => void;
  onSaveEncounter?: (encounter: SavedEncounter) => void;
  onDeleteEncounter?: (id: string) => void;
}

const CONDITIONS_LIST: { id: CombatCondition; label: string; icon: string }[] = [
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

  // Victory summary modal
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [victorySummary, setVictorySummary] = useState<{
    rounds: number;
    defeatedMonsters: string[];
    survivors: string[];
    rewards: string;
  } | null>(null);

  const [newCombatant, setNewCombatant] = useState<{
    name: string;
    avatarUrl: string;
    initiative: number;
    hp: number;
    isMonster: boolean;
  }>({
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
    // Sort deployed combatants by initiative
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
          <div className="turn-navigation-row">
            <button className="turn-nav-btn" onClick={handlePrevTurn} title="Turno Anterior">
              <ChevronLeft size={20} />
              <span>Anterior</span>
            </button>

            {/* Turn Timer Controller */}
            <div className="turn-timer-ctrl-group">
              <div
                className={`turn-timer-badge ${localRemaining <= 10 && combatState.isTimerRunning ? 'urgent' : ''}`}
                onClick={handleToggleTimer}
                title={combatState.isTimerRunning ? 'Pausar Reloj' : 'Iniciar Reloj'}
              >
                <Clock size={16} />
                <span>{localRemaining}s</span>
              </div>
              <button
                className="timer-mini-btn"
                onClick={() => handleAddTimerSeconds(30)}
                title="Añadir +30 segundos al turno"
              >
                <Plus size={12} />
                <span className="text-[10px] font-bold">30s</span>
              </button>
              <button className="timer-mini-btn" onClick={handleResetTimer} title="Reiniciar reloj">
                <RotateCcw size={14} />
              </button>
              <button
                className={`timer-mini-btn ${combatState.showTurnTimerToPlayers !== false ? 'active' : ''}`}
                onClick={toggleShowTimerToPlayers}
                title={
                  combatState.showTurnTimerToPlayers !== false
                    ? 'Reloj visible en Mesa'
                    : 'Reloj oculto a jugadores'
                }
              >
                {combatState.showTurnTimerToPlayers !== false ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>

            <button className="turn-nav-btn primary" onClick={handleNextTurn} title="Siguiente Turno">
              <span>Siguiente</span>
              <ChevronRight size={20} />
            </button>
          </div>
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
          deployedCombatants.map((c, index) => {
            const isActive = combatState.isActive && index === combatState.currentTurnIndex;
            return (
              <div
                key={c.id}
                className={`master-combatant-card ${isActive ? 'active-turn' : ''} ${
                  c.currentHp <= 0 ? 'fallen' : ''
                }`}
              >
                {/* Card Header */}
                <div className="card-row-top">
                  <div className="combatant-avatar-box">
                    <img src={c.avatarUrl} alt={c.name} className="combatant-avatar" />
                    <span className="init-score">Init: {c.initiative}</span>
                  </div>

                  <div className="combatant-info">
                    <div className="name-row">
                      <strong className="combatant-name">{c.name}</strong>
                      {isActive && <span className="active-turn-pill">TURNO ACTIVO</span>}
                    </div>

                    {/* HP Modifiers */}
                    <div className="hp-manager-row">
                      <Heart size={14} className="text-rose-500" />
                      <span className="hp-readout">
                        {c.currentHp} / {c.maxHp} HP
                      </span>

                      <div className="hp-buttons-group">
                        <button className="hp-btn" onClick={() => handleModifyHp(c.id, -5)}>
                          -5
                        </button>
                        <button className="hp-btn" onClick={() => handleModifyHp(c.id, -1)}>
                          -1
                        </button>
                        <button className="hp-btn plus" onClick={() => handleModifyHp(c.id, 1)}>
                          +1
                        </button>
                        <button className="hp-btn plus" onClick={() => handleModifyHp(c.id, 5)}>
                          +5
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="combatant-card-actions">
                    <button
                      className={`icon-toggle-btn ${c.showHpToPlayers ? 'on' : 'off'}`}
                      onClick={() => handleToggleHpVisibility(c.id)}
                      title={c.showHpToPlayers ? 'HP visible en Tablet' : 'HP oculto a jugadores'}
                    >
                      {c.showHpToPlayers ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      className="delete-combatant-btn"
                      onClick={() => handleRemoveCombatant(c.id)}
                      title="Eliminar del encuentro"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Conditions Row */}
                <div className="conditions-picker-row">
                  {CONDITIONS_LIST.map((cond) => {
                    const isApplied = c.conditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        className={`cond-chip ${isApplied ? 'applied' : ''}`}
                        onClick={() => handleToggleCondition(c.id, cond.id)}
                        title={cond.label}
                      >
                        <span>{cond.icon}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
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
      {showVictoryModal && victorySummary && (
        <div className="modal-overlay victory-modal-overlay" onClick={() => setShowVictoryModal(false)}>
          <div className="modal-content victory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-align-gap">
                <Sparkles size={20} className="text-amber-400" />
                <h2>¡Victoria en Combate!</h2>
              </div>
              <button className="modal-close" onClick={() => setShowVictoryModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="victory-summary-body">
              <div className="summary-stat-box">
                <span className="stat-num">{victorySummary.rounds}</span>
                <span className="stat-label">Rondas de Batalla</span>
              </div>

              <div className="summary-details-section">
                <strong>💀 Enemigos Derrotados ({victorySummary.defeatedMonsters.length}):</strong>
                <p>
                  {victorySummary.defeatedMonsters.length > 0
                    ? victorySummary.defeatedMonsters.join(', ')
                    : 'Ningún enemigo caído.'}
                </p>

                <strong>🛡️ Supervivientes ({victorySummary.survivors.length}):</strong>
                <p>
                  {victorySummary.survivors.length > 0
                    ? victorySummary.survivors.join(', ')
                    : 'No hubo supervivientes.'}
                </p>

                <div className="victory-rewards-card">
                  <div className="flex-between mb-1">
                    <div className="flex-align-gap">
                      <Award size={16} className="text-amber-400" />
                      <strong>Recompensas Asignadas:</strong>
                    </div>
                    <button
                      className="copy-rewards-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(victorySummary.rewards);
                        alert('¡Recompensas copiadas al portapapeles!');
                      }}
                      title="Copiar recompensas"
                    >
                      <Copy size={13} />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <p className="rewards-text">{victorySummary.rewards}</p>
                </div>
              </div>
            </div>

            <button className="btn-primary full" onClick={() => setShowVictoryModal(false)}>
              Cerrar Resumen
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Combatant */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agregar Combatiente</h2>
            </div>
            <form onSubmit={handleAddCustomCombatant} className="modal-form">
              <label>Nombre del Monstruo / PNJ</label>
              <input
                type="text"
                required
                placeholder="Ej. Líder Orco"
                value={newCombatant.name}
                onChange={(e) => setNewCombatant({ ...newCombatant, name: e.target.value })}
                className="master-input"
              />

              <label>Iniciativa</label>
              <input
                type="number"
                value={newCombatant.initiative}
                onChange={(e) =>
                  setNewCombatant({ ...newCombatant, initiative: parseInt(e.target.value) || 0 })
                }
                className="master-input"
              />

              <label>Puntos de Golpe Máximos (HP)</label>
              <input
                type="number"
                value={newCombatant.hp}
                onChange={(e) =>
                  setNewCombatant({ ...newCombatant, hp: parseInt(e.target.value) || 1 })
                }
                className="master-input"
              />

              <label>URL del Retrato</label>
              <input
                type="text"
                value={newCombatant.avatarUrl}
                onChange={(e) => setNewCombatant({ ...newCombatant, avatarUrl: e.target.value })}
                className="master-input"
              />

              <button type="submit" className="btn-primary full">
                Agregar al Encuentro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
