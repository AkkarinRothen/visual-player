import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import type { Character } from '../../../types';

interface SummonCharacterModalProps {
  isOpen: boolean;
  characters: Character[];
  onSummon: (char: Character) => void;
  onClose: () => void;
}

export const SummonCharacterModal: React.FC<SummonCharacterModalProps> = ({
  isOpen,
  characters,
  onSummon,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invocar Personaje a la Escena</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="summon-roster">
          {characters.map((ch) => (
            <div
              key={ch.id}
              className="roster-card"
              onClick={() => {
                onSummon(ch);
                onClose();
              }}
            >
              <img src={ch.defaultAvatarUrl} alt={ch.name} className="roster-avatar" />
              <div className="roster-meta">
                <strong>{ch.name}</strong>
                <span>{ch.roleOrTitle}</span>
              </div>
              <ChevronRight size={18} className="text-amber-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
