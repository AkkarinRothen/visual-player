import React from 'react';
import { Grid, Maximize2 } from 'lucide-react';
import type { DisplayState } from '../../../../types';
import { StageViewport } from '../../../display/StageViewport';
import { StageTouchOverlay } from '../StageTouchOverlay';
import { StageFormationActionsMenu } from './StageFormationActionsMenu';

interface LiveStageSectionProps {
  liveState: DisplayState;
  isConnected: boolean;
  isTacticalModeActive: boolean;
  setIsTacticalModeActive: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCharId: string | null;
  setSelectedCharId: (id: string | null) => void;
  onMoveCharacter: (id: string, normalizedX: number, normalizedY: number) => void;
  onStreamMoveCharacter?: (id: string, normalizedX: number, normalizedY: number) => void;
  onScaleCharacter?: (id: string, scale: number) => void;
  onStreamScaleCharacter?: (id: string, scale: number) => void;
  onCameraChange?: (camera: { focalPoint: { x: number; y: number }; zoom: number }) => void;
  onStreamCameraChange?: (camera: { focalPoint: { x: number; y: number }; zoom: number }) => void;
  onOpenFullScreen?: () => void;
  onApplyBattleRanks?: () => void;
  onSnapAllToGrid?: () => void;
  onDistributeHorizontally?: () => void;
  onFitScaleToGrid?: () => void;
}

export const LiveStageSection: React.FC<LiveStageSectionProps> = ({
  liveState,
  isConnected,
  isTacticalModeActive,
  setIsTacticalModeActive,
  selectedCharId,
  setSelectedCharId,
  onMoveCharacter,
  onStreamMoveCharacter,
  onScaleCharacter,
  onStreamScaleCharacter,
  onCameraChange,
  onStreamCameraChange,
  onOpenFullScreen,
  onApplyBattleRanks,
  onSnapAllToGrid,
  onDistributeHorizontally,
  onFitScaleToGrid,
}) => {
  return (
    <section className="modular-stage-wrapper" aria-label="Escenario en vivo 16:9">
      {/* Live indicator pill */}
      <div className="modular-stage-live-pill">
        <span className="modular-stage-live-dot" />
        <span>{isConnected ? 'Mesa conectada' : 'Control local'}</span>
      </div>

      {/* Floating actions */}
      <div className="modular-stage-floating-actions">
        <button
          type="button"
          className={`modular-stage-btn ${isTacticalModeActive ? 'active' : ''}`}
          onClick={() => setIsTacticalModeActive((prev) => !prev)}
          title={isTacticalModeActive ? 'Desactivar cuadrícula táctica' : 'Activar cuadrícula táctica'}
          aria-label="Cuadrícula táctica"
          id="stage-tactical-toggle-btn"
          style={{
            backgroundColor: isTacticalModeActive ? 'rgba(56, 189, 248, 0.25)' : undefined,
            borderColor: isTacticalModeActive ? '#38bdf8' : undefined,
            color: isTacticalModeActive ? '#38bdf8' : undefined,
          }}
        >
          <Grid size={18} />
        </button>

        {onApplyBattleRanks && onSnapAllToGrid && onDistributeHorizontally && onFitScaleToGrid && (
          <StageFormationActionsMenu
            onApplyBattleRanks={onApplyBattleRanks}
            onSnapAllToGrid={onSnapAllToGrid}
            onDistributeHorizontally={onDistributeHorizontally}
            onFitScaleToGrid={onFitScaleToGrid}
            disabled={!liveState.characters || liveState.characters.length === 0}
          />
        )}

        {onOpenFullScreen && (
          <button
            type="button"
            className="modular-stage-btn"
            onClick={onOpenFullScreen}
            title="Pantalla completa"
            aria-label="Maximizar visor"
          >
            <Maximize2 size={18} />
          </button>
        )}
      </div>

      {/* The 16:9 Stage Viewport */}
      <StageViewport state={liveState} />

      {/* Interactive Direct Touch Overlay */}
      <StageTouchOverlay
        characters={liveState.characters}
        selectedCharId={selectedCharId}
        onSelectCharacter={(id) => setSelectedCharId(id)}
        onMoveCharacter={onMoveCharacter}
        onStreamMoveCharacter={onStreamMoveCharacter}
        onScaleCharacter={onScaleCharacter}
        onStreamScaleCharacter={onStreamScaleCharacter}
        onCameraChange={onCameraChange}
        onStreamCameraChange={onStreamCameraChange}
        camera={liveState.camera}
        isTacticalMode={isTacticalModeActive}
        gridConfig={liveState.tacticalGrid}
      />
    </section>
  );
};
