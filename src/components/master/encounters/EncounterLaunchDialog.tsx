import React from 'react';
import { X, Dices, Sparkles } from 'lucide-react';
import type { EncounterLaunchDialogProps } from './savedEncountersTypes';

export const EncounterLaunchDialog: React.FC<EncounterLaunchDialogProps> = ({
  resolvingEncounter,
  resolutionMode,
  combatantsWithInitiative,
  onReRollAllInitiatives,
  onUpdateInitiative,
  onConfirmLaunch,
  onCloseDialog,
}) => {
  return (
    <div className="modal-overlay launch-dialog-overlay" onClick={onCloseDialog}>
      <div className="modal-content launch-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {resolutionMode === 'live' ? '⚔️ Iniciar Combate' : '🛠️ Cargar en Borrador'}: {resolvingEncounter.name}
          </h2>
          <button className="modal-close" onClick={onCloseDialog}>
            <X size={20} />
          </button>
        </div>

        <div className="launch-dialog-body">
          <div className="launch-init-tools">
            <span>Orden de Iniciativa Calculado:</span>
            <button className="btn-secondary-sm" onClick={onReRollAllInitiatives}>
              <Dices size={14} />
              <span>Volver a Tirar d20</span>
            </button>
          </div>

          <div className="launch-combatants-list">
            {combatantsWithInitiative.map((c, idx) => (
              <div key={c.id} className={`launch-cbt-row ${c.isWaveReinforcement ? 'wave-row' : ''}`}>
                <img src={c.avatarUrl} alt={c.name} className="cbt-avatar" />
                <div className="cbt-info">
                  <strong>{c.name}</strong>
                  <span className="cbt-sub">
                    {c.maxHp} HP • {c.isMonster ? 'Monstruo' : 'Personaje'}
                    {c.isWaveReinforcement && ` • Refuerzo (Ronda ${c.triggerRound || 2})`}
                  </span>
                </div>
                <div className="cbt-init-input-group">
                  <label>Inic:</label>
                  <input
                    type="number"
                    value={c.initiative}
                    onChange={(e) => onUpdateInitiative(idx, parseInt(e.target.value) || 0)}
                    className="init-number-input"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="launch-dialog-footer">
          <button className="btn-secondary" onClick={onCloseDialog}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={onConfirmLaunch}>
            <Sparkles size={16} />
            <span>{resolutionMode === 'live' ? 'Desplegar Combate en Pantalla' : 'Montar en Preparación'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
