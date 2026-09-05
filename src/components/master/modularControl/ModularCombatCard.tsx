import React, { useState } from 'react';
import {
  Swords,
  ChevronRight,
  Crosshair,
  Clock,
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { CombatState, Combatant, CombatCondition } from '../../../types';

export interface ModularCombatCardProps {
  combatState: CombatState;
  onNextCombatTurn?: () => void;
  onPrevCombatTurn?: () => void;
  onUpdateCombatantHp?: (combatantId: string, newHp: number) => void;
  onToggleCombatantCondition?: (combatantId: string, condition: string) => void;
  onStartCombat?: () => void;
  onEndCombat?: () => void;
  onFocusCombatant?: (combatantId: string) => void;
  onOpenCombatTab?: () => void;
  combatTimerRemaining?: number;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
}

const COMMON_CONDITIONS: { key: CombatCondition; label: string; icon: string; color: string }[] = [
  { key: 'burning', label: 'En Llamas', icon: '🔥', color: '#f97316' },
  { key: 'poisoned', label: 'Envenenado', icon: '☠️', color: '#22c55e' },
  { key: 'stunned', label: 'Aturdido', icon: '⚡', color: '#eab308' },
  { key: 'blessed', label: 'Bendito', icon: '✨', color: '#fbbf24' },
  { key: 'blinded', label: 'Ciego', icon: '👁️', color: '#94a3b8' },
  { key: 'paralyzed', label: 'Paralizado', icon: '🧊', color: '#06b6d4' },
  { key: 'prone', label: 'Derribado', icon: '🛡️', color: '#64748b' },
];

export const ModularCombatCard: React.FC<ModularCombatCardProps> = ({
  combatState,
  onNextCombatTurn,
  onPrevCombatTurn,
  onUpdateCombatantHp,
  onToggleCombatantCondition,
  onStartCombat,
  onEndCombat,
  onFocusCombatant,
  onOpenCombatTab,
  combatTimerRemaining,
  isTimerRunning,
  onToggleTimer,
}) => {
  const [isEditingHp, setIsEditingHp] = useState(false);
  const [hpInput, setHpInput] = useState('');

  const isCombatActive = !!combatState?.isActive;
  const combatants = combatState?.combatants || [];
  const currentCombatant: Combatant | null =
    isCombatActive && combatants.length > 0
      ? combatants[combatState.currentTurnIndex] || combatants[0]
      : null;

  const currentHp = currentCombatant?.currentHp ?? 0;
  const maxHp = currentCombatant?.maxHp || 1;
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  const isBloodied = currentHp <= maxHp * 0.5;

  const getHpFillColor = () => {
    if (hpPercent <= 25) return '#ef4444';
    if (hpPercent <= 50) return '#f59e0b';
    return '#22c55e';
  };

  const handleDeltaHp = (delta: number) => {
    if (!currentCombatant || !onUpdateCombatantHp) return;
    const targetHp = Math.max(0, Math.min(maxHp, currentHp + delta));
    onUpdateCombatantHp(currentCombatant.id, targetHp);
  };

  const handleSaveDirectHp = () => {
    if (!currentCombatant || !onUpdateCombatantHp) return;
    const parsed = parseInt(hpInput, 10);
    if (!isNaN(parsed)) {
      onUpdateCombatantHp(currentCombatant.id, Math.max(0, Math.min(maxHp, parsed)));
    }
    setIsEditingHp(false);
  };

  return (
    <section
      className={`modular-card ${isCombatActive ? 'combat-active' : ''}`}
      aria-label="Combate táctico"
    >
      <div className="modular-card-header">
        <div className="modular-card-title-group">
          <Swords size={18} className="modular-card-icon" style={{ color: isCombatActive ? '#ef4444' : '#fbbf24' }} />
          <span>{isCombatActive ? 'Combate en curso' : 'Combate'}</span>
          {isCombatActive && (
            <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600 }}>
              (Ronda {combatState.round})
            </span>
          )}
        </div>

        {onOpenCombatTab && (
          <button
            type="button"
            className="modular-card-arrow"
            onClick={onOpenCombatTab}
            aria-label="Abrir consola completa de combate"
            title="Ver orden completo y estadísticas de combate"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {!isCombatActive ? (
        /* Estado 1: Fuera de Combate */
        <div className="modular-combat-inactive">
          <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
            No hay ningún combate activo en esta escena.
          </span>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            {onStartCombat && (
              <button
                type="button"
                className="modular-btn-action accent"
                onClick={onStartCombat}
                style={{ flex: 1 }}
              >
                <Swords size={15} />
                <span>Iniciar Combate</span>
              </button>
            )}
            {onOpenCombatTab && (
              <button
                type="button"
                className="modular-btn-action"
                onClick={onOpenCombatTab}
                style={{ flex: 1 }}
              >
                <Sparkles size={14} />
                <span>Elegir Encuentro</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Estado 2: Combate Activo */
        <>
          {/* Cabecera del turno activo */}
          <div className="modular-combat-turn-header">
            <div className="modular-combat-combatant-info">
              {currentCombatant?.avatarUrl ? (
                <img
                  src={currentCombatant.avatarUrl}
                  alt=""
                  className="modular-combat-avatar"
                />
              ) : (
                <div
                  className="modular-combat-avatar"
                  style={{ background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Swords size={18} color="#ef4444" />
                </div>
              )}
              <div className="modular-combat-name-group">
                <span className="modular-combatant-name">
                  {currentCombatant?.name || 'Combatiente'}
                </span>
                <span className="modular-combat-round-tag">
                  Iniciativa {currentCombatant?.initiative ?? '-'} • {currentCombatant?.isMonster ? 'Enemigo' : 'Aliado'}
                </span>
              </div>
            </div>

            {/* Herramientas de cabecera: Enfoque y Temporizador */}
            <div className="modular-combat-header-tools">
              {onFocusCombatant && currentCombatant && (
                <button
                  type="button"
                  className="modular-combat-tool-btn"
                  onClick={() => onFocusCombatant(currentCombatant.id)}
                  title="Enfocar cámara de la mesa sobre este combatiente"
                  aria-label="Enfocar combatiente en mesa"
                >
                  <Crosshair size={14} style={{ color: '#38bdf8' }} />
                  <span>Enfocar</span>
                </button>
              )}

              {combatTimerRemaining !== undefined && onToggleTimer && (
                <button
                  type="button"
                  className="modular-combat-tool-btn"
                  onClick={onToggleTimer}
                  title={isTimerRunning ? 'Pausar temporizador de turno' : 'Iniciar temporizador de turno'}
                  aria-label="Temporizador de turno"
                >
                  <Clock size={13} style={{ color: '#fbbf24' }} />
                  <span>{combatTimerRemaining}s</span>
                  {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Caja de Control de Salud (HP) */}
          <div className="modular-combat-hp-box">
            <div className="modular-combat-hp-header">
              <span className="modular-combat-hp-label">Salud (Puntos de Golpe)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isBloodied && (
                  <span className="modular-combat-bloodied-badge">
                    <AlertTriangle size={11} style={{ display: 'inline', marginRight: '3px' }} />
                    Malherido
                  </span>
                )}
                {isEditingHp ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      value={hpInput}
                      onChange={(e) => setHpInput(e.target.value)}
                      style={{
                        width: '50px',
                        background: '#1e293b',
                        border: '1px solid #38bdf8',
                        color: '#ffffff',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        fontSize: '0.85rem',
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="modular-stepper-btn"
                      style={{ width: '26px', height: '26px' }}
                      onClick={handleSaveDirectHp}
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <span
                    className="modular-combat-hp-text"
                    onClick={() => {
                      setHpInput(String(currentHp));
                      setIsEditingHp(true);
                    }}
                    title="Tocar para editar HP directamente"
                    style={{ cursor: 'pointer' }}
                  >
                    {currentHp} / {maxHp} HP
                  </span>
                )}
              </div>
            </div>

            {/* Barra de progreso de HP */}
            <div className="modular-combat-hp-track">
              <div
                className="modular-combat-hp-fill"
                style={{
                  width: `${hpPercent}%`,
                  backgroundColor: getHpFillColor(),
                }}
              />
            </div>

            {/* Steppers rápidos de impacto para el pulgar */}
            <div className="modular-combat-hp-steppers">
              <button
                type="button"
                className="modular-hp-btn damage"
                onClick={() => handleDeltaHp(-10)}
                title="Aplicar 10 de daño"
              >
                -10
              </button>
              <button
                type="button"
                className="modular-hp-btn damage"
                onClick={() => handleDeltaHp(-5)}
                title="Aplicar 5 de daño"
              >
                -5
              </button>
              <button
                type="button"
                className="modular-hp-btn damage"
                onClick={() => handleDeltaHp(-1)}
                title="Aplicar 1 de daño"
              >
                -1
              </button>
              <button
                type="button"
                className="modular-hp-btn heal"
                onClick={() => handleDeltaHp(5)}
                title="Curar 5 puntos de golpe"
              >
                +5
              </button>
            </div>
          </div>

          {/* Carrusel de Estados Alterados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Estados alterados
            </span>
            <div className="modular-combat-conditions-row">
              {COMMON_CONDITIONS.map((cond) => {
                const isActive = (currentCombatant?.conditions || []).includes(cond.key);
                return (
                  <button
                    key={cond.key}
                    type="button"
                    className={`modular-condition-pill ${isActive ? 'active' : ''}`}
                    style={{
                      color: isActive ? '#ffffff' : cond.color,
                      backgroundColor: isActive ? cond.color : undefined,
                    }}
                    onClick={() => {
                      if (currentCombatant && onToggleCombatantCondition) {
                        onToggleCombatantCondition(currentCombatant.id, cond.key);
                      }
                    }}
                    title={cond.label}
                  >
                    <span>{cond.icon}</span>
                    <span>{cond.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila de Navegación de Turno */}
          <div className="modular-combat-nav-row">
            {onPrevCombatTurn && (
              <button
                type="button"
                className="modular-combat-nav-btn prev"
                onClick={onPrevCombatTurn}
                title="Volver al turno anterior"
                aria-label="Turno anterior"
              >
                <ArrowLeft size={16} />
                <span>Anterior</span>
              </button>
            )}

            {onNextCombatTurn && (
              <button
                type="button"
                className="modular-combat-nav-btn next"
                onClick={onNextCombatTurn}
                title="Avanzar al siguiente combatiente"
                aria-label="Siguiente turno"
              >
                <span>Siguiente turno</span>
                <ArrowRight size={17} />
              </button>
            )}

            {onEndCombat && (
              <button
                type="button"
                className="modular-combat-nav-btn prev"
                style={{ padding: '0 10px', fontSize: '0.78rem', color: '#f87171' }}
                onClick={onEndCombat}
                title="Finalizar el combate actual"
              >
                Terminar
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
};
