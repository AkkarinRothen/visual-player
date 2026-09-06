import React from 'react';

interface ActiveSceneHeaderPreviewProps {
  isBlackout: boolean;
  backgroundUrl?: string;
  sceneName?: string;
  locationBanner: { visible: boolean; text: string };
}

export const ActiveSceneHeaderPreview: React.FC<ActiveSceneHeaderPreviewProps> = ({
  isBlackout,
  backgroundUrl,
  sceneName,
  locationBanner,
}) => {
  return (
    <>
      <div className="card-header-bar">
        <div className="flex-align-gap">
          <span className="live-dot animate-pulse" />
          <h2 className="card-title">ESCENA EN MESA</h2>
        </div>
        {isBlackout && (
          <span className="card-tag blackout-tag">BLACKOUT ACTIVO</span>
        )}
      </div>

      <div className="scene-display-preview">
        <div
          className="scene-preview-bg"
          style={{
            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
          }}
        >
          <div className="scene-preview-overlay">
            <span className="scene-name-overlay">{sceneName || 'Sin Escenario'}</span>
            {locationBanner.visible && (
              <span className="scene-banner-sub">
                Banner: "{locationBanner.text}"
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
