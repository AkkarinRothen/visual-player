import React from 'react';
import { Sparkles, X, Award, Copy } from 'lucide-react';
import type { VictorySummaryData } from './combatTypes';
import { writeClipboardText } from '../../../services/clipboardService';

export interface CombatVictoryModalProps {
  isOpen: boolean;
  summary: VictorySummaryData | null;
  onClose: () => void;
}

export const CombatVictoryModal: React.FC<CombatVictoryModalProps> = ({
  isOpen,
  summary,
  onClose,
}) => {
  if (!isOpen || !summary) return null;

  return (
    <div className="modal-overlay victory-modal-overlay" onClick={onClose}>
      <div className="modal-content victory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-align-gap">
            <Sparkles size={20} className="text-amber-400" />
            <h2>¡Victoria en Combate!</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="victory-summary-body">
          <div className="summary-stat-box">
            <span className="stat-num">{summary.rounds}</span>
            <span className="stat-label">Rondas de Batalla</span>
          </div>

          <div className="summary-details-section">
            <strong>💀 Enemigos Derrotados ({summary.defeatedMonsters.length}):</strong>
            <p>
              {summary.defeatedMonsters.length > 0
                ? summary.defeatedMonsters.join(', ')
                : 'Ningún enemigo caído.'}
            </p>

            <strong>🛡️ Supervivientes ({summary.survivors.length}):</strong>
            <p>
              {summary.survivors.length > 0
                ? summary.survivors.join(', ')
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
                    void writeClipboardText(summary.rewards);
                    alert('¡Recompensas copiadas al portapapeles!');
                  }}
                  title="Copiar recompensas"
                >
                  <Copy size={13} />
                  <span>Copiar</span>
                </button>
              </div>
              <p className="rewards-text">{summary.rewards}</p>
            </div>
          </div>
        </div>

        <button className="btn-primary full" onClick={onClose}>
          Cerrar Resumen
        </button>
      </div>
    </div>
  );
};
