import React, { useState } from 'react';
import type { DisplayState } from '../../types';
import { ChevronDown, ChevronUp, Maximize2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { StageViewport } from '../display/StageViewport';
import type { MesaTelemetryInfo } from '../../services/sessionCommandBus';

export interface LiveMiniPreviewProps {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  previewTab: 'live' | 'staged';
  onChangePreviewTab: (tab: 'live' | 'staged') => void;
  onOpenFullScreen: () => void;
  mesaTelemetry?: MesaTelemetryInfo | null;
  isConnected?: boolean;
}

export const LiveMiniPreview: React.FC<LiveMiniPreviewProps> = ({
  liveState,
  stagedState,
  operationMode,
  previewTab,
  onChangePreviewTab,
  onOpenFullScreen,
  mesaTelemetry,
  isConnected = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const activeState = previewTab === 'live' ? liveState : stagedState;
  const targetAspectRatio = mesaTelemetry?.viewport?.aspectRatio || 16 / 9;

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
        <div
          className="mini-preview-viewport relative"
          onClick={onOpenFullScreen}
          title="Pulsar para vista previa completa"
          style={{ height: '140px' }}
        >
          {/* Faithful 1:1 Stage Viewport (scales dynamically matching Mesa aspect ratio) */}
          <StageViewport
            state={activeState}
            isScaledPreview={true}
            aspectRatio={targetAspectRatio}
            showBanner={true}
          />

          {/* Telemetry and Mode Watermark */}
          <div className="mini-preview-watermark">
            {previewTab === 'staged' ? (
              <span className="inline-flex items-center gap-1 text-purple-300 font-semibold">
                <Clock size={11} />
                <span>BORRADOR PREPARADO (No publicado)</span>
              </span>
            ) : isConnected && mesaTelemetry?.lastAppliedRevision ? (
              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                <CheckCircle size={11} />
                <span>
                  CONFIRMADO EN MESA (Rev. {mesaTelemetry.lastAppliedRevision} •{' '}
                  {mesaTelemetry.viewport
                    ? `${mesaTelemetry.viewport.width}×${mesaTelemetry.viewport.height}`
                    : '16:9'}
                  )
                </span>
              </span>
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                <Clock size={11} />
                <span>ENVIADO (Esperando confirmación...)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <AlertTriangle size={11} />
                <span>SIMULACIÓN LOCAL (Mesa desconectada)</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
