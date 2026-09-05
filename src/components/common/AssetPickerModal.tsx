import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Search, Check, Link as LinkIcon, RefreshCw, FolderHeart, Sparkles, AlertCircle, Film, Play } from 'lucide-react';
import { db, registerImmutableAsset, registerOptimizedAsset, type StoredAsset } from '../../db';
import { optimizeUploadedImage, formatBytes, type OptimizedImageResult } from '../../utils/imageOptimizer';
import { validateVideoFile, extractVideoPoster, formatVideoDuration, type VideoValidationResult } from '../../utils/videoOptimizer';

export interface SelectedAssetResult {
  url: string;
  name: string;
  type?: 'image' | 'video';
  videoAssetId?: string;
  posterUrl?: string;
  durationSeconds?: number;
}

export interface AssetPickerModalProps {
  isOpen: boolean;
  mode: 'background' | 'character' | 'prop' | 'all';
  currentUrl?: string;
  title?: string;
  onSelectAsset: (asset: SelectedAssetResult) => void;
  onClose: () => void;
}

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  isOpen,
  mode,
  currentUrl = '',
  title,
  onSelectAsset,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'device' | 'library' | 'url'>('device');
  const [storedAssets, setStoredAssets] = useState<StoredAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl);
  const [assetName, setAssetName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [optimizedResult, setOptimizedResult] = useState<OptimizedImageResult | null>(null);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video-specific state
  const [isVideoSelected, setIsVideoSelected] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoValidation, setVideoValidation] = useState<VideoValidationResult | null>(null);
  const [videoPosterDataUrl, setVideoPosterDataUrl] = useState<string | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  // Cargar recursos guardados de IndexedDB al abrir
  useEffect(() => {
    if (isOpen) {
      loadStoredAssets();
      setPreviewUrl(currentUrl);
      setAssetName('');
      setCustomUrlInput('');
      setOptimizedResult(null);
      setKeepOriginal(false);
      setErrorMessage(null);
      setVisibleCount(24);
      setActiveTab('device');
      setIsVideoSelected(false);
      setVideoFile(null);
      setVideoValidation(null);
      setVideoPosterDataUrl(null);
      setFilterType('all');
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
        setVideoObjectUrl(null);
      }
    }
    return () => {
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [isOpen, currentUrl]);

  const loadStoredAssets = async () => {
    try {
      let assets: StoredAsset[];
      if (mode === 'character' || mode === 'prop') {
        assets = await db.assets.where('type').equals('image').reverse().sortBy('createdAt');
      } else {
        assets = await db.assets.reverse().sortBy('createdAt');
        assets = assets.filter((a) => a.type === 'image' || a.type === 'video');
      }
      setStoredAssets(assets);
    } catch (err) {
      console.warn('Error cargando assets de IndexedDB:', err);
    }
  };

  if (!isOpen) return null;

  const modalTitle =
    title ||
    (mode === 'background'
      ? 'Elegir Fondo de Escena'
      : mode === 'character'
      ? 'Elegir Retrato de Personaje'
      : 'Elegir Imagen o Video');

  // Procesar archivo seleccionado del dispositivo con optimización automática o validación de video
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

  // Confirmar y registrar en almacenamiento local
  const handleConfirmDeviceUpload = async () => {
    if (!previewUrl && !videoFile) return;

    setIsProcessing(true);
    try {
      const finalName = assetName.trim() || (isVideoSelected ? 'Video sin título' : 'Imagen sin título');

      if (isVideoSelected && videoFile && videoValidation) {
        // Convertir video a base64 DataURL para persistencia offline segura
        const reader = new FileReader();
        const videoDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(videoFile);
        });

        const stored = await registerOptimizedAsset({
          name: finalName,
          type: 'video',
          dataUrl: videoDataUrl,
          thumbnailUrl: videoPosterDataUrl || undefined,
          posterDataUrl: videoPosterDataUrl || undefined,
          originalSize: videoFile.size,
          optimizedSize: videoFile.size,
          sha256: videoValidation.sha256,
          dimensions: { width: videoValidation.dimensions.width, height: videoValidation.dimensions.height },
          durationSeconds: videoValidation.durationSeconds,
        });

        onSelectAsset({
          url: stored.dataUrl,
          name: stored.name,
          type: 'video',
          videoAssetId: stored.id,
          posterUrl: videoPosterDataUrl || stored.dataUrl,
          durationSeconds: videoValidation.durationSeconds,
        });
        onClose();
        return;
      }

      if (optimizedResult) {
        const stored = await registerOptimizedAsset({
          name: finalName,
          type: 'image',
          dataUrl: optimizedResult.dataUrl,
          thumbnailUrl: optimizedResult.thumbnailUrl,
          originalDataUrl: keepOriginal ? optimizedResult.originalDataUrl : undefined,
          originalSize: optimizedResult.originalSize,
          optimizedSize: optimizedResult.optimizedSize,
          sha256: optimizedResult.sha256,
          dimensions: { width: optimizedResult.width, height: optimizedResult.height },
        });
        onSelectAsset({ url: stored.dataUrl, name: stored.name, type: 'image' });
      } else {
        const stored = await registerImmutableAsset(finalName, 'image', previewUrl);
        onSelectAsset({ url: stored.dataUrl, name: stored.name, type: 'image' });
      }
      onClose();
    } catch (err) {
      console.error('Error guardando asset:', err);
      // Fallback: usar preview directo
      onSelectAsset({
        url: previewUrl,
        name: assetName.trim() || (isVideoSelected ? 'Video' : 'Imagen'),
        type: isVideoSelected ? 'video' : 'image',
        posterUrl: videoPosterDataUrl || undefined,
        durationSeconds: videoValidation?.durationSeconds,
      });
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // Seleccionar directamente desde la biblioteca
  const handleSelectFromLibrary = (asset: StoredAsset) => {
    onSelectAsset({
      url: asset.dataUrl,
      name: asset.name,
      type: asset.type === 'video' ? 'video' : 'image',
      videoAssetId: asset.type === 'video' ? asset.id : undefined,
      posterUrl: asset.posterDataUrl || asset.thumbnailUrl || asset.dataUrl,
      durationSeconds: asset.durationSeconds,
    });
    onClose();
  };

  // Confirmar URL externa
  const handleConfirmUrl = async () => {
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    const finalName = assetName.trim() || 'Recurso web';

    setIsProcessing(true);
    try {
      const isVideoUrl = /\.(mp4|webm)($|\?)/i.test(url);
      const stored = await registerImmutableAsset(finalName, isVideoUrl ? 'video' : 'image', url, url);
      onSelectAsset({
        url: stored.dataUrl,
        name: stored.name,
        type: isVideoUrl ? 'video' : 'image',
        videoAssetId: isVideoUrl ? stored.id : undefined,
      });
      onClose();
    } catch {
      const isVideoUrl = /\.(mp4|webm)($|\?)/i.test(url);
      onSelectAsset({
        url,
        name: finalName,
        type: isVideoUrl ? 'video' : 'image',
      });
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrar assets de la biblioteca
  const filteredAssets = storedAssets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'image') return a.type === 'image' || !a.type;
    if (filterType === 'video') return a.type === 'video';
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content asset-picker-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '640px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{modalTitle}</h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {mode === 'background' ? 'Encuadre 16:9 de Mesa' : 'Proporción y transparencia original'}
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'device' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'device' ? '#fbbf24' : '#94a3b8',
              borderBottom: activeTab === 'device' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            <span>Desde Dispositivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'library' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'library' ? '#fbbf24' : '#94a3b8',
              borderBottom: activeTab === 'library' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <FolderHeart size={16} />
            <span>Mi Biblioteca ({storedAssets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'url' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'url' ? '#fbbf24' : '#94a3b8',
              borderBottom: activeTab === 'url' ? '2px solid #fbbf24' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <LinkIcon size={16} />
            <span>Por Enlace</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* TAB 1: DESDE EL DISPOSITIVO */}
          {activeTab === 'device' && (
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
                      onClick={() => {
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
                      }}
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
                      onClick={handleConfirmDeviceUpload}
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
          )}

          {/* TAB 2: MI BIBLIOTECA */}
          {activeTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Buscador y Filtros */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Buscar en recursos guardados..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                {(mode === 'background' || mode === 'all') && (
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        background: filterType === 'all' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                        color: filterType === 'all' ? '#fbbf24' : '#94a3b8',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontWeight: filterType === 'all' ? 600 : 400,
                      }}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('image')}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        background: filterType === 'image' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                        color: filterType === 'image' ? '#fbbf24' : '#94a3b8',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontWeight: filterType === 'image' ? 600 : 400,
                      }}
                    >
                      Fotos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('video')}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        background: filterType === 'video' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                        color: filterType === 'video' ? '#fbbf24' : '#94a3b8',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        fontWeight: filterType === 'video' ? 600 : 400,
                      }}
                    >
                      Videos
                    </button>
                  </div>
                )}
              </div>

              {filteredAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <Sparkles size={32} className="text-amber-400" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>No hay imágenes guardadas aún.</p>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Sube una desde la pestaña "Desde Dispositivo" para empezar tu colección local.
                  </span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '12px',
                      maxHeight: '380px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredAssets.slice(0, visibleCount).map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => handleSelectFromLibrary(asset)}
                        style={{
                          position: 'relative',
                          aspectRatio: mode === 'background' ? '16/9' : '1/1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: '#090d16',
                          cursor: 'pointer',
                          transition: 'transform 0.15s, border-color 0.15s',
                        }}
                        title={asset.name}
                      >
                        <img
                          src={asset.thumbnailUrl || asset.dataUrl}
                          alt={asset.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: mode === 'background' ? 'cover' : 'contain',
                          }}
                        />
                        {asset.type === 'video' && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              padding: '2px 5px',
                              background: 'rgba(0,0,0,0.75)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.65rem',
                              color: '#fbbf24',
                              fontWeight: 600,
                            }}
                          >
                            <Play size={8} fill="#fbbf24" />
                            <span>{formatVideoDuration(asset.durationSeconds || 0)}</span>
                          </div>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                            padding: '4px 6px',
                            fontSize: '0.72rem',
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {asset.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredAssets.length > visibleCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 24)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#cbd5e1',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        margin: '8px auto 0',
                        display: 'block',
                      }}
                    >
                      Cargar más recursos ({filteredAssets.length - visibleCount} restantes)
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: POR ENLACE */}
          {activeTab === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  URL de la imagen web
                </label>
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/fondo.jpg"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="ej: Bosque Sombrío"
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

              <button
                type="button"
                onClick={handleConfirmUrl}
                disabled={!customUrlInput.trim() || isProcessing}
                style={{
                  padding: '12px',
                  background: customUrlInput.trim() ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '10px',
                  color: customUrlInput.trim() ? '#fff' : '#6b7280',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: customUrlInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <Check size={18} />
                <span>Usar Enlace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
