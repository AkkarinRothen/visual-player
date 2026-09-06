import React from 'react';
import { Swords, X } from 'lucide-react';

interface EncounterHeaderProps {
  onClose: () => void;
}

export const EncounterHeader: React.FC<EncounterHeaderProps> = ({ onClose }) => {
  return (
    <>
      <div className="modal-header">
        <div className="flex-align-gap">
          <Swords size={20} className="text-amber-400" />
          <h2>Biblioteca de Encuentros de Combate</h2>
        </div>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <p className="modal-subtitle">
        Plantillas inmutables de batallas tácticas con iniciativas calculables, oleadas de refuerzo y recompensas configurables.
      </p>
    </>
  );
};
