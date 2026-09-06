import React from 'react';
import { FolderArchive, X } from 'lucide-react';
import type { BackupHeaderProps } from './backupManagerTypes';

export const BackupHeader: React.FC<BackupHeaderProps> = ({ onClose }) => {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FolderArchive size={22} className="text-amber-400" />
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
          Respaldos de Campañas (.vpbackup)
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar modal de respaldos"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
        }}
      >
        <X size={20} />
      </button>
    </div>
  );
};
