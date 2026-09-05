import React from 'react';
import {
  FlipHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Minus,
  Plus,
  MessageSquare,
} from 'lucide-react';
import type { CharacterOnScreen, ShadowPreset } from '../../../types';
import { type DpadPreset, getDpadDeltas } from './composerTypes';

interface ComposerSelectedCharPanelProps {
  selectedChar: CharacterOnScreen;
  dpadPreset: DpadPreset;
  setDpadPreset: (preset: DpadPreset) => void;
  onToggleMirror: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onRemoveCharacter: (id: string) => void;
  onCloseSelection: () => void;
  onScaleChange: (id: string, delta: number) => void;
  onNudge: (id: string, deltaX: number, deltaY: number) => void;
  onOpenQuickDialogue?: () => void;
  onChangeShadowPreset?: (id: string, preset: ShadowPreset) => void;
}

export const ComposerSelectedCharPanel: React.FC<ComposerSelectedCharPanelProps> = ({
  selectedChar,
  dpadPreset,
  setDpadPreset,
  onToggleMirror,
  onMoveLayer,
  onRemoveCharacter,
  onCloseSelection,
  onScaleChange,
  onNudge,
  onOpenQuickDialogue,
  onChangeShadowPreset,
}) => {
  const deltas = getDpadDeltas(dpadPreset);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Cabecera compacta de la figura */}
      <div
        style={{
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.08)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <img
            src={selectedChar.avatarUrl}
            alt=""
            style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #fbbf24', flexShrink: 0 }}
          />
          <strong style={{ fontSize: '0.88rem', color: '#fbbf24', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedChar.name}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onOpenQuickDialogue && (
            <button
              type="button"
              onClick={onOpenQuickDialogue}
              style={{
                background: 'rgba(56, 189, 248, 0.18)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
              title="Hacer hablar a la figura con globo JRPG o novela visual"
            >
              <MessageSquare size={13} />
              <span>Hablar…</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleMirror(selectedChar.id)}
            style={{
              background: selectedChar.isFlipped ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: selectedChar.isFlipped ? '#fbbf24' : '#cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Reflejo horizontal (espejo)"
          >
            <FlipHorizontal size={13} />
            <span>Espejo</span>
          </button>

          <button
            type="button"
            onClick={() => onMoveLayer(selectedChar.id, 'down')}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '4px 6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            title="Capa hacia atrás"
          >
            <ChevronDown size={14} />
            <span>Atrás</span>
          </button>

          <button
            type="button"
            onClick={() => onMoveLayer(selectedChar.id, 'up')}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '4px 6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            title="Capa hacia adelante"
          >
            <ChevronUp size={14} />
            <span>Adelante</span>
          </button>

          <button
            type="button"
            onClick={() => onRemoveCharacter(selectedChar.id)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '6px',
              padding: '4px 6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            title="Retirar de la escena"
          >
            <Trash2 size={13} />
            <span>Retirar</span>
          </button>

          <button
            type="button"
            onClick={onCloseSelection}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            title="Cerrar ajustes y volver a las herramientas"
          >
            <Check size={13} />
            <span>Volver a herramientas</span>
          </button>
        </div>
      </div>

      {/* Ajustes de Escala y Cruceta D-Pad */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '6px 12px',
          gap: '16px',
        }}
      >
        {/* Sección Tamaño / Escala */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tamaño:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onScaleChange(selectedChar.id, -0.05)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              <Minus size={14} />
            </button>

            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', minWidth: '44px', textAlign: 'center' }}>
              {Math.round((selectedChar.scale ?? 1) * 100)}%
            </span>

            <button
              type="button"
              onClick={() => onScaleChange(selectedChar.id, 0.05)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Selector de Sombra de Suelo */}
        {onChangeShadowPreset && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sombra suelo:</span>
            <button
              type="button"
              onClick={() => {
                const current = selectedChar.shadowPreset ?? 'soft-ellipse';
                const next: ShadowPreset =
                  current === 'soft-ellipse' ? 'elongated' : current === 'elongated' ? 'none' : 'soft-ellipse';
                onChangeShadowPreset(selectedChar.id, next);
              }}
              style={{
                background: (selectedChar.shadowPreset ?? 'soft-ellipse') !== 'none' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid',
                borderColor: (selectedChar.shadowPreset ?? 'soft-ellipse') !== 'none' ? '#fbbf24' : 'rgba(255, 255, 255, 0.12)',
                color: (selectedChar.shadowPreset ?? 'soft-ellipse') !== 'none' ? '#fbbf24' : '#64748b',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Alternar entre elipse suave, sombra alargada y ninguna"
            >
              {(selectedChar.shadowPreset ?? 'soft-ellipse') === 'soft-ellipse'
                ? 'Elipse suave'
                : selectedChar.shadowPreset === 'elongated'
                ? 'Alargada'
                : 'Ninguna'}
            </button>
          </div>
        )}

        {/* Sección D-Pad con pasos Fino (1px), Normal (5px) y Amplio (20px) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Paso D-Pad:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setDpadPreset('fine')}
                style={{
                  background: dpadPreset === 'fine' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                  border: dpadPreset === 'fine' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                  color: dpadPreset === 'fine' ? '#fbbf24' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Fino (1px)
              </button>
              <button
                type="button"
                onClick={() => setDpadPreset('normal')}
                style={{
                  background: dpadPreset === 'normal' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                  border: dpadPreset === 'normal' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                  color: dpadPreset === 'normal' ? '#fbbf24' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Normal (5px)
              </button>
              <button
                type="button"
                onClick={() => setDpadPreset('coarse')}
                style={{
                  background: dpadPreset === 'coarse' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)',
                  border: dpadPreset === 'coarse' ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                  color: dpadPreset === 'coarse' ? '#fbbf24' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Amplio (20px)
              </button>
            </div>
          </div>

          {/* Botones de la Cruceta */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 34px)',
              gridTemplateRows: 'repeat(2, 34px)',
              gap: '3px',
              alignItems: 'center',
              justifyItems: 'center',
            }}
          >
            <div />
            <button
              type="button"
              onClick={() => onNudge(selectedChar.id, 0, -deltas.dy)}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Subir figura"
            >
              <ChevronUp size={18} />
            </button>
            <div />

            <button
              type="button"
              onClick={() => onNudge(selectedChar.id, -deltas.dx, 0)}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Izquierda"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => onNudge(selectedChar.id, 0, deltas.dy)}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Bajar figura"
            >
              <ChevronDown size={18} />
            </button>

            <button
              type="button"
              onClick={() => onNudge(selectedChar.id, deltas.dx, 0)}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Derecha"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
