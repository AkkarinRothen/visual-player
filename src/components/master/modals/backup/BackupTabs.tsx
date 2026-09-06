import React from 'react';
import { Download, Upload } from 'lucide-react';
import type { BackupTabsProps } from './backupManagerTypes';

export const BackupTabs: React.FC<BackupTabsProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <button
        type="button"
        onClick={() => onSelectTab('create')}
        style={{
          flex: 1,
          padding: '12px',
          border: 'none',
          background: activeTab === 'create' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
          borderBottom: activeTab === 'create' ? '2px solid #f59e0b' : 'none',
          color: activeTab === 'create' ? '#fbbf24' : '#94a3b8',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <Download size={16} />
        <span>Crear Respaldo</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('restore')}
        style={{
          flex: 1,
          padding: '12px',
          border: 'none',
          background: activeTab === 'restore' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
          borderBottom: activeTab === 'restore' ? '2px solid #f59e0b' : 'none',
          color: activeTab === 'restore' ? '#fbbf24' : '#94a3b8',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <Upload size={16} />
        <span>Restaurar Copia</span>
      </button>
    </div>
  );
};
