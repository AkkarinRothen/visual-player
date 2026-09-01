import React from 'react';
import type { CinematicMacro } from '../../types';
import { Sparkles, Play, Layers, X, Clock } from 'lucide-react';

interface QuickMomentsDropdownProps {
  macros: CinematicMacro[];
  onExecuteMacro: (macro: CinematicMacro) => void;
  onLoadMacroToStaging: (macro: CinematicMacro) => void;
  onClose: () => void;
}

export const QuickMomentsDropdown: React.FC<QuickMomentsDropdownProps> = ({
  macros,
  onExecuteMacro,
  onLoadMacroToStaging,
  onClose,
}) => {
  return (
    <div className="modal-overlay quick-moments-overlay" onClick={onClose}>
      <div className="quick-moments-card" onClick={(e) => e.stopPropagation()}>
        <div className="quick-moments-header">
          <div className="flex-align-gap">
            <Sparkles size={18} className="text-amber-400" />
            <h3>Disparador Rápido de Momentos</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="quick-moments-list">
          {macros.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              No hay macros creadas. Ve a la pestaña "Momentos" para crearlas.
            </p>
          ) : (
            macros.map((m) => {
              const totalDurationSec = (
                m.steps.reduce((acc, s) => acc + (s.delayMs || 0), 0) / 1000
              ).toFixed(1);

              return (
                <div key={m.id} className="quick-moment-item">
                  <div className="quick-moment-info">
                    <div className="quick-moment-title-row">
                      <strong>{m.name}</strong>
                      <span className="quick-moment-duration">
                        <Clock size={11} /> {totalDurationSec}s
                      </span>
                    </div>
                    <p className="quick-moment-desc">{m.description}</p>
                  </div>

                  <div className="quick-moment-actions">
                    <button
                      className="btn-primary-sm run-btn"
                      onClick={() => {
                        onExecuteMacro(m);
                        onClose();
                      }}
                      title="Ejecutar en vivo"
                    >
                      <Play size={13} />
                      <span>Ejecutar</span>
                    </button>

                    <button
                      className="icon-action-btn"
                      onClick={() => {
                        onLoadMacroToStaging(m);
                        onClose();
                      }}
                      title="Cargar en borrador de Preparación"
                    >
                      <Layers size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
