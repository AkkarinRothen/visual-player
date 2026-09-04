import React from 'react';
import type { Scene, ActionExecutionStatus } from '../../../types';
import {
  Layers,
  Sparkles,
  Image as ImageIcon,
  CheckCheck,
  Send,
  Play,
} from 'lucide-react';

export interface NextSuggestedSceneCardProps {
  isStagedSceneDifferent: boolean;
  sceneToDisplayAsNext: Scene | null;
  publishStatus: ActionExecutionStatus;
  onOpenSaveScenePreset?: () => void;
  onOpenInsertScenePreset?: () => void;
  handlePublishClick: () => Promise<void>;
  handlePrepareNext: (scene: Scene) => void;
  onSelectScene: (scene: Scene) => void;
  onSwitchToTab: (tab: 'live' | 'moments' | 'combat' | 'notes' | 'library') => void;
}

export const NextSuggestedSceneCard: React.FC<NextSuggestedSceneCardProps> = ({
  isStagedSceneDifferent,
  sceneToDisplayAsNext,
  publishStatus,
  onOpenSaveScenePreset,
  onOpenInsertScenePreset,
  handlePublishClick,
  handlePrepareNext,
  onSelectScene,
  onSwitchToTab,
}) => {
  return (
    <section className="session-card next-scene-card">
      <div className="card-header-bar">
        <div className="flex-align-gap">
          <Layers size={15} className="text-indigo-400" />
          <h2 className="card-title">
            {isStagedSceneDifferent ? 'PREPARADA EN BORRADOR' : 'SIGUIENTE ESCENA'}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onOpenSaveScenePreset && (
            <button
              type="button"
              onClick={onOpenSaveScenePreset}
              title="Guardar composición de escena actual como Preset reutilizable"
              style={{
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.35)',
                color: '#c4b5fd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={12} />
              <span>Guardar Preset</span>
            </button>
          )}
          {onOpenInsertScenePreset && (
            <button
              type="button"
              onClick={onOpenInsertScenePreset}
              title="Insertar Preset de Escena en la preparación"
              style={{
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.35)',
                color: '#93c5fd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Layers size={12} />
              <span>Insertar Preset...</span>
            </button>
          )}
          {isStagedSceneDifferent && (
            <span className="card-tag staging-tag">STAGING LISTO</span>
          )}
        </div>
      </div>

      {sceneToDisplayAsNext ? (
        <div className="next-scene-content">
          <div
            className="next-scene-preview"
            style={{
              backgroundImage: sceneToDisplayAsNext.backgroundUrl
                ? `url(${sceneToDisplayAsNext.backgroundUrl})`
                : 'none',
            }}
          >
            <div className="next-scene-preview-overlay">
              <strong className="next-scene-name">{sceneToDisplayAsNext.name}</strong>
              {sceneToDisplayAsNext.subtitle && (
                <span className="next-scene-sub">{sceneToDisplayAsNext.subtitle}</span>
              )}
            </div>
          </div>

          <div className="next-scene-controls">
            {isStagedSceneDifferent ? (
              <button
                className="btn-send-to-table"
                onClick={handlePublishClick}
                disabled={publishStatus === 'sending'}
              >
                {publishStatus === 'sending' ? (
                  <span>Publicando...</span>
                ) : publishStatus === 'ack' ? (
                  <>
                    <CheckCheck size={16} className="text-emerald-300" />
                    <span>¡Escena en Mesa!</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Llevar a la Mesa (ACK)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                className="btn-prepare-staging"
                onClick={() => handlePrepareNext(sceneToDisplayAsNext)}
                title="Cargar escena en modo preparación sin afectar a los jugadores"
              >
                <Layers size={15} />
                <span>Preparar en Staging</span>
              </button>
            )}

            <button
              className="btn-direct-live"
              onClick={() => onSelectScene(sceneToDisplayAsNext)}
              title="Publicar directamente en vivo sin pasar por borrador"
            >
              <Play size={14} />
              <span>Publicar Directo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-next-scene-box">
          <ImageIcon size={32} className="text-slate-600 mb-2" />
          <p>No hay más escenas en la campaña.</p>
          <button
            className="btn-browse-scenes"
            onClick={() => onSwitchToTab('library')}
          >
            Explorar Biblioteca
          </button>
        </div>
      )}
    </section>
  );
};
