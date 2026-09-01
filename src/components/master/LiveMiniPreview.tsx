import React, { useState } from 'react';
import type { DisplayState } from '../../types';
import { ChevronDown, ChevronUp, Eye, Maximize2 } from 'lucide-react';

interface LiveMiniPreviewProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  onChangePreviewTab: (tab: 'live' | 'staged') => void;
  onOpenFullScreen: () => void;
}

export const LiveMiniPreview: React.FC<LiveMiniPreviewProps> = ({
  liveState,
  stagedState,
  operationMode,
  previewTab,
  onChangePreviewTab,
  onOpenFullScreen,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const activeState = previewTab === 'live' ? liveState : stagedState;

  return (
    <div className="mini-preview-root">
      <div className="mini-preview-header">
        <div className="preview-mode-tabs">
          <button
            className={`preview-tab-btn ${previewTab === 'live' ? 'active' : ''}`}
            onClick={() => onChangePreviewTab('live')}
          >
            <span className="dot-live"></span>
            <span>En Pantalla</span>
          </button>
          {operationMode === 'staging' && (
            <button
              className={`preview-tab-btn ${previewTab === 'staged' ? 'active staged' : ''}`}
              onClick={() => onChangePreviewTab('staged')}
            >
              <span className="dot-staged"></span>
              <span>Borrador</span>
            </button>
          )}
        </div>

        <div className="preview-header-actions">
          <button
            className="icon-btn-ghost"
            onClick={onOpenFullScreen}
            title="Abrir Vista Previa Completa"
          >
            <Maximize2 size={14} />
          </button>
          <button
            className="icon-btn-ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir Vista Previa' : 'Plegar Vista Previa'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mini-preview-viewport" onClick={onOpenFullScreen} title="Pulsar para pantalla completa">
          {/* Background */}
          <div
            className="mini-preview-bg"
            style={{ backgroundImage: `url(${activeState.backgroundUrl})` }}
          />

          {/* Lighting Overlay */}
          <div className={`mini-preview-lighting lighting-${activeState.lighting}`} />

          {/* Banner */}
          {activeState.locationBanner?.visible && activeState.locationBanner.text && (
            <div className="mini-preview-banner">
              <span>{activeState.locationBanner.text}</span>
            </div>
          )}

          {/* Characters on Screen */}
          <div className="mini-preview-characters">
            {activeState.characters.map((char) => (
              <div
                key={char.id}
                className={`mini-char pos-${char.position} ${char.isSpeaking ? 'speaking' : ''}`}
              >
                <img src={char.avatarUrl} alt={char.name} className="mini-char-avatar" />
                <span className="mini-char-name">{char.name}</span>
              </div>
            ))}
          </div>

          {/* Blackout Indicator */}
          {activeState.isBlackout && (
            <div className="mini-preview-blackout">
              <span>PANTALLA APAGADA (BLACKOUT)</span>
            </div>
          )}

          {/* Badge indicator on bottom corner */}
          <div className="mini-preview-watermark">
            <Eye size={12} />
            <span>{previewTab === 'live' ? 'VISTA TABLET EN VIVO' : 'BORRADOR PREPARADO'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
