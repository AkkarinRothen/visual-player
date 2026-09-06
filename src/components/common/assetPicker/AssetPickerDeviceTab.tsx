import React, { useRef } from 'react';
import { Upload, AlertCircle, RefreshCw, Film, Check } from 'lucide-react';
import { formatBytes } from '../../../utils/imageOptimizer';
import { validateVideoFile, extractVideoPoster, formatVideoDuration } from '../../../utils/videoOptimizer';
import { optimizeUploadedImage } from '../../../utils/imageOptimizer';
import type { AssetPickerDeviceTabProps } from './assetPickerTypes';

export const AssetPickerDeviceTab: React.FC<AssetPickerDeviceTabProps> = ({
  mode,
  previewUrl,
  setPreviewUrl,
  assetName,
  setAssetName,
  errorMessage,
  setErrorMessage,
  isProcessing,
  setIsProcessing,
  optimizedResult,
  setOptimizedResult,
  keepOriginal,
  setKeepOriginal,
  isVideoSelected,
  setIsVideoSelected,
  videoFile,
  setVideoFile,
  videoValidation,
  setVideoValidation,
  videoPosterDataUrl,
  setVideoPosterDataUrl,
  videoObjectUrl,
  setVideoObjectUrl,
  onConfirmUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSelection = () => {
    setPreviewUrl('');
    setAssetName('');
    setOptimizedResult(null);
    setErrorMessage(null);
    setIsVideoSelected(false);
    setVideoFile(null);
    setVideoValidation(null);
    setVideoPosterDataUrl(null);
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setAssetName(fileName);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name);

    if (isVideo) {
      if (mode === 'character' || mode === 'prop') {
        setIsProcessing(false);
        setErrorMessage('Solo se admiten videos como fondo de escenario, no como figuras de personajes.');
        return;
      }

      try {
        const val = await validateVideoFile(file);
        if (!val.isValid) {
          setErrorMessage(val.error || 'El video no cumple con los requisitos del escenario.');
          setIsProcessing(false);
          return;
        }

        const posterInfo = await extractVideoPoster(file);
        const objUrl = URL.createObjectURL(file);
        setVideoObjectUrl(objUrl);
        setVideoValidation(val);
        setVideoFile(file);
        setIsVideoSelected(true);
        setVideoPosterDataUrl(posterInfo.posterDataUrl);
        setPreviewUrl(posterInfo.posterDataUrl);
        setOptimizedResult(null);
      } catch (err: any) {
        console.error('Error procesando video:', err);
        setErrorMessage(err.message || 'Error al validar o extraer póster del video.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Flujo normal de imágenes
    setIsVideoSelected(false);
    setVideoFile(null);
    setVideoValidation(null);
    setVideoPosterDataUrl(null);
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
    }

    try {
      const role = mode === 'background' ? 'background' : 'character';
      const result = await optimizeUploadedImage(file, role, { keepOriginal });
      setOptimizedResult(result);
      setPreviewUrl(result.dataUrl);
    } catch (err: any) {
      console.error('Error optimizando archivo:', err);
      setErrorMessage(err.message || 'Error al procesar la imagen seleccionada.');
      setOptimizedResult(null);
      setPreviewUrl('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept={mode === 'background' || mode === 'all' ? 'image/*,video/mp4,video/webm' : 'image/*'}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(245, 158, 11, 0.04)',
            transition: 'all 0.2s',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              margin: '0 auto 16px',
            }}
          >
            <Upload size={28} />
          </div>
          <strong style={{ display: 'block', fontSize: '1.05rem', color: '#f3f4f6', marginBottom: '6px' }}>
            Tocar para abrir Fotos o Archivos
          </strong>
          <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
            {mode === 'background' || mode === 'all'
              ? 'Soporta JPG, PNG, WebP o videos MP4/WebM (hasta 30s)'
              : 'Soporta JPG, PNG, WebP o GIF de tu dispositivo'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Alerta de error comprensible */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, color: '#ef4444' }} />
              <div style={{ flex: 1 }}>{errorMessage}</div>
            </div>
          )}

          {/* Vista Previa */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: mode === 'background' ? '16/9' : '1/1',
              maxHeight: '260px',
              background: '#090d16',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {isVideoSelected ? (
              <video
                src={videoObjectUrl || previewUrl}
                poster={videoPosterDataUrl || undefined}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: mode === 'background' ? 'cover' : 'contain',
                }}
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} />
              <span>{isVideoSelected ? 'Cambiar Video' : 'Cambiar Foto'}</span>
            </button>
          </div>

          {/* Resumen de Video */}
          {isVideoSelected && videoValidation && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Film size={14} />
                  Fondo de Video ({videoValidation.dimensions.width}×{videoValidation.dimensions.height} • {formatVideoDuration(videoValidation.durationSeconds)})
                </span>
                <span>{videoFile ? formatBytes(videoFile.size) : ''}</span>
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                Póster estático generado automáticamente para conexión instantánea sin pantalla negra.
              </span>
            </div>
          )}

          {/* Resumen de Optimización Adaptativa */}
          {optimizedResult && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6ee7b7', fontWeight: 600 }}>
                <span>Optimizado ({optimizedResult.format.toUpperCase()} {optimizedResult.width}×{optimizedResult.height})</span>
                <span>
                  {formatBytes(optimizedResult.originalSize)} → {formatBytes(optimizedResult.optimizedSize)}
                  {' '}(ahorro {Math.max(0, Math.round((1 - optimizedResult.optimizedSize / optimizedResult.originalSize) * 100))}%)
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  checked={keepOriginal}
                  onChange={(e) => setKeepOriginal(e.target.checked)}
                  style={{ accentColor: '#10b981' }}
                />
                <span>Conservar original para futuras reediciones (+{formatBytes(optimizedResult.originalSize)})</span>
              </label>
            </div>
          )}

          {/* Nombre opcional */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
              Nombre del recurso
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="ej: Taberna Acogedora, Lord Malakor..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={resetSelection}
              style={{
                flex: 1,
                padding: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '10px',
                color: '#9ca3af',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmUpload}
              disabled={isProcessing}
              style={{
                flex: 2,
                padding: '12px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isProcessing ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
              }}
            >
              <Check size={18} />
              <span>
                {isProcessing
                  ? 'Guardando en la app...'
                  : isVideoSelected
                  ? 'Usar este Video de Fondo'
                  : 'Usar esta Imagen'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
