import React from 'react';
import { Move, Hand, Maximize2, Swords, MessageCircle, Map } from 'lucide-react';
import type { TouchMode } from './composerTypes';
import type { SceneLayoutTemplate } from '../../../domain/display/sceneLayoutTemplates';

export interface ComposerTouchModeBarProps {
  touchMode: TouchMode;
  setTouchMode: (mode: TouchMode) => void;
  onSelectTemplate?: (template: SceneLayoutTemplate) => void;
}

export const ComposerTouchModeBar: React.FC<ComposerTouchModeBarProps> = ({
  touchMode,
  setTouchMode,
  onSelectTemplate,
}) => {
  return (
    <div
      style={{
        background: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: 80,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {onSelectTemplate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', marginRight: '2px' }}>Plantillas:</span>
          <button
            type="button"
            onClick={() => onSelectTemplate('jrpg-battle')}
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Plantilla Batalla JRPG: bandos enfrentados y globos"
          >
            <Swords size={12} />
            <span>JRPG</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTemplate('visual-novel')}
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Plantilla Novela Visual: figuras destacadas en primer plano"
          >
            <MessageCircle size={12} />
            <span>Diálogo</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTemplate('tactical-map')}
            style={{
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Plantilla Mapa Táctico: miniaturas en cuadrícula"
          >
            <Map size={12} />
            <span>Mapa</span>
          </button>
        </div>
      )}
    </div>
  );
};
