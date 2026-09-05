import React from 'react';
import { Image as ImageIcon, ChevronRight, Shuffle, Wand2 } from 'lucide-react';
import type { Scene } from '../../../types';

export interface ModularSceneCardProps {
  currentScene?: Scene | null;
  sceneName: string;
  backgroundUrl: string;
  onOpenScenePicker?: () => void;
  onTriggerTransition?: () => void;
}

export const ModularSceneCard: React.FC<ModularSceneCardProps> = ({
  currentScene,
  sceneName,
  backgroundUrl,
  onOpenScenePicker,
  onTriggerTransition,
}) => {
  return (
    <section className="modular-card" aria-label="Escena actual">
      <div className="modular-card-header">
        <div className="modular-card-title-group">
          <ImageIcon size={18} className="modular-card-icon" />
          <span>Escena actual</span>
        </div>
        {onOpenScenePicker && (
          <button
            type="button"
            className="modular-card-arrow"
            onClick={onOpenScenePicker}
            aria-label="Abrir biblioteca de escenas"
            title="Ver catálogo de escenas"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="modular-scene-row">
        <img
          src={backgroundUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="68" height="48" fill="%231e293b"><rect width="100%" height="100%"/></svg>'}
          alt={sceneName || 'Escena'}
          className="modular-scene-thumb"
        />
        <div className="modular-scene-details">
          <span className="modular-scene-name" title={sceneName || 'Sin escena'}>
            {sceneName || 'Sin escena'}
          </span>
          <span className="modular-scene-tag">
            {currentScene?.name ? 'Escenario activo' : 'Mesa en vivo'}
          </span>
        </div>
      </div>

      <div className="modular-scene-actions">
        <button
          type="button"
          className="modular-btn-action"
          onClick={onOpenScenePicker}
          title="Cambiar la escena en vivo"
        >
          <Shuffle size={14} />
          <span>Cambiar</span>
        </button>

        <button
          type="button"
          className="modular-btn-action accent"
          onClick={onTriggerTransition}
          title="Efecto de transición cinemática"
        >
          <Wand2 size={14} />
          <span>Transición</span>
        </button>
      </div>
    </section>
  );
};
