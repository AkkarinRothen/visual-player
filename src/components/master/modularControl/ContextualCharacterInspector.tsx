import React from 'react';
import {
  X,
  Eye,
  EyeOff,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FlipHorizontal,
  Trash2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import type { Character, CharacterOnScreen } from '../../../types';

export interface ContextualCharacterInspectorProps {
  character: CharacterOnScreen;
  campaignCharacters?: Character[];
  onClose: () => void;
  onToggleVisibility: (id: string, currentlyHidden: boolean) => void;
  onScaleChange: (id: string, delta: number) => void;
  onLayerChange: (id: string, direction: 'up' | 'down') => void;
  onToggleMirror: (id: string) => void;
  onOpenQuickDialogue?: () => void;
  onDismissCharacter?: (id: string) => void;
}

export const ContextualCharacterInspector: React.FC<ContextualCharacterInspectorProps> = ({
  character,
  campaignCharacters = [],
  onClose,
  onToggleVisibility,
  onScaleChange,
  onLayerChange,
  onToggleMirror,
  onOpenQuickDialogue,
  onDismissCharacter,
}) => {
  const meta = campaignCharacters.find(
    (c) => c.id === character.characterId || c.name === character.name
  );
  const roleSubtitle = meta?.roleOrTitle || 'Personaje en escena';

  const isVisible = !character.isHidden;
  const currentScale = character.scale || 1.0;
  const currentLayer = character.zIndex || 1;

  const getScaleLabel = (scale: number): string => {
    if (scale <= 0.75) return 'Pequeño';
    if (scale >= 1.35) return 'Grande';
    return 'Mediano';
  };

  return (
    <div className="modular-control-scroll-area">
      <section className="modular-inspector-panel" aria-label={`Inspector de ${character.name}`}>
        {/* Cabecera del Inspector */}
        <div className="modular-inspector-header">
          <div className="modular-inspector-avatar-group">
            <div className="modular-inspector-avatar-wrap">
              <img
                src={character.avatarUrl}
                alt=""
                className="modular-inspector-avatar"
              />
              <span className="modular-inspector-avatar-indicator" />
            </div>
            <div className="modular-inspector-meta">
              <span className="modular-inspector-name">{character.name}</span>
              <span className="modular-inspector-sub">{roleSubtitle}</span>
            </div>
          </div>

          <div className="modular-inspector-header-actions">
            <button
              type="button"
              className="modular-inspector-close-btn"
              onClick={onClose}
              title="Cerrar inspector y volver al panel modular"
              aria-label="Cerrar inspector"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 1. Visibilidad en mesa */}
        <div className="modular-inspector-visibility-row">
          <span className="modular-inspector-vis-label">
            {isVisible ? (
              <Eye size={18} style={{ color: '#fbbf24' }} />
            ) : (
              <EyeOff size={18} style={{ color: '#94a3b8' }} />
            )}
            <span>Visible en mesa</span>
          </span>

          <label className="modular-switch" title={isVisible ? 'Ocultar de la mesa' : 'Hacer visible en la mesa'}>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={() => onToggleVisibility(character.id, !!character.isHidden)}
            />
            <span className="modular-switch-slider" />
          </label>
        </div>

        {/* 2. Tamaño y Capa en cuadrícula */}
        <div className="modular-inspector-controls-grid">
          {/* Stepper Tamaño */}
          <div className="modular-inspector-stepper-box">
            <span className="modular-inspector-stepper-label">
              <Sparkles size={13} style={{ color: '#38bdf8' }} />
              <span>Tamaño</span>
            </span>
            <div className="modular-inspector-stepper-controls">
              <button
                type="button"
                className="modular-stepper-btn"
                onClick={() => onScaleChange(character.id, -0.1)}
                title="Reducir tamaño"
                aria-label="Reducir tamaño"
              >
                <Minus size={15} />
              </button>
              <span className="modular-stepper-val" title={`${Math.round(currentScale * 100)}%`}>
                {getScaleLabel(currentScale)}
              </span>
              <button
                type="button"
                className="modular-stepper-btn"
                onClick={() => onScaleChange(character.id, 0.1)}
                title="Aumentar tamaño"
                aria-label="Aumentar tamaño"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {/* Stepper Capa / Orden */}
          <div className="modular-inspector-stepper-box">
            <span className="modular-inspector-stepper-label">
              <span>Capa / Orden</span>
            </span>
            <div className="modular-inspector-stepper-controls">
              <button
                type="button"
                className="modular-stepper-btn"
                onClick={() => onLayerChange(character.id, 'down')}
                title="Enviar atrás"
                aria-label="Enviar capa atrás"
              >
                <ChevronDown size={17} />
              </button>
              <span className="modular-stepper-val">
                Capa {currentLayer}
              </span>
              <button
                type="button"
                className="modular-stepper-btn"
                onClick={() => onLayerChange(character.id, 'up')}
                title="Traer al frente"
                aria-label="Traer capa al frente"
              >
                <ChevronUp size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Acciones rápidas del personaje */}
        <div className="modular-inspector-action-buttons">
          {onOpenQuickDialogue && (
            <button
              type="button"
              className="modular-inspector-btn dialogue"
              onClick={onOpenQuickDialogue}
              title="Hacer hablar a la figura con globo cinemático o JRPG"
            >
              <MessageSquare size={15} />
              <span>Hablar…</span>
            </button>
          )}

          <button
            type="button"
            className={`modular-inspector-btn ${character.isFlipped ? 'active-flip' : ''}`}
            onClick={() => onToggleMirror(character.id)}
            title="Girar figura horizontalmente (reflejo espejo)"
          >
            <FlipHorizontal size={15} />
            <span>Espejo</span>
          </button>

          {onDismissCharacter && (
            <button
              type="button"
              className="modular-inspector-btn"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              onClick={() => onDismissCharacter(character.id)}
              title="Quitar esta figura de la mesa"
            >
              <Trash2 size={15} />
              <span>Quitar</span>
            </button>
          )}
        </div>

        {/* 4. Botón inferior para regresar al panel modular */}
        <button
          type="button"
          className="modular-inspector-back-btn"
          onClick={onClose}
        >
          <ArrowLeft size={16} />
          <span>Volver al panel modular</span>
        </button>
      </section>
    </div>
  );
};
