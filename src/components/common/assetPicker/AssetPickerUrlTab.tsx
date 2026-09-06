import React from 'react';
import { Check } from 'lucide-react';
import type { AssetPickerUrlTabProps } from './assetPickerTypes';

export const AssetPickerUrlTab: React.FC<AssetPickerUrlTabProps> = ({
  customUrlInput,
  setCustomUrlInput,
  assetName,
  setAssetName,
  isProcessing,
  onConfirmUrl,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
          URL de la imagen o video web
        </label>
        <input
          type="url"
          value={customUrlInput}
          onChange={(e) => setCustomUrlInput(e.target.value)}
          placeholder="https://ejemplo.com/fondo.jpg o video.mp4"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
          Nombre descriptivo
        </label>
        <input
          type="text"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          placeholder="ej: Bosque Sombrío"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onConfirmUrl}
        disabled={!customUrlInput.trim() || isProcessing}
        style={{
          padding: '12px',
          background: customUrlInput.trim() ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: '10px',
          color: customUrlInput.trim() ? '#fff' : '#6b7280',
          fontWeight: 600,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: customUrlInput.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        <Check size={18} />
        <span>Usar Enlace</span>
      </button>
    </div>
  );
};
