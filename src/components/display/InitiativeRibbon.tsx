import React, { useState, useEffect, useRef } from 'react';
import type { CombatState, Combatant } from '../../types';
import { Swords, Clock, AlertTriangle, Pause } from 'lucide-react';
import { calculateRemainingTimerSeconds } from '../../domain/combat/combatTimerCoordinator';
import { filterPublicConditions } from '../../domain/combat/combatConditionsCatalog';
import { soundEngine } from '../../services/soundEngine';

interface InitiativeRibbonProps {
  combatState: CombatState;
}

export const InitiativeRibbon: React.FC<InitiativeRibbonProps> = ({ combatState }) => {
  if (!combatState.isActive || combatState.combatants.length === 0) {
    return null;
  }

  const {
    round,
    currentTurnIndex,
    combatants,
    showTurnTimerToPlayers,
    isTimerRunning,
    turnTimerEndsAt,
    turnTimerRemainingSeconds,
    turnTimerSeconds,
    turnTimerTotalSeconds,
    turnId,
    soundAlertOnExpire,
  } = combatState;

  const nextCombatantIndex = (currentTurnIndex + 1) % combatants.length;

  // 1. Local sub-second countdown computed from absolute epoch (zero network polling)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    calculateRemainingTimerSeconds(combatState)
  );
  const expiredAudioRef = useRef<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = calculateRemainingTimerSeconds(combatState);
      setRemainingSeconds(remaining);

      // Deduplicated audio alert on expire: at most once per turnId
      if (remaining === 0 && isTimerRunning && soundAlertOnExpire !== false) {
        const currentTurnToken = turnId || `r${round}-t${currentTurnIndex}`;
        if (expiredAudioRef.current !== currentTurnToken) {
          expiredAudioRef.current = currentTurnToken;
          soundEngine.playSynth('timer_warning');
        }
      }
    };

    updateCountdown();

    if (!isTimerRunning) return;

    const interval = window.setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [
    isTimerRunning,
    turnTimerEndsAt,
    turnTimerRemainingSeconds,
    turnTimerSeconds,
    turnTimerTotalSeconds,
    turnId,
    round,
    currentTurnIndex,
    soundAlertOnExpire,
  ]);

  const getHealthDescriptor = (combatant: Combatant) => {
    if (combatant.currentHp <= 0) return { text: 'Inconsciente', class: 'hp-down' };
    const pct = combatant.currentHp / (combatant.maxHp || 1);
    if (pct > 0.75) return { text: 'Saludable', class: 'hp-healthy' };
    if (pct > 0.35) return { text: 'Herido', class: 'hp-wounded' };
    return { text: 'Grave', class: 'hp-critical' };
  };

  const isTimerVisible = showTurnTimerToPlayers !== false;
  const totalSeconds = turnTimerTotalSeconds || 60;
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const isExpired = remainingSeconds === 0;
  const isWarning = remainingSeconds <= 15 && !isExpired;

  const ringColor = isExpired
    ? '#ef4444'
    : isWarning
    ? '#f59e0b'
    : '#10b981';

  return (
    <div className="initiative-ribbon-container">
      <div className="initiative-ribbon-header">
        <div className="combat-badge">
          <Swords size={16} className="text-red-500 animate-pulse" />
          <span>ORDEN DE COMBATE</span>
        </div>

        <div className="round-badge">
          <span>RONDA {round}</span>
        </div>

        {/* Synchronized Player-facing Turn Timer with Luminescent Ring */}
        {isTimerVisible && (
          <div
            className={`display-turn-timer flex items-center gap-2 px-2.5 py-1 rounded-full border bg-slate-950/80 backdrop-blur-md transition-all ${
              isExpired
                ? 'border-red-500/70 shadow-lg shadow-red-950/50'
                : isWarning
                ? 'border-amber-500/60 shadow-lg shadow-amber-950/30'
                : 'border-slate-700/60'
            }`}
            aria-live="polite"
          >
            {/* Luminescent SVG Progress Ring */}
            <div className="relative w-7 h-7 flex items-center justify-center">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="2.5"
                  fill="transparent"
                />
                <circle
                  cx="16"
                  cy="16"
                  r={radius}
                  stroke={ringColor}
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-[stroke-dashoffset] duration-300 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isExpired ? (
                  <AlertTriangle size={12} className="text-red-400 animate-bounce" />
                ) : !isTimerRunning ? (
                  <Pause size={10} className="text-slate-400" />
                ) : (
                  <Clock size={11} className={isWarning ? 'text-amber-400' : 'text-emerald-400'} />
                )}
              </div>
            </div>

            {/* Time label and accessible text indicator */}
            <div className="flex flex-col leading-tight">
              <span
                className={`font-mono text-xs font-bold ${
                  isExpired
                    ? 'text-red-400'
                    : isWarning
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {remainingSeconds}s
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">
                {isExpired ? 'Tiempo Cumplido' : !isTimerRunning ? 'Pausado' : 'Turno'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="initiative-ribbon-track">
        {combatants.map((c, index) => {
          const isActive = index === currentTurnIndex;
          const isNext = index === nextCombatantIndex;
          const healthStatus = getHealthDescriptor(c);
          const hpPercent = Math.max(0, Math.min(100, (c.currentHp / (c.maxHp || 1)) * 100));

          return (
            <div
              key={c.id}
              className={`initiative-token ${isActive ? 'token-active' : ''} ${
                isNext ? 'token-next' : ''
              } ${c.currentHp <= 0 ? 'token-dead' : ''}`}
            >
              {/* Active Golden / Red Combat Radiance */}
              {isActive && <div className="active-turn-ring"></div>}

              {/* Avatar Frame */}
              <div className="token-avatar-frame">
                <img src={c.avatarUrl} alt={c.name} className="token-avatar-img" />
                <span className="token-init-badge">{c.initiative}</span>
                {isActive && <span className="turn-label">TURNO</span>}
                {isNext && <span className="next-label">SIGUIENTE</span>}
              </div>

              {/* Name & Health */}
              <div className="token-meta">
                <span className="token-name">{c.name}</span>

                {/* Health Bar or Textual Health Descriptor */}
                {c.showHpToPlayers ? (
                  <div className="token-hp-bar-container">
                    <div
                      className="token-hp-bar"
                      style={{
                        width: `${hpPercent}%`,
                        backgroundColor:
                          hpPercent > 50 ? '#10b981' : hpPercent > 25 ? '#f59e0b' : '#ef4444',
                      }}
                    ></div>
                  </div>
                ) : (
                  <span className={`token-status-pill ${healthStatus.class}`}>
                    {healthStatus.text}
                  </span>
                )}

                {/* Authorized Public Condition Badges with +N limit */}
                {(() => {
                  const publicConds = filterPublicConditions(c);
                  if (publicConds.length === 0) return null;

                  const MAX_VISIBLE = 3;
                  const visibleConds = publicConds.slice(0, MAX_VISIBLE);
                  const overflowCount = publicConds.length - MAX_VISIBLE;
                  const overflowTitles =
                    overflowCount > 0
                      ? publicConds
                          .slice(MAX_VISIBLE)
                          .map((cd) => cd.label)
                          .join(', ')
                      : '';

                  return (
                    <div className="token-conditions-row flex items-center gap-1 mt-1">
                      {visibleConds.map((cond) => (
                        <span
                          key={cond.id || cond.condition}
                          className="condition-icon inline-flex items-center justify-center text-[11px] px-1 py-0.5 rounded border bg-slate-900/90 shadow-sm"
                          title={`${cond.label}: ${cond.description}`}
                          style={{ borderColor: cond.color }}
                        >
                          <span>{cond.icon}</span>
                        </span>
                      ))}

                      {overflowCount > 0 && (
                        <span
                          className="condition-overflow-badge inline-flex items-center justify-center text-[9px] font-bold px-1 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300"
                          title={`Otras condiciones: ${overflowTitles}`}
                        >
                          +{overflowCount}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
