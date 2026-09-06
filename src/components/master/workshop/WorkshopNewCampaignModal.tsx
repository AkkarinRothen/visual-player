import React from 'react';

export interface WorkshopNewCampaignModalProps {
  isOpen: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  onCreateCampaign: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const WorkshopNewCampaignModal: React.FC<WorkshopNewCampaignModalProps> = ({
  isOpen,
  title,
  onTitleChange,
  onCreateCampaign,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Crear Nueva Campaña</h3>
        <form onSubmit={onCreateCampaign}>
          <input
            type="text"
            required
            placeholder="Nombre de la Campaña"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              marginBottom: '16px',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '8px',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 18px',
                background: '#d97706',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
