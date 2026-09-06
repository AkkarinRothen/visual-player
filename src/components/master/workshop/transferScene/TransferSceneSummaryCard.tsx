import React from 'react';
import { Image as ImageIcon, Users } from 'lucide-react';
import type { Scene } from '../../../../types';

interface TransferSceneSummaryCardProps {
  scene: Scene;
  charactersCount: number;
}

export const TransferSceneSummaryCard: React.FC<TransferSceneSummaryCardProps> = ({
  scene,
  charactersCount,
}) => {
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '96px',
          height: '54px',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#090d16',
          flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {scene.backgroundUrl ? (
          <img
            src={scene.backgroundUrl}
            alt={scene.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <ImageIcon size={20} />
          </div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4
          style={{
            margin: '0 0 4px',
            fontSize: '0.95rem',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {scene.name}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={13} className="text-amber-400" />
            {charactersCount} {charactersCount === 1 ? 'figura' : 'figuras'}
          </span>
          {scene.ambientAudioUrl && (
            <span style={{ color: '#38bdf8' }}>• Con música ambiental</span>
          )}
        </div>
      </div>
    </div>
  );
};
