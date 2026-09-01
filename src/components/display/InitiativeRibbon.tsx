import React from 'react';
import type { CombatCondition, CombatState, Combatant } from '../../types';
import { Swords, Clock } from 'lucide-react';

interface InitiativeRibbonProps {
  combatState: CombatState;
}

const CONDITION_ICONS: Record<CombatCondition, { label: string; icon: string; color: string }> = {
  burning: { label: 'En Llamas', icon: '🔥', color: '#f97316' },
  poisoned: { label: 'Envenenado', icon: '☠️', color: '#22c55e' },
  stunned: { label: 'Aturdido', icon: '⚡', color: '#eab308' },
  blinded: { label: 'Ciego', icon: '👁️‍🗨️', color: '#94a3b8' },
  paralyzed: { label: 'Paralizado', icon: '🧊', color: '#06b6d4' },
  invisible: { label: 'Invisible', icon: '👻', color: '#a855f7' },
  concentrating: { label: 'Concentración', icon: '🌀', color: '#3b82f6' },
  blessed: { label: 'Bendito', icon: '✨', color: '#fbbf24' },
  cursed: { label: 'Maldito', icon: '🩸', color: '#ef4444' },
  frightened: { label: 'Asustado', icon: '😱', color: '#f43f5e' },
};

export const InitiativeRibbon: React.FC<InitiativeRibbonProps> = ({ combatState }) => {
  if (!combatState.isActive || combatState.combatants.length === 0) {
    return null;
  }

  const { round, currentTurnIndex, combatants, turnTimerSeconds, showTurnTimerToPlayers } = combatState;
  const nextCombatantIndex = (currentTurnIndex + 1) % combatants.length;

  const getHealthDescriptor = (combatant: Combatant) => {
    if (combatant.currentHp <= 0) return { text: 'Inconsciente', class: 'hp-down' };
    const pct = combatant.currentHp / (combatant.maxHp || 1);
    if (pct > 0.75) return { text: 'Saludable', class: 'hp-healthy' };
    if (pct > 0.35) return { text: 'Herido', class: 'hp-wounded' };
    return { text: 'Grave', class: 'hp-critical' };
  };

  const isTimerVisible = showTurnTimerToPlayers !== false && turnTimerSeconds !== undefined && turnTimerSeconds >= 0;
  const timerClass =
    turnTimerSeconds !== undefined && turnTimerSeconds <= 5
      ? 'timer-danger-pulse'
      : turnTimerSeconds !== undefined && turnTimerSeconds <= 15
      ? 'timer-warning'
      : 'timer-normal';

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

        {/* Synchronized Player-facing Turn Timer */}
        {isTimerVisible && (
          <div className={`display-turn-timer ${timerClass}`}>
            <Clock size={14} />
            <span>{turnTimerSeconds}s</span>
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

                {/* Condition Badges */}
                {c.conditions && c.conditions.length > 0 && (
                  <div className="token-conditions-row">
                    {c.conditions.map((cond) => {
                      const meta = CONDITION_ICONS[cond];
                      return (
                        <span
                          key={cond}
                          className="condition-icon"
                          title={meta?.label || cond}
                          style={{ borderColor: meta?.color }}
                        >
                          {meta?.icon || '•'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
