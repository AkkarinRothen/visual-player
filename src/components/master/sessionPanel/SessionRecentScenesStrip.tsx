import React from 'react';
import type { Scene } from '../../../types';

export interface SessionRecentScenesStripProps {
  recentScenes: Scene[];
  currentSceneId?: string;
  lastQuickAction: string | null;
  onUndo?: () => void;
  onSelectScene: (scene: Scene) => void;
}

export const SessionRecentScenesStrip: React.FC<SessionRecentScenesStripProps> = ({
  recentScenes,
  currentSceneId,
  lastQuickAction,
  onUndo,
  onSelectScene,
}) => {
  if (recentScenes.length === 0) return null;

  return (
    <section className="recent-scenes-strip" aria-label="Escenas usadas recientemente">
      <div className="recent-scenes-heading">
        <span>Escenas recientes</span>
        {lastQuickAction && onUndo && (
          <span className="last-action-feedback" role="status">
            {lastQuickAction}
            <button type="button" onClick={onUndo}>
              Deshacer
            </button>
          </span>
        )}
      </div>
      <div className="recent-scenes-scroll">
        {recentScenes.map((scene) => (
          <button
            type="button"
            key={scene.id}
            className={`recent-scene-chip ${scene.id === currentSceneId ? 'active' : ''}`}
            onClick={() => onSelectScene(scene)}
            title={`Cambiar a ${scene.name}`}
          >
            <img src={scene.backgroundUrl} alt="" aria-hidden="true" />
            <span>{scene.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
