import React from 'react';
import type { CharacterOnScreen, SceneLight, SceneProp } from '../../types';

interface SceneLightsLayerProps {
  lights?: SceneLight[];
  characters?: CharacterOnScreen[];
  props?: SceneProp[];
}

export const SceneLightsLayer: React.FC<SceneLightsLayerProps> = ({
  lights = [],
  characters = [],
  props = [],
}) => {
  if (!lights || lights.length === 0) return null;

  return (
    <div
      className="scene-lights-layer"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 22, // Above stage background and props, blends over characters
        mixBlendMode: 'screen',
      }}
      aria-hidden="true"
    >
      {lights.map((light) => {
        if (!light.visible) return null;

        // 1. Resolve light position (handle attached target)
        let posX = light.normalizedX;
        let posY = light.normalizedY;

        if (light.attachedTo) {
          const { targetType, targetId, offsetX, offsetY } = light.attachedTo;
          if (targetType === 'character') {
            const targetChar = characters.find((c) => c.id === targetId);
            if (!targetChar) return null; // Target removed: cleanly hide light
            posX = (targetChar.normalizedX ?? 50) + (offsetX || 0);
            posY = (targetChar.normalizedY ?? 80) + (offsetY || 0);
          } else if (targetType === 'prop') {
            const targetProp = props.find((p) => p.id === targetId);
            if (!targetProp) return null; // Target removed: cleanly hide light
            posX = targetProp.normalizedX + (offsetX || 0);
            posY = targetProp.normalizedY + (offsetY || 0);
          }
        }

        // Clamp positions to stage
        posX = Math.max(0, Math.min(100, posX));
        posY = Math.max(0, Math.min(100, posY));

        // 2. Preset styling
        const presetColors = {
          torch: '#ff8a1a',
          candle: '#ffd24d',
          moonlight: '#b3d9ff',
          magic: '#b84dff',
          custom: light.color || '#ffaa33',
        };

        const baseColor = light.color || presetColors[light.preset] || '#ffaa33';
        const intensity = Math.max(0.1, Math.min(1.5, light.intensity ?? 1.0));
        const radiusPct = Math.max(5, Math.min(70, light.radiusPct ?? 25));

        return (
          <div
            key={light.id}
            className={`scene-light-point ${light.flicker ? 'animate-pulse' : ''}`}
            style={{
              position: 'absolute',
              left: `${posX}%`,
              top: `${posY}%`,
              width: `${radiusPct * 2}%`,
              height: `${radiusPct * 2}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle at center, ${baseColor} 0%, ${baseColor}88 35%, transparent 70%)`,
              opacity: intensity * 0.85,
              filter: `blur(${Math.max(4, radiusPct * 0.8)}px)`,
              transition: 'left 0.3s ease, top 0.3s ease, opacity 0.5s ease',
            }}
          />
        );
      })}
    </div>
  );
};
