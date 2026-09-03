import React from 'react';
import type { DisplayState } from '../../types';
import { StageViewport } from '../display/StageViewport';
import { InitiativeRibbon } from '../display/InitiativeRibbon';
import { X, Send, Eye } from 'lucide-react';
import type { MesaTelemetryInfo } from '../../services/sessionCommandBus';

export interface FullScreenPreviewModalProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  hasPendingChanges: boolean;
  onChangePreviewTab: (tab: 'live' | 'staged') => void;
  onSendToScreen: () => void;
  onClose: () => void;
  mesaTelemetry?: MesaTelemetryInfo | null;
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
  mesaTelemetry,
}) => {
  const activeState = previewTab === 'live' ? liveState : stagedState;
  const targetAspectRatio = mesaTelemetry?.viewport?.aspectRatio || 16 / 9;

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
              <span>En Pantalla (Mesa)</span>
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

        {/* Screen Preview Stage Container (Faithful 1:1 StageViewport) */}
        <div
          className="preview-stage-viewport relative overflow-hidden"
          style={{ width: '100%', height: '520px', background: '#000' }}
        >
          <StageViewport
            state={activeState}
            isScaledPreview={true}
            aspectRatio={targetAspectRatio}
            showBanner={!activeState.combatState?.isActive}
          />

          {/* Combat Ribbon */}
          {activeState.combatState?.isActive && (
            <InitiativeRibbon combatState={activeState.combatState} />
          )}

          {/* Watermark */}
          <div className="preview-watermark-pill">
            <Eye size={14} />
            <span>
              {previewTab === 'live'
                ? `Viendo la pantalla actual de la Mesa (${
                    mesaTelemetry?.viewport
                      ? `${mesaTelemetry.viewport.width}×${mesaTelemetry.viewport.height}`
                      : '16:9'
                  })`
                : 'Viendo el borrador antes de enviar'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
