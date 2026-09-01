import React, { useEffect, useRef } from 'react';
import type { LightingFilter, WeatherType } from '../../types';

interface AtmosphereCanvasProps {
  weather: WeatherType;
  intensity: number; // 0.0 to 1.0
  lighting: LightingFilter;
  lightningTrigger: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  color: string;
  life: number;
  maxLife: number;
  phase?: number;
}

export const AtmosphereCanvas: React.FC<AtmosphereCanvasProps> = ({
  weather,
  intensity = 0.5,
  lighting = 'normal',
  lightningTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashAlphaRef = useRef<number>(0);
  const torchFlickerRef = useRef<number>(1);

  // Trigger flash on lightning trigger prop change
  useEffect(() => {
    if (lightningTrigger > 0) {
      flashAlphaRef.current = 0.95;
    }
  }, [lightningTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];

    // Particle factory
    const createParticle = (type: WeatherType): Particle => {
      const p: Particle = {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        size: 2,
        alpha: 0.8,
        maxAlpha: 0.8,
        color: '#ffffff',
        life: 0,
        maxLife: 100,
        phase: Math.random() * Math.PI * 2,
      };

      if (type === 'rain' || type === 'storm') {
        p.vx = (Math.random() * 2 - 1) - (type === 'storm' ? 3 : 1);
        p.vy = 12 + Math.random() * 10 * (intensity + 0.5);
        p.size = 1.2 + Math.random() * 1.5;
        p.alpha = 0.4 + Math.random() * 0.4;
        p.color = 'rgba(180, 210, 255, ';
      } else if (type === 'snow') {
        p.vx = (Math.random() * 2 - 1) * 0.8;
        p.vy = 1 + Math.random() * 2 * (intensity + 0.5);
        p.size = 2 + Math.random() * 3.5;
        p.alpha = 0.3 + Math.random() * 0.6;
        p.color = 'rgba(255, 255, 255, ';
      } else if (type === 'embers') {
        p.y = height + Math.random() * 20;
        p.vx = (Math.random() - 0.5) * 1.8;
        p.vy = -(1.5 + Math.random() * 3 * (intensity + 0.5));
        p.size = 1.5 + Math.random() * 3;
        p.maxAlpha = 0.6 + Math.random() * 0.4;
        p.alpha = p.maxAlpha;
        p.maxLife = 120 + Math.random() * 100;
        const emberHues = ['#ff4500', '#ff8c00', '#ffd700', '#ff3300'];
        p.color = emberHues[Math.floor(Math.random() * emberHues.length)];
      } else if (type === 'fireflies') {
        p.vx = (Math.random() - 0.5) * 0.8;
        p.vy = (Math.random() - 0.5) * 0.8;
        p.size = 2 + Math.random() * 3;
        p.maxAlpha = 0.7;
        p.alpha = 0.1;
        p.maxLife = 200 + Math.random() * 150;
        p.color = Math.random() > 0.3 ? '#84ff00' : '#00ffee';
      } else if (type === 'fog') {
        p.vx = 0.3 + Math.random() * 0.4;
        p.vy = (Math.random() - 0.5) * 0.1;
        p.size = 120 + Math.random() * 180;
        p.maxAlpha = 0.12 * intensity;
        p.alpha = 0.01;
        p.maxLife = 300;
        p.color = 'rgba(220, 230, 245, ';
      }

      return p;
    };

    // Populate initial particles
    const targetCount =
      weather === 'none'
        ? 0
        : weather === 'rain'
        ? Math.floor(120 * intensity + 40)
        : weather === 'storm'
        ? Math.floor(220 * intensity + 80)
        : weather === 'snow'
        ? Math.floor(90 * intensity + 30)
        : weather === 'embers'
        ? Math.floor(60 * intensity + 20)
        : weather === 'fireflies'
        ? Math.floor(35 * intensity + 15)
        : weather === 'fog'
        ? Math.floor(16 * intensity + 6)
        : 0;

    for (let i = 0; i < targetCount; i++) {
      particles.push(createParticle(weather));
    }

    let lastTime = performance.now();
    let randomStormFlashCounter = 0;

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // 1. Natural Storm lightning trigger
      if (weather === 'storm' && intensity > 0.4) {
        randomStormFlashCounter += dt;
        if (randomStormFlashCounter > 6 - intensity * 4) {
          if (Math.random() < 0.02) {
            flashAlphaRef.current = 0.85;
            randomStormFlashCounter = 0;
          }
        }
      }

      // 2. Render particles
      if (weather !== 'none') {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;

          if (weather === 'rain' || weather === 'storm') {
            ctx.strokeStyle = `${p.color}${p.alpha})`;
            ctx.lineWidth = p.size;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
            ctx.stroke();

            if (p.y > height) {
              p.y = -20;
              p.x = Math.random() * width;
            }
            if (p.x < -20) p.x = width + 20;
          } else if (weather === 'snow') {
            p.x += Math.sin((p.phase || 0) + time * 0.002) * 0.8;
            ctx.fillStyle = `${p.color}${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.y > height) {
              p.y = -10;
              p.x = Math.random() * width;
            }
          } else if (weather === 'embers') {
            p.x += Math.sin((p.phase || 0) + time * 0.003) * 0.6;
            const progress = p.life / p.maxLife;
            p.alpha = p.maxAlpha * (1 - progress);

            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            if (p.life >= p.maxLife || p.y < -20) {
              particles[i] = createParticle('embers');
            }
          } else if (weather === 'fireflies') {
            p.phase = (p.phase || 0) + 0.03;
            p.alpha = (Math.sin(p.phase) + 1) * 0.5 * (p.maxAlpha || 0.7);

            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
              particles[i] = createParticle('fireflies');
            }
          } else if (weather === 'fog') {
            p.phase = (p.phase || 0) + 0.01;
            const fade = Math.sin((p.life / p.maxLife) * Math.PI);
            const curAlpha = p.maxAlpha * fade;

            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `${p.color}${curAlpha})`);
            grad.addColorStop(1, `${p.color}0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.life >= p.maxLife || p.x - p.size > width) {
              particles[i] = createParticle('fog');
              particles[i].x = -particles[i].size;
            }
          }
        }
      }

      // 3. Torch Flicker logic
      if (lighting === 'torch_flicker') {
        const noise = (Math.random() - 0.5) * 0.08;
        torchFlickerRef.current = Math.max(0.85, Math.min(1.15, torchFlickerRef.current + noise));
        const torchGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          100 * torchFlickerRef.current,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.8
        );
        torchGrad.addColorStop(0, 'rgba(255, 170, 70, 0.08)');
        torchGrad.addColorStop(0.7, 'rgba(180, 80, 10, 0.25)');
        torchGrad.addColorStop(1, 'rgba(20, 5, 0, 0.55)');
        ctx.fillStyle = torchGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 4. Lighting Color Tint Overlay
      if (lighting === 'night') {
        ctx.fillStyle = 'rgba(10, 20, 45, 0.45)';
        ctx.fillRect(0, 0, width, height);
      } else if (lighting === 'sunset') {
        ctx.fillStyle = 'rgba(255, 120, 40, 0.22)';
        ctx.fillRect(0, 0, width, height);
      } else if (lighting === 'blood_moon') {
        ctx.fillStyle = 'rgba(180, 20, 30, 0.35)';
        ctx.fillRect(0, 0, width, height);
      } else if (lighting === 'mystic_violet') {
        ctx.fillStyle = 'rgba(110, 40, 160, 0.28)';
        ctx.fillRect(0, 0, width, height);
      }

      // 5. Lightning Flash Overlay
      if (flashAlphaRef.current > 0.01) {
        ctx.fillStyle = `rgba(240, 248, 255, ${flashAlphaRef.current})`;
        ctx.fillRect(0, 0, width, height);
        flashAlphaRef.current *= 0.84; // Fast decay
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [weather, intensity, lighting]);

  return (
    <canvas
      ref={canvasRef}
      className="atmosphere-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};
