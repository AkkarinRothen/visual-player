import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Upload, Sparkles } from 'lucide-react';

export interface TokenCreatorModalProps {
  isOpen: boolean;
  initialImageUrl?: string;
  onSaveToken: (tokenDataUrl: string) => void;
  onClose: () => void;
}

export type TokenBorderStyle = 'classic' | 'runes' | 'heavy' | 'neon';

export interface BorderColorOption {
  key: string;
  name: string;
  color: string;
}

const BORDER_COLORS: BorderColorOption[] = [
  { key: 'gold', name: 'Oro', color: '#f59e0b' },
  { key: 'silver', name: 'Plata', color: '#94a3b8' },
  { key: 'ally', name: 'Aliado', color: '#22c55e' },
  { key: 'enemy', name: 'Enemigo', color: '#ef4444' },
  { key: 'arcane', name: 'Arcano', color: '#38bdf8' },
  { key: 'shadow', name: 'Sombra', color: '#a855f7' },
];

export const TokenCreatorModal: React.FC<TokenCreatorModalProps> = ({
  isOpen,
  initialImageUrl = '',
  onSaveToken,
  onClose,
}) => {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState<string>('#f59e0b');
  const [borderStyle, setBorderStyle] = useState<TokenBorderStyle>('classic');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial image
  useEffect(() => {
    if (isOpen) {
      setImageUrl(initialImageUrl);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialImageUrl]);

  // Load image object whenever imageUrl changes
  useEffect(() => {
    if (!imageUrl) {
      imageObjRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      drawCanvas();
    };
    img.onerror = () => {
      imageObjRef.current = null;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas with high resolution and crisp borders
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = size * 0.44;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw image clipped to circle
    if (imageObjRef.current) {
      const img = imageObjRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Dark neutral background behind transparent images
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, size, size);

      // Compute scale to cover the circle
      const imgAspect = img.width / img.height;
      let drawW: number;
      let drawH: number;

      if (imgAspect >= 1) {
        drawH = radius * 2 * zoom;
        drawW = drawH * imgAspect;
      } else {
        drawW = radius * 2 * zoom;
        drawH = drawW / imgAspect;
      }

      const drawX = center - drawW / 2 + pan.x;
      const drawY = center - drawH / 2 + pan.y;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Placeholder background
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw styled border ring
    ctx.save();
    ctx.lineWidth = 14;

    if (borderStyle === 'classic') {
      // Outer shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner rim
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(center, center, radius - 5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (borderStyle === 'heavy') {
      ctx.lineWidth = 22;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 8;
      ctx.strokeStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (borderStyle === 'neon') {
      ctx.shadowColor = selectedColor;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (borderStyle === 'runes') {
      // Runes / Dashed arcane ring
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 12;
      ctx.setLineDash([16, 8]);
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(center, center, radius - 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }, [imageUrl, zoom, pan, selectedColor, borderStyle]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  if (!isOpen) return null;

  // Pointer dragging handlers on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setPan({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tokenDataUrl = canvas.toDataURL('image/png');
    onSaveToken(tokenDataUrl);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="token-creator-modal">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', width: '95%', padding: '20px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} className="text-amber-400" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Creador de Tokens Tácticos</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar creador de tokens">
            <X size={20} />
          </button>
        </div>

        {/* Canvas Workspace */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            maxHeight: '280px',
            backgroundColor: '#020617',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: '100%',
              height: '100%',
              cursor: 'grab',
            }}
            data-testid="token-creator-canvas"
          />

          {!imageUrl && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            >
              <Upload size={32} />
              <span style={{ fontSize: '0.85rem' }}>Subí una imagen para recortar el token</span>
            </div>
          )}
        </div>

        {/* Zoom & Reset Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            margin: '14px 0 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <ZoomOut size={16} className="text-slate-400" />
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1 }}
              aria-label="Zoom del token"
            />
            <ZoomIn size={16} className="text-slate-400" />
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', minWidth: '38px', textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            title="Centrar y reiniciar"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Centrar</span>
          </button>
        </div>

        {/* Border Color Swatches */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Color de Marco / Bando
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {BORDER_COLORS.map((b) => {
              const isSelected = selectedColor === b.color;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedColor(b.color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: b.color,
                    border: isSelected ? '3px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: isSelected ? `0 0 10px ${b.color}` : 'none',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                  title={b.name}
                  aria-label={`Color ${b.name}`}
                />
              );
            })}
          </div>
        </div>

        {/* Border Style Selector */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Estilo de Marco RPG
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {(['classic', 'runes', 'heavy', 'neon'] as TokenBorderStyle[]).map((st) => {
              const isSelected = borderStyle === st;
              const labels: Record<TokenBorderStyle, string> = {
                classic: 'Clásico',
                runes: 'Runas',
                heavy: 'Metálico',
                neon: 'Neón',
              };
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setBorderStyle(st)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    border: isSelected ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isSelected ? '#fbbf24' : '#cbd5e1',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {labels[st]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              borderRadius: '10px',
              padding: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            <span>Cambiar Foto</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!imageUrl}
            style={{
              flex: 1.5,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: '1px solid #34d399',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: imageUrl ? 'pointer' : 'not-allowed',
              opacity: imageUrl ? 1 : 0.5,
            }}
          >
            <Check size={16} />
            <span>Guardar Token</span>
          </button>
        </div>
      </div>
    </div>
  );
};
