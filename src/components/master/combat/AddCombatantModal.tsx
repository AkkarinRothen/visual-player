import React from 'react';
import { X } from 'lucide-react';
import type { NewCombatantFormData } from './combatTypes';

export interface AddCombatantModalProps {
  isOpen: boolean;
  formData: NewCombatantFormData;
  onFormDataChange: (data: NewCombatantFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const AddCombatantModal: React.FC<AddCombatantModalProps> = ({
  isOpen,
  formData,
  onFormDataChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Agregar Combatiente</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="modal-form">
          <label>Nombre del Monstruo / PNJ</label>
          <input
            type="text"
            required
            placeholder="Ej. Líder Orco"
            value={formData.name}
            onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            className="master-input"
          />

          <label>Iniciativa</label>
          <input
            type="number"
            value={formData.initiative}
            onChange={(e) =>
              onFormDataChange({ ...formData, initiative: parseInt(e.target.value) || 0 })
            }
            className="master-input"
          />

          <label>Puntos de Golpe Máximos (HP)</label>
          <input
            type="number"
            value={formData.hp}
            onChange={(e) =>
              onFormDataChange({ ...formData, hp: parseInt(e.target.value) || 1 })
            }
            className="master-input"
          />

          <label>URL del Retrato</label>
          <input
            type="text"
            value={formData.avatarUrl}
            onChange={(e) => onFormDataChange({ ...formData, avatarUrl: e.target.value })}
            className="master-input"
          />

          <button type="submit" className="btn-primary full">
            Agregar al Encuentro
          </button>
        </form>
      </div>
    </div>
  );
};
