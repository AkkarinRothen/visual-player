import React from 'react';
import { Send, X } from 'lucide-react';

interface TransferSceneHeaderProps {
  campaignTitle: string;
  onClose: () => void;
}

export const TransferSceneHeader: React.FC<TransferSceneHeaderProps> = ({
  campaignTitle,
  onClose,
}) => {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
          }}
        >
          <Send size={18} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>
            Llevar Escena a Preparación
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Campaña: <strong>{campaignTitle}</strong>
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
        }}
        aria-label="Cerrar modal"
      >
        <X size={20} />
      </button>
    </div>
  );
};
