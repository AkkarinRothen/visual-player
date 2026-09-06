import React from 'react';
import { Heart, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { Combatant, CombatCondition } from '../../../types';
import { CONDITIONS_LIST } from './combatTypes';

export interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  onModifyHp: (id: string, delta: number) => void;
  onToggleHpVisibility: (id: string) => void;
  onToggleCondition: (id: string, condition: CombatCondition) => void;
  onRemoveCombatant: (id: string) => void;
}

export const CombatantCard: React.FC<CombatantCardProps> = ({
  combatant: c,
  isActive,
  onModifyHp,
  onToggleHpVisibility,
  onToggleCondition,
  onRemoveCombatant,
}) => {
  return (
    <div
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
              <button className="hp-btn" onClick={() => onModifyHp(c.id, -5)}>
                -5
              </button>
              <button className="hp-btn" onClick={() => onModifyHp(c.id, -1)}>
                -1
              </button>
              <button className="hp-btn plus" onClick={() => onModifyHp(c.id, 1)}>
                +1
              </button>
              <button className="hp-btn plus" onClick={() => onModifyHp(c.id, 5)}>
                +5
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="combatant-card-actions">
          <button
            className={`icon-toggle-btn ${c.showHpToPlayers ? 'on' : 'off'}`}
            onClick={() => onToggleHpVisibility(c.id)}
            title={c.showHpToPlayers ? 'HP visible en Tablet' : 'HP oculto a jugadores'}
          >
            {c.showHpToPlayers ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            className="delete-combatant-btn"
            onClick={() => onRemoveCombatant(c.id)}
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
              onClick={() => onToggleCondition(c.id, cond.id)}
              title={cond.label}
            >
              <span>{cond.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
