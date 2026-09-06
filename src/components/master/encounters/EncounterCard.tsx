import React from 'react';
import { Play, Layers, Edit, Trash2, Award } from 'lucide-react';
import type { SavedEncounter } from '../../../types';
import type { EncounterCardProps } from './savedEncountersTypes';

export const getDifficultyBadge = (diff: SavedEncounter['difficulty']) => {
  switch (diff) {
    case 'facil':
      return <span className="diff-badge facil">FÁCIL</span>;
    case 'medio':
      return <span className="diff-badge medio">MEDIO</span>;
    case 'dificil':
      return <span className="diff-badge dificil">DIFÍCIL</span>;
    case 'letal':
      return <span className="diff-badge letal">LETAL 💀</span>;
  }
};

export const EncounterCard: React.FC<EncounterCardProps> = ({
  encounter,
  onLaunchLive,
  onLaunchStaging,
  onEdit,
  onDelete,
}) => {
  const activeCount = encounter.combatants.filter((c) => !c.isWaveReinforcement).length;
  const wavesCount = encounter.combatants.filter((c) => c.isWaveReinforcement).length;

  return (
    <div className="encounter-card">
      <div className="encounter-card-header">
        <div className="encounter-title-group">
          <strong>{encounter.name}</strong>
          {getDifficultyBadge(encounter.difficulty)}
        </div>
        <div className="encounter-meta-pills">
          <span className="meta-pill">{activeCount} iniciales</span>
          {wavesCount > 0 && <span className="meta-pill wave">+{wavesCount} refuerzos</span>}
        </div>
      </div>

      <p className="encounter-desc">{encounter.description}</p>

      {/* Combatants Avatars Row */}
      <div className="encounter-combatants-preview">
        {encounter.combatants.map((c) => (
          <div key={c.id} className="cbt-mini-thumb" title={`${c.name} (${c.maxHp} HP)`}>
            <img src={c.avatarUrl} alt={c.name} />
            {c.isWaveReinforcement && <span className="wave-mini-dot" title="Refuerzo">🌊</span>}
          </div>
        ))}
      </div>

      {encounter.rewardsSummary && (
        <div className="encounter-rewards-preview">
          <Award size={13} className="text-amber-400" />
          <span>{encounter.rewardsSummary}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="encounter-card-actions">
        <button
          className="btn-primary-sm launch-live-btn"
          onClick={() => onLaunchLive(encounter)}
          title="Tirar iniciativa e iniciar combate en vivo"
        >
          <Play size={14} />
          <span>⚔️ Iniciar Ahora</span>
        </button>

        <button
          className="btn-secondary-sm launch-staging-btn"
          onClick={() => onLaunchStaging(encounter)}
          title="Cargar en borrador de Preparación"
        >
          <Layers size={14} />
          <span>🛠️ Borrador</span>
        </button>

        <button
          className="icon-action-btn"
          onClick={() => onEdit(encounter)}
          title="Editar Encuentro"
        >
          <Edit size={16} />
        </button>

        <button
          className="icon-action-btn danger"
          onClick={() => onDelete(encounter.id, encounter.name)}
          title="Eliminar Encuentro"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
