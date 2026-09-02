import React, { useState } from 'react';
import { X, Plus, Copy, Trash2, Check } from 'lucide-react';
import type { Campaign } from '../../../types';

interface CampaignPickerModalProps {
  isOpen: boolean;
  campaigns: Campaign[];
  activeCampaignId?: string;
  onSelectCampaign: (camp: Campaign) => void;
  onCreateCampaign: (title: string, description: string) => void;
  onDuplicateCampaign: (campId: string) => void;
  onDeleteCampaign: (campId: string) => void;
  onClose: () => void;
}

export const CampaignPickerModal: React.FC<CampaignPickerModalProps> = ({
  isOpen,
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  onCreateCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
  onClose,
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateCampaign(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setShowNewModal(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content campaign-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Tus Campañas & Aventuras</h2>
          <div className="flex-gap">
            <button className="btn-secondary small" onClick={() => setShowNewModal(true)}>
              <Plus size={16} />
              <span>Nueva Campaña</span>
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {showNewModal && (
          <form onSubmit={handleCreateSubmit} className="master-form new-campaign-inline-form">
            <h3>Crear Nueva Aventura</h3>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título de la Campaña (ej: Las Minas Olvidadas)"
              className="master-input"
            />
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Breve descripción de la aventura..."
              className="master-input textarea"
            />
            <div className="flex-gap">
              <button type="button" className="btn-secondary flex-1" onClick={() => setShowNewModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1">
                Crear Aventura
              </button>
            </div>
          </form>
        )}

        <div className="campaign-list-grid">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className={`campaign-card ${camp.id === activeCampaignId ? 'active' : ''}`}
              onClick={() => {
                onSelectCampaign(camp);
                onClose();
              }}
            >
              <div className="campaign-card-header">
                <h3>{camp.title}</h3>
                {camp.id === activeCampaignId && (
                  <span className="badge-active">
                    <Check size={14} /> Activa
                  </span>
                )}
              </div>
              <p className="campaign-desc">{camp.description || 'Sin descripción'}</p>
              <div className="campaign-stats">
                <span>{camp.scenes.length} Escenas</span> • <span>{camp.characters.length} NPCs</span> • <span>{camp.macros?.length || 0} Momentos</span>
              </div>
              <div className="campaign-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="icon-btn-small"
                  title="Duplicar Campaña"
                  onClick={() => onDuplicateCampaign(camp.id)}
                >
                  <Copy size={14} />
                </button>
                {campaigns.length > 1 && (
                  <button
                    className="icon-btn-small danger"
                    title="Eliminar Campaña"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar "${camp.title}"?`)) {
                        onDeleteCampaign(camp.id);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
