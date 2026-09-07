import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { X, Upload, Image as ImageIcon, Link as LinkIcon, FolderHeart } from 'lucide-react';
import { db, registerImmutableAsset, registerOptimizedAsset, type StoredAsset } from '../../db';
import { type OptimizedImageResult } from '../../utils/imageOptimizer';
import { type VideoValidationResult } from '../../utils/videoOptimizer';
import { ResourcePacksModal } from '../master/modals/ResourcePacksModal';
import { ModalErrorBoundary } from './ModalErrorBoundary';
import { AssetPickerDeviceTab } from './assetPicker/AssetPickerDeviceTab';
import { AssetPickerLibraryTab } from './assetPicker/AssetPickerLibraryTab';
import { AssetPickerUrlTab } from './assetPicker/AssetPickerUrlTab';
import type { SelectedAssetResult, AssetPickerMode } from './assetPicker/assetPickerTypes';

export type { SelectedAssetResult, AssetPickerMode };

export interface AssetPickerModalProps {
  isOpen: boolean;
  mode: AssetPickerMode;
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
  const storedAssets = useLiveQuery(async () => {
    let rawAssets: StoredAsset[];
    if (mode === 'character' || mode === 'prop') {
      rawAssets = await db.assets.where('type').equals('image').reverse().sortBy('createdAt');
    } else {
      rawAssets = await db.assets.reverse().sortBy('createdAt');
      rawAssets = rawAssets.filter((asset) => asset.type === 'image' || asset.type === 'video');
    }

    // Keep only metadata and thumbnails in React; full files are resolved on selection.
    return rawAssets.map((asset) => ({
      id: asset.id,
      name: asset.name || 'Sin nombre',
      type: asset.type || 'image',
      thumbnailUrl: asset.thumbnailUrl || asset.dataUrl,
      dataUrl: asset.thumbnailUrl || asset.dataUrl || '',
      category: asset.category,
      tags: asset.tags || [],
      packId: asset.packId,
      packName: asset.packName,
      createdAt: asset.createdAt,
      durationSeconds: asset.durationSeconds,
      posterDataUrl: asset.posterDataUrl,
    }));
  }, [mode], []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedPackFilter, setSelectedPackFilter] = useState<string>('all');
  const [isPacksModalOpen, setIsPacksModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl);
  const [assetName, setAssetName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [optimizedResult, setOptimizedResult] = useState<OptimizedImageResult | null>(null);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);

  // Video-specific state
  const [isVideoSelected, setIsVideoSelected] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoValidation, setVideoValidation] = useState<VideoValidationResult | null>(null);
  const [videoPosterDataUrl, setVideoPosterDataUrl] = useState<string | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  // Resetear el estado de edición cada vez que se abre el selector.
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentUrl);
      setAssetName('');
      setCustomUrlInput('');
      setOptimizedResult(null);
      setKeepOriginal(false);
      setErrorMessage(null);
      setVisibleCount(24);
      // Al elegir retrato de personaje, abrir directamente en la biblioteca
      setActiveTab(mode === 'character' ? 'library' : 'device');
      setIsVideoSelected(false);
      setVideoFile(null);
      setVideoValidation(null);
      setVideoPosterDataUrl(null);
      setFilterType('all');
      setSelectedPackFilter('all');
      setIsPacksModalOpen(false);
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
  }, [isOpen, currentUrl, mode]);

  // Priorizar automáticamente un pack de personajes al abrir la biblioteca.
  useEffect(() => {
    if (!isOpen || mode !== 'character' || storedAssets.length === 0) return;
    const charPack = storedAssets.find(
      (asset) =>
        asset.packId &&
        ((asset.category && ['character', 'portrait', 'token'].includes(asset.category)) ||
          (asset.packName && /avatar|retrato|portrait|personaje|heroe|hero|fabula/i.test(asset.packName)) ||
          (asset.name && /avatar|hero|guerrero|mago|clerigo|ladron|personaje/i.test(asset.name)))
    );
    if (charPack?.packId) {
      setSelectedPackFilter((current) => current === 'all' ? charPack.packId! : current);
    }
  }, [isOpen, mode, storedAssets]);

  const modalTitle =
    title ||
    (mode === 'background'
      ? 'Elegir Fondo de Escena'
      : mode === 'character'
      ? 'Elegir Retrato de Personaje'
      : 'Elegir Imagen o Video');

  // Confirmar y registrar en almacenamiento local
  const handleConfirmDeviceUpload = async () => {
    if (!previewUrl && !videoFile) return;

    setIsProcessing(true);
    try {
      const finalName = assetName.trim() || (isVideoSelected ? 'Video sin título' : 'Imagen sin título');

      if (isVideoSelected && videoFile && videoValidation) {
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

  // Seleccionar directamente desde la biblioteca (con resolución asíncrona de dataUrl bajo demanda)
  const handleSelectFromLibrary = async (asset: StoredAsset) => {
    try {
      let finalUrl = asset.dataUrl;
      if (!finalUrl) {
        const full = await db.assets.get(asset.id);
        finalUrl = full?.dataUrl || asset.thumbnailUrl || '';
      }
      onSelectAsset({
        url: finalUrl,
        name: asset.name || 'Recurso',
        type: asset.type === 'video' ? 'video' : 'image',
        videoAssetId: asset.type === 'video' ? asset.id : undefined,
        posterUrl: asset.posterDataUrl || asset.thumbnailUrl || finalUrl,
        durationSeconds: asset.durationSeconds,
      });
      onClose();
    } catch (err) {
      console.error('Error al resolver recurso:', err);
      onSelectAsset({
        url: asset.thumbnailUrl || asset.dataUrl || '',
        name: asset.name || 'Recurso',
        type: asset.type === 'video' ? 'video' : 'image',
      });
      onClose();
    }
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

  const handlePreviewUrl = async () => {
    const url = customUrlInput.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url, toolbarColor: '#090a0f' });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // La pestaña URL muestra una acción inerte hasta recibir una URL válida.
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <ModalErrorBoundary modalTitle={modalTitle} onClose={onClose}>
      <div className="modal-overlay asset-picker-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
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
            {activeTab === 'device' && (
              <AssetPickerDeviceTab
                mode={mode}
                previewUrl={previewUrl}
                setPreviewUrl={setPreviewUrl}
                assetName={assetName}
                setAssetName={setAssetName}
                errorMessage={errorMessage}
                setErrorMessage={setErrorMessage}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                optimizedResult={optimizedResult}
                setOptimizedResult={setOptimizedResult}
                keepOriginal={keepOriginal}
                setKeepOriginal={setKeepOriginal}
                isVideoSelected={isVideoSelected}
                setIsVideoSelected={setIsVideoSelected}
                videoFile={videoFile}
                setVideoFile={setVideoFile}
                videoValidation={videoValidation}
                setVideoValidation={setVideoValidation}
                videoPosterDataUrl={videoPosterDataUrl}
                setVideoPosterDataUrl={setVideoPosterDataUrl}
                videoObjectUrl={videoObjectUrl}
                setVideoObjectUrl={setVideoObjectUrl}
                onConfirmUpload={handleConfirmDeviceUpload}
              />
            )}

            {activeTab === 'library' && (
              <AssetPickerLibraryTab
                mode={mode}
                storedAssets={storedAssets}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterType={filterType}
                setFilterType={setFilterType}
                selectedPackFilter={selectedPackFilter}
                setSelectedPackFilter={setSelectedPackFilter}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                onSelectFromLibrary={handleSelectFromLibrary}
                onOpenResourcePacksModal={() => setIsPacksModalOpen(true)}
              />
            )}

            {activeTab === 'url' && (
              <AssetPickerUrlTab
                customUrlInput={customUrlInput}
                setCustomUrlInput={setCustomUrlInput}
                assetName={assetName}
                setAssetName={setAssetName}
                isProcessing={isProcessing}
                onConfirmUrl={handleConfirmUrl}
                onPreviewUrl={handlePreviewUrl}
              />
            )}
          </div>
        </div>

        <ResourcePacksModal
          isOpen={isPacksModalOpen}
          onClose={() => setIsPacksModalOpen(false)}
        />
      </div>
    </ModalErrorBoundary>
  );

  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return modalContent;
};
