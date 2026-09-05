import React from 'react';
import type { CharacterOnScreen, LightingFilter } from '../../../types';
import type { TouchMode } from './composerTypes';
import { Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface ComposerViewportProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  touchMode: TouchMode;
  editorPan: { x: number; y: number };
  editorZoom: number;
  setEditorPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setEditorZoom: React.Dispatch<React.SetStateAction<number>>;
  bgOffset: { x: number; y: number };
  setBgOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isDragging: boolean;
  backgroundUrl: string;
  lighting: LightingFilter;
  locationBanner: string;
  characters: CharacterOnScreen[];
  selectedCharId: string | null;
  onOpenBackgroundPicker: () => void;
  onCanvasTouchStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onCanvasTouchMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onFigureTouchStart: (charId: string, e: React.MouseEvent | React.TouchEvent) => void;
}

export const ComposerViewport: React.FC<ComposerViewportProps> = ({
  canvasRef,
  touchMode,
  editorPan,
  editorZoom,
  setEditorPan,
  setEditorZoom,
  bgOffset,
  setBgOffset,
  isDragging,
  backgroundUrl,
  lighting,
  locationBanner,
  characters,
  selectedCharId,
  onOpenBackgroundPicker,
  onCanvasTouchStart,
  onCanvasTouchMove,
  onFigureTouchStart,
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#04070c',
        padding: '8px',
        overflow: 'hidden',
        position: 'relative',
        cursor: touchMode === 'viewport' ? 'grab' : touchMode === 'background' ? 'crosshair' : 'default',
      }}
      onMouseDown={onCanvasTouchStart}
      onTouchStart={onCanvasTouchStart}
      onMouseMove={onCanvasTouchMove}
      onTouchMove={onCanvasTouchMove}
    >
      {/* Contenedor estricto 16:9 */}
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1000px',
          aspectRatio: '16/9',
          maxHeight: '100%',
          background: '#0a0f18',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          transform: `translate(${editorPan.x}px, ${editorPan.y}px) scale(${editorZoom})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Fondo de Escena con ajuste en modo background */}
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt="Fondo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              transform: `translate(${bgOffset.x}px, ${bgOffset.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenBackgroundPicker();
            }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              gap: '12px',
              color: '#94a3b8',
            }}
          >
            <ImageIcon size={48} className="text-amber-400" />
            <strong>Toca aquí para elegir el Fondo de la Escena</strong>
            <span style={{ fontSize: '0.85rem' }}>Acepta fotos de tu dispositivo o de tu biblioteca</span>
          </div>
        )}

        {/* Filtros ambientales visuales */}
        {lighting === 'night' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.65)', mixBlendMode: 'multiply', pointerEvents: 'none' }} />
        )}
        {lighting === 'sunset' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(249, 115, 22, 0.35)', mixBlendMode: 'color', pointerEvents: 'none' }} />
        )}
        {lighting === 'blood_moon' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(185, 28, 28, 0.45)', mixBlendMode: 'multiply', pointerEvents: 'none' }} />
        )}

        {/* Banner indicador de ubicación */}
        {locationBanner && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              padding: '4px 16px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              pointerEvents: 'none',
            }}
          >
            {locationBanner}
          </div>
        )}

        {/* Personajes sobre el lienzo */}
        {characters.map((char, index) => {
          const isSelected = char.id === selectedCharId;
          const x = (char.normalizedX ?? 0.5) * 100;
          const y = (char.normalizedY ?? 0.75) * 100;
          const scale = char.scale ?? 1;

          return (
            <div
              key={char.id}
              onMouseDown={(e) => onFigureTouchStart(char.id, e)}
              onTouchStart={(e) => onFigureTouchStart(char.id, e)}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -100%) scale(${scale}) ${char.isFlipped ? 'scaleX(-1)' : ''}`,
                transformOrigin: 'bottom center',
                cursor: touchMode === 'characters' ? 'grab' : 'default',
                zIndex: 10 + index,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Indicador de selección */}
              {isSelected && touchMode === 'characters' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-6px',
                    border: '2px solid #fbbf24',
                    borderRadius: '12px',
                    boxShadow: '0 0 16px rgba(245, 158, 11, 0.6)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              <img
                src={char.avatarUrl}
                alt={char.name}
                style={{
                  maxHeight: '160px',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  filter: isSelected && touchMode === 'characters' ? 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.5))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
                  pointerEvents: 'none',
                }}
              />

              <span
                style={{
                  marginTop: '4px',
                  background: 'rgba(0,0,0,0.75)',
                  color: isSelected && touchMode === 'characters' ? '#fbbf24' : '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  transform: char.isFlipped ? 'scaleX(-1)' : 'none',
                }}
              >
                {char.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Indicador y ayuda contextual para modo Viewport */}
      {touchMode === 'viewport' && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '10px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem',
            color: '#bae6fd',
            zIndex: 95,
          }}
        >
          <span>Desplaza con el dedo para ver detalles</span>
          <button
            type="button"
            onClick={() => {
              setEditorPan({ x: 0, y: 0 });
              setEditorZoom(1);
            }}
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              border: 'none',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ajustar a la vista
          </button>
        </div>
      )}

      {/* Indicador y ayuda contextual para modo Background */}
      {touchMode === 'background' && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '10px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.8rem',
            color: '#e9d5ff',
            zIndex: 95,
          }}
        >
          <span>Arrastra para re-encuadrar el fondo 16:9</span>
          <button
            type="button"
            onClick={() => setBgOffset({ x: 0, y: 0 })}
            style={{
              background: 'rgba(168, 85, 247, 0.2)',
              border: 'none',
              color: '#c084fc',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Restablecer fondo
          </button>
        </div>
      )}

      {/* Controles de Zoom del Editor */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 90,
        }}
      >
        <button
          type="button"
          onClick={() => setEditorZoom((z) => Math.max(0.7, z - 0.1))}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
          title="Reducir vista"
        >
          <ZoomOut size={16} />
        </button>
        <span style={{ fontSize: '0.75rem', color: '#cbd5e1', minWidth: '38px', textAlign: 'center' }}>
          {Math.round(editorZoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setEditorZoom((z) => Math.min(1.8, z + 0.1))}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
          title="Ampliar vista"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => setEditorZoom(1)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
          title="Restablecer vista"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
