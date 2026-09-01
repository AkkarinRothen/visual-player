import React from 'react';
import type { DisplayState } from '../../types';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { InitiativeRibbon } from '../display/InitiativeRibbon';
import { X, Send, Eye } from 'lucide-react';

interface FullScreenPreviewModalProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  hasPendingChanges: boolean;
  onChangePreviewTab: (tab: 'live' | 'staged') => void;
  onSendToScreen: () => void;
  onClose: () => void;
}

export const FullScreenPreviewModal: React.FC<FullScreenPreviewModalProps> = ({
  liveState,
  stagedState,
  operationMode,
  previewTab,
  hasPendingChanges,
  onChangePreviewTab,
  onSendToScreen,
  onClose,
}) => {
  const activeState = previewTab === 'live' ? liveState : stagedState;

  const renderCharacterSlot = (pos: 'left' | 'center-left' | 'center-right' | 'right') => {
    const chars = activeState.characters.filter((c) => c.position === pos);
    if (chars.length === 0) return null;

    return (
      <div key={pos} className={`character-slot slot-${pos}`}>
        {chars.map((char) => {
          const hasAnySpeaker = activeState.characters.some((c) => c.isSpeaking);
          const isDimmed = hasAnySpeaker && !char.isSpeaking;

          return (
            <div
              key={char.id}
              className={`character-card ${char.isSpeaking ? 'is-speaking' : ''} ${
                isDimmed ? 'is-dimmed' : ''
              }`}
            >
              <div className="avatar-frame">
                <img src={char.avatarUrl} alt={char.name} className="avatar-img" />
              </div>
              <div className="nameplate">
                <span className="character-name">{char.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="modal-overlay preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-shell" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar */}
        <div className="preview-modal-header">
          <div className="preview-modal-tabs">
            <button
              className={`preview-tab-btn ${previewTab === 'live' ? 'active' : ''}`}
              onClick={() => onChangePreviewTab('live')}
            >
              <span className="dot-live"></span>
              <span>En Pantalla (Tablet)</span>
            </button>
            {operationMode === 'staging' && (
              <button
                className={`preview-tab-btn ${previewTab === 'staged' ? 'active staged' : ''}`}
                onClick={() => onChangePreviewTab('staged')}
              >
                <span className="dot-staged"></span>
                <span>Borrador Preparado</span>
              </button>
            )}
          </div>

          <div className="preview-modal-actions">
            {operationMode === 'staging' && hasPendingChanges && (
              <button
                className="btn-primary-sm send-staged-btn"
                onClick={() => {
                  onSendToScreen();
                  onClose();
                }}
              >
                <Send size={14} />
                <span>Enviar a Pantalla</span>
              </button>
            )}
            <button className="icon-btn-ghost" onClick={onClose} title="Cerrar Vista Previa">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Screen Preview Stage Container (16:9 Aspect Ratio) */}
        <div className="preview-stage-viewport">
          <div
            className="background-layer current-bg"
            style={{ backgroundImage: `url(${activeState.backgroundUrl})` }}
          />

          {/* Atmosphere Particles & Lighting */}
          <AtmosphereCanvas
            weather={activeState.weather}
            intensity={activeState.weatherIntensity}
            lighting={activeState.lighting}
            lightningTrigger={activeState.lightningTrigger}
          />

          {/* Combat Ribbon */}
          {activeState.combatState?.isActive && (
            <InitiativeRibbon combatState={activeState.combatState} />
          )}

          {/* Location Banner */}
          {!activeState.combatState?.isActive &&
            activeState.locationBanner?.visible &&
            activeState.locationBanner.text && (
              <div className="cinematic-banner-container">
                <div className="cinematic-banner">
                  <div className="banner-rune-left">✦</div>
                  <div className="banner-content">
                    <h1 className="banner-title">{activeState.locationBanner.text}</h1>
                    {activeState.locationBanner.subtitle && (
                      <p className="banner-subtitle">{activeState.locationBanner.subtitle}</p>
                    )}
                  </div>
                  <div className="banner-rune-right">✦</div>
                </div>
              </div>
            )}

          {/* Character Standees */}
          <div className="character-stage">
            {renderCharacterSlot('left')}
            {renderCharacterSlot('center-left')}
            {renderCharacterSlot('center-right')}
            {renderCharacterSlot('right')}
          </div>

          {/* Blackout */}
          {activeState.isBlackout && (
            <div className="blackout-curtain active">
              <div className="blackout-rune">
                <span>Pantalla Apagada (Blackout)</span>
              </div>
            </div>
          )}

          {/* Watermark */}
          <div className="preview-watermark-pill">
            <Eye size={14} />
            <span>
              {previewTab === 'live' ? 'Viendo la pantalla actual de la Tablet' : 'Viendo el borrador antes de enviar'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
