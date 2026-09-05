import React from 'react';
import { Move, Hand, Maximize2 } from 'lucide-react';
import type { TouchMode } from './composerTypes';

export interface ComposerTouchModeBarProps {
  touchMode: TouchMode;
  setTouchMode: (mode: TouchMode) => void;
}

export const ComposerTouchModeBar: React.FC<ComposerTouchModeBarProps> = ({
  touchMode,
  setTouchMode,
}) => {
  return (
    <div
      style={{
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        zIndex: 80,
      }}
    >
      <button
        type="button"
        onClick={() => setTouchMode('characters')}
        style={{
          background: touchMode === 'characters' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
          border: touchMode === 'characters' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
          color: touchMode === 'characters' ? '#fbbf24' : '#94a3b8',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
        }}
      >
        <Move size={14} />
        <span>Mover Figuras</span>
      </button>

      <button
        type="button"
        onClick={() => setTouchMode('viewport')}
        style={{
          background: touchMode === 'viewport' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
          border: touchMode === 'viewport' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
          color: touchMode === 'viewport' ? '#38bdf8' : '#94a3b8',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
        }}
      >
        <Hand size={14} />
        <span>Desplazar Vista</span>
      </button>

      <button
        type="button"
        onClick={() => setTouchMode('background')}
        style={{
          background: touchMode === 'background' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.04)',
          border: touchMode === 'background' ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
          color: touchMode === 'background' ? '#c084fc' : '#94a3b8',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
        }}
      >
        <Maximize2 size={14} />
        <span>Ajustar Fondo</span>
      </button>
    </div>
  );
};
