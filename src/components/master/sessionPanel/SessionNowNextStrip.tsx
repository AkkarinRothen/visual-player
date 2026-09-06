import React from 'react';
import type { Scene, DisplayState, ActionExecutionStatus } from '../../../types';

export interface SessionNowNextStripProps {
  activeScene: Scene | null;
  liveState: DisplayState;
  stagedSceneObj: Scene | null;
  pendingChangesCount: number;
  isStagedSceneDifferent: boolean;
  publishStatus: ActionExecutionStatus;
  onPublishClick: () => void;
  onDiscardStaged: () => void;
}

export const SessionNowNextStrip: React.FC<SessionNowNextStripProps> = ({
  activeScene,
  liveState,
  stagedSceneObj,
  pendingChangesCount,
  isStagedSceneDifferent,
  publishStatus,
  onPublishClick,
  onDiscardStaged,
}) => {
  return (
    <section className="now-next-strip" aria-label="Estado Ahora y Después">
      <div className="now-next-scene now-next-current">
        <div className="now-next-label">
          <span className="now-next-dot live" /> Ahora · En Mesa
        </div>
        <div className="now-next-content">
          {activeScene?.backgroundUrl && <img src={activeScene.backgroundUrl} alt="" aria-hidden="true" />}
          <div>
            <strong>{activeScene?.name || liveState.sceneName || 'Sin escena'}</strong>
            <span>{liveState.characters.length} personaje(s) · estado confirmado</span>
          </div>
        </div>
      </div>

      <div className="now-next-arrow" aria-hidden="true">→</div>

      <div className={`now-next-scene now-next-staged ${isStagedSceneDifferent || pendingChangesCount > 0 ? 'has-pending' : ''}`}>
        <div className="now-next-label">
          <span className="now-next-dot staged" /> Después · Preparado
        </div>
        <div className="now-next-content">
          {(stagedSceneObj || (pendingChangesCount > 0 ? activeScene : null))?.backgroundUrl && (
            <img src={(stagedSceneObj || activeScene)!.backgroundUrl} alt="" aria-hidden="true" />
          )}
          <div>
            <strong>{stagedSceneObj?.name || (pendingChangesCount > 0 ? 'Cambios preparados' : 'Sin cambios preparados')}</strong>
            <span>{pendingChangesCount > 0 ? `${pendingChangesCount} cambio(s) pendiente(s)` : 'Listo para preparar'}</span>
          </div>
        </div>
      </div>

      {pendingChangesCount > 0 && (
        <div className="now-next-actions">
          <button type="button" className="now-next-publish" onClick={onPublishClick} disabled={publishStatus === 'sending'}>
            {publishStatus === 'sending' ? 'Enviando…' : 'Publicar'}
          </button>
          <button type="button" className="now-next-discard" onClick={onDiscardStaged}>
            Descartar
          </button>
        </div>
      )}
    </section>
  );
};
