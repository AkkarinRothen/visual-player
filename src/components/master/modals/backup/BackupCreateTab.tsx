import React from 'react';
import { HardDrive, Download, CheckCircle2 } from 'lucide-react';
import type { BackupCreateTabProps } from './backupManagerTypes';

export const BackupCreateTab: React.FC<BackupCreateTabProps> = ({
  campaignCount,
  assetCount,
  isGenerating,
  createdFileName,
  onExportBackup,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <HardDrive size={20} className="text-amber-400" />
          <strong style={{ fontSize: '0.95rem' }}>Datos en este dispositivo</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Campañas</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6' }}>{campaignCount}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Recursos Multimedia</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6' }}>{assetCount}</div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
        El archivo <code>.vpbackup</code> empaqueta todas tus campañas, escenas, personajes, presets y sus
        imágenes optimizadas deduplicadas. No requiere ADB ni cables.
      </p>

      {createdFileName && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#6ee7b7',
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Respaldo creado:</strong> {createdFileName}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onExportBackup}
        disabled={isGenerating || campaignCount === 0}
        style={{
          padding: '14px',
          background: 'linear-gradient(135deg, #d97706, #b45309)',
          border: 'none',
          borderRadius: '10px',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: isGenerating || campaignCount === 0 ? 'not-allowed' : 'pointer',
          opacity: campaignCount === 0 ? 0.5 : 1,
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
          marginTop: '6px',
        }}
      >
        <Download size={18} />
        <span>{isGenerating ? 'Empaquetando respaldo...' : 'Exportar Copia .vpbackup'}</span>
      </button>
    </div>
  );
};
