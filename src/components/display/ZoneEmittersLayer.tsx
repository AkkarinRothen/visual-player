import React, { useEffect, useRef, useState } from 'react';
import type { SceneZoneEmitter, CharacterOnScreen, SceneProp } from '../../types';

interface ZoneEmittersLayerProps {
  emitters?: SceneZoneEmitter[];
  characters?: CharacterOnScreen[];
  props?: SceneProp[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  maxLife: number;
  life: number;
}

export const ZoneEmittersLayer: React.FC<ZoneEmittersLayerProps> = ({
  emitters = [],
  characters = [],
  props = [],
}) => {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const particlesRef = useRef<Map<string, Particle[]>>(new Map());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Filter valid emitters (enabled and target not deleted if attached)
  const activeEmitters = emitters.filter((emitter) => {
    if (!emitter.enabled) return false;
    if (emitter.attachedTo) {
      const charExists = characters.some((c) => c.id === emitter.attachedTo?.instanceId);
      const propExists = props.some((p) => p.id === emitter.attachedTo?.instanceId);
      if (!charExists && !propExists) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    if (reducedMotion || activeEmitters.length === 0) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      activeEmitters.forEach((emitter) => {
        const canvas = canvasRefs.current.get(emitter.id);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        let pList = particlesRef.current.get(emitter.id) || [];
        const maxParticles = Math.min(Math.round(40 * (emitter.density || 0.5)), 60);

        // Spawn new particles if below budget
        if (pList.length < maxParticles) {
          const spawnCount = Math.min(2, maxParticles - pList.length);
          for (let i = 0; i < spawnCount; i++) {
            if (emitter.type === 'fog') {
              pList.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (emitter.speed || 1.0) * (Math.random() * 10 + 5),
                vy: (Math.random() - 0.5) * 3,
                size: Math.random() * 40 + 30,
                opacity: 0,
                maxLife: 8 + Math.random() * 4,
                life: 0,
              });
            } else if (emitter.type === 'smoke') {
              pList.push({
                x: w * 0.5 + (Math.random() - 0.5) * (w * 0.2),
                y: h * 0.9,
                vx: (Math.random() - 0.5) * 8 * (emitter.speed || 1.0),
                vy: -((Math.random() * 20 + 15) * (emitter.speed || 1.0)),
                size: Math.random() * 12 + 8,
                opacity: 0,
                maxLife: 4 + Math.random() * 2,
                life: 0,
              });
            } else if (emitter.type === 'rain') {
              pList.push({
                x: Math.random() * (w + 40) - 20,
                y: -10,
                vx: -((Math.random() * 10 + 10) * (emitter.speed || 1.0)),
                vy: (Math.random() * 100 + 180) * (emitter.speed || 1.0),
                size: Math.random() * 12 + 10,
                opacity: (emitter.opacity ?? 0.7) * (Math.random() * 0.4 + 0.5),
                maxLife: 1.5,
                life: 0,
              });
            } else if (emitter.type === 'embers') {
              pList.push({
                x: Math.random() * w,
                y: h * 0.9,
                vx: (Math.random() - 0.5) * 12 * (emitter.speed || 1.0),
                vy: -((Math.random() * 25 + 15) * (emitter.speed || 1.0)),
                size: Math.random() * 3 + 2,
                opacity: 0,
                maxLife: 3 + Math.random() * 2,
                life: 0,
              });
            }
          }
        }

        // Update and draw particles
        const alive: Particle[] = [];
        const baseColor = emitter.color || (emitter.type === 'rain' ? '#93c5fd' : emitter.type === 'smoke' ? '#94a3b8' : emitter.type === 'embers' ? '#fb923c' : '#ffffff');

        for (const p of pList) {
          p.life += dt;
          if (p.life >= p.maxLife) continue;

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Fade in and out
          const progress = p.life / p.maxLife;
          const fade = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
          const currentOpacity = (emitter.opacity ?? 0.6) * fade;

          ctx.save();
          ctx.globalAlpha = currentOpacity;

          if (emitter.type === 'rain') {
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 0.04, p.y + p.vy * 0.04);
            ctx.stroke();
          } else if (emitter.type === 'fog' || emitter.type === 'smoke') {
            const rad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            rad.addColorStop(0, baseColor);
            rad.addColorStop(1, 'transparent');
            ctx.fillStyle = rad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (emitter.type === 'embers') {
            ctx.fillStyle = baseColor;
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
          alive.push(p);
        }

        particlesRef.current.set(emitter.id, alive);
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeEmitters, reducedMotion]);

  if (activeEmitters.length === 0) {
    return null;
  }

  return (
    <div
      className="scene-zone-emitters-container"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {activeEmitters.map((emitter) => {
        // Compute position, accounting for attachedTo anchor offsets
        let posX = emitter.x;
        let posY = emitter.y;

        if (emitter.attachedTo) {
          const char = characters.find((c) => c.id === emitter.attachedTo?.instanceId);
          if (char) {
            posX = (char.normalizedX ?? posX) + (emitter.attachedTo.offsetX ?? 0);
            posY = (char.normalizedY ?? posY) + (emitter.attachedTo.offsetY ?? 0);
          } else {
            const prop = props.find((p) => p.id === emitter.attachedTo?.instanceId);
            if (prop) {
              posX = prop.normalizedX + (emitter.attachedTo.offsetX ?? 0);
              posY = prop.normalizedY + (emitter.attachedTo.offsetY ?? 0);
            }
          }
        }

        return (
          <div
            key={emitter.id}
            className={`zone-emitter-box zone-emitter-${emitter.type}`}
            style={{
              position: 'absolute',
              left: `${posX}%`,
              top: `${posY}%`,
              width: `${emitter.width}%`,
              height: `${emitter.height}%`,
              zIndex: emitter.zIndex ?? 10,
              overflow: emitter.isClipped ? 'hidden' : 'visible',
              pointerEvents: 'none',
            }}
          >
            {reducedMotion ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: (emitter.opacity ?? 0.5) * 0.6,
                  background:
                    emitter.type === 'fog'
                      ? 'linear-gradient(to top, rgba(255,255,255,0.4), transparent)'
                      : emitter.type === 'smoke'
                      ? 'radial-gradient(ellipse at bottom, rgba(148,163,184,0.4), transparent)'
                      : 'transparent',
                }}
              />
            ) : (
              <canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current.set(emitter.id, el);
                    if (el.width !== el.clientWidth || el.height !== el.clientHeight) {
                      el.width = el.clientWidth || 300;
                      el.height = el.clientHeight || 200;
                    }
                  } else {
                    canvasRefs.current.delete(emitter.id);
                    particlesRef.current.delete(emitter.id);
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
