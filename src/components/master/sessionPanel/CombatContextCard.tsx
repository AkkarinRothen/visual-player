import React from 'react';
import type { CombatTrackingMode, Combatant } from '../../../types';
import { COMBAT_CONDITIONS_CATALOG } from '../../../domain/combat/combatConditionsCatalog';
import {
  Swords,
  ChevronRight,
  Camera,
  Clock,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

export interface CombatContextCardProps {
  isCombatActive: boolean;
  round: number;
  currentCombatant: Combatant | null;
  panelCombatRemaining: number;
  isTimerRunning?: boolean;
  showTurnTimerToPlayers?: boolean;
  trackingMode?: CombatTrackingMode;
  isCombatantOnStage: boolean;
  onSwitchToTab: (tab: 'live' | 'staging' | 'combat' | 'library' | 'history' | 'settings') => void;
  onToggleCombatTrackingMode?: (mode: CombatTrackingMode) => void;
  onFocusCombatant?: () => void;
  onToggleCombatTimer?: () => void;
  onAddCombatTimerSeconds?: (seconds: number) => void;
  onResetCombatTimer?: () => void;
  onToggleCombatTimerVisibility?: () => void;
  onPrevCombatTurn: () => void;
  onNextCombatTurn: () => void;
}

export const CombatContextCard: React.FC<CombatContextCardProps> = ({
  isCombatActive,
  round,
  currentCombatant,
  panelCombatRemaining,
  isTimerRunning,
  showTurnTimerToPlayers,
  trackingMode,
  isCombatantOnStage,
  onSwitchToTab,
  onToggleCombatTrackingMode,
  onFocusCombatant,
  onToggleCombatTimer,
  onAddCombatTimerSeconds,
  onResetCombatTimer,
  onToggleCombatTimerVisibility,
  onPrevCombatTurn,
  onNextCombatTurn,
}) => {
  return (
    <section className={`session-card combat-context-card ${isCombatActive ? 'combat-live' : ''}`}>
      <div className="card-header-bar">
        <div className="flex-align-gap">
          <Swords size={15} className={isCombatActive ? 'text-rose-400' : 'text-slate-400'} />
          <h2 className="card-title">
            {isCombatActive ? `COMBATE EN CURSO (RONDA ${round})` : 'COMBATE'}
          </h2>
        </div>
        <button
          className="card-link-btn"
          onClick={() => onSwitchToTab('combat')}
          title="Abrir la pestaña completa de Combate"
        >
          <span>Ver Completo</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {isCombatActive && currentCombatant ? (
        <div className="combat-active-widget">
          <div className="combat-turn-header">
            <img
              src={currentCombatant.avatarUrl}
              alt={currentCombatant.name}
              className="combat-turn-avatar"
            />
            <div className="combat-turn-info">
              <div className="combat-turn-name-row">
                <strong className="combat-turn-name">{currentCombatant.name}</strong>
                <span className="combat-init-pill">Init: {currentCombatant.initiative}</span>
              </div>
              <div className="combat-hp-progress-box">
                <span className="hp-text">
                  {currentCombatant.currentHp} / {currentCombatant.maxHp} HP
                </span>
                <div className="hp-bar-bg">
                  <div
                    className="hp-bar-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (currentCombatant.currentHp / (currentCombatant.maxHp || 1)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Combatant Public Conditions */}
          {currentCombatant.conditions && currentCombatant.conditions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
              {currentCombatant.conditions.map((cond) => {
                const meta = COMBAT_CONDITIONS_CATALOG[cond] || {
                  label: cond,
                  icon: '•',
                  color: '#cbd5e1',
                  description: '',
                };
                return (
                  <span
                    key={cond}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border shadow-sm bg-slate-900/90"
                    style={{ borderColor: meta.color, color: meta.color }}
                    title={`${meta.label}: ${meta.description}`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Cinematic Camera Tracking & Focus Controls */}
          <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-950/70 rounded-lg border border-slate-800 text-[11px] mb-2.5">
            <div className="flex items-center gap-1.5">
              <Camera size={12} className="text-amber-400" />
              <span className="text-slate-400">Cámara:</span>
              <select
                value={trackingMode || 'suggest'}
                onChange={(e) =>
                  onToggleCombatTrackingMode?.(e.target.value as CombatTrackingMode)
                }
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[10px]"
              >
                <option value="suggest">Sugerir</option>
                <option value="auto">Automática</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* Focus Button if Combatant is on Stage */}
            {isCombatantOnStage && onFocusCombatant && (
              <button
                type="button"
                onClick={onFocusCombatant}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 transition-all active:scale-95"
                title={`Enfocar cámara al combatiente en turno (${currentCombatant.name})`}
              >
                <Camera size={11} />
                <span>Enfocar</span>
              </button>
            )}
          </div>

          {/* Turn Timer Controls Bar */}
          <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-950/90 rounded-lg border border-slate-800 text-xs mb-2">
            <button
              type="button"
              onClick={onToggleCombatTimer}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-bold transition-all ${
                panelCombatRemaining <= 10 && isTimerRunning
                  ? 'bg-red-950/80 text-red-300 border border-red-500/70 animate-pulse'
                  : isTimerRunning
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                  : 'bg-slate-900 text-slate-300 border border-slate-700/60'
              }`}
              title={isTimerRunning ? 'Pausar Reloj de Turno' : 'Iniciar Reloj de Turno'}
            >
              <Clock
                size={13}
                className={isTimerRunning ? 'text-emerald-400' : 'text-slate-400'}
              />
              <span>{panelCombatRemaining}s</span>
              <span className="text-[10px] font-sans font-normal text-slate-400">
                {isTimerRunning ? 'En Marcha' : 'Pausado'}
              </span>
            </button>

            <div className="flex items-center gap-1">
              {onAddCombatTimerSeconds && (
                <button
                  type="button"
                  onClick={() => onAddCombatTimerSeconds(30)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-0.5"
                  title="Añadir +30 segundos al turno actual"
                >
                  <Plus size={11} />
                  <span>30s</span>
                </button>
              )}

              {onResetCombatTimer && (
                <button
                  type="button"
                  onClick={onResetCombatTimer}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                  title="Reiniciar reloj de turno"
                >
                  <RotateCcw size={13} />
                </button>
              )}

              {onToggleCombatTimerVisibility && (
                <button
                  type="button"
                  onClick={onToggleCombatTimerVisibility}
                  className={`p-1 rounded border transition-colors ${
                    showTurnTimerToPlayers !== false
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                  title={
                    showTurnTimerToPlayers !== false
                      ? 'Reloj visible en Mesa'
                      : 'Reloj oculto a jugadores'
                  }
                >
                  {showTurnTimerToPlayers !== false ? (
                    <Eye size={13} />
                  ) : (
                    <EyeOff size={13} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Turn Nav Buttons */}
          <div className="combat-quick-nav-row">
            <button
              className="btn-combat-nav prev"
              onClick={onPrevCombatTurn}
              title="Retroceder turno"
            >
              Turno Anterior
            </button>
            <button
              className="btn-combat-nav next"
              onClick={onNextCombatTurn}
              title="Avanzar al siguiente combatiente"
            >
              Siguiente Turno
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="combat-idle-box">
          <p className="text-xs text-slate-400">Sin batalla activa en este momento.</p>
          <button
            className="btn-start-combat-quick"
            onClick={() => onSwitchToTab('combat')}
          >
            <Swords size={14} />
            <span>Desplegar Encuentro</span>
          </button>
        </div>
      )}
    </section>
  );
};
