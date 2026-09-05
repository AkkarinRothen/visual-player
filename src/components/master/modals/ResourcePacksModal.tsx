import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Package,
  Upload,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Eye,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { resourcePackService } from '../../../services/resourcePackService';
import type { InstalledResourcePack } from '../../../types';
import type { StoredAsset } from '../../../db';

export interface ResourcePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetsChanged?: () => void;
}

export const ResourcePacksModal: React.FC<ResourcePacksModalProps> = ({
  isOpen,
  onClose,
  onAssetsChanged,
}) => {
  const [packs, setPacks] = useState<InstalledResourcePack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewPack, setPreviewPack] = useState<InstalledResourcePack | null>(null);
  const [previewAssets, setPreviewAssets] = useState<StoredAsset[]>([]);
  const [visiblePreviewCount, setVisiblePreviewCount] = useState<number>(24);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadPacks();
      setStatusMessage(null);
      setPreviewPack(null);
      setPreviewAssets([]);
      setVisiblePreviewCount(24);
    }
  }, [isOpen]);

  const loadPacks = async () => {
    setIsLoading(true);
    try {
      const list = await resourcePackService.listInstalledPacks();
      setPacks(list);
    } catch (err: any) {
      setStatusMessage({ text: `Error al cargar paquetes: ${err?.message || err}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith('.vppack') && !file.name.endsWith('.json')) {
      setStatusMessage({ text: 'Por favor seleccioná un archivo de paquete de recursos (.vppack o .json)', type: 'error' });
      return;
    }

    setIsInstalling(true);
    setProgress(null);
    setStatusMessage(null);

    try {
      const installed = await resourcePackService.installPack(file, (current, total) => {
        setProgress({ current, total });
      });
      const mb = (file.size / (1024 * 1024)).toFixed(1);

      setStatusMessage({
        text: `¡Pack "${installed.name}" instalado con éxito! (${installed.itemCount} recursos disponibles, ~${mb} MB)`,
        type: 'success',
      });
      await loadPacks();
      onAssetsChanged?.();
    } catch (err: any) {
      setStatusMessage({ text: `Fallo en la instalación: ${err?.message || err}`, type: 'error' });
    } finally {
      setIsInstalling(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleUninstall = async (packId: string, packName: string) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que querés desinstalar el pack "${packName}"?\nSe eliminarán todos sus recursos de este dispositivo.`
    );
    if (!confirmDelete) return;

    try {
      const result = await resourcePackService.uninstallPack(packId);
      setStatusMessage({
        text: `Pack "${packName}" desinstalado. Se eliminaron ${result.deletedAssetsCount} recursos.`,
        type: 'success',
      });
      if (previewPack?.id === packId) {
        setPreviewPack(null);
        setPreviewAssets([]);
      }
      await loadPacks();
      onAssetsChanged?.();
    } catch (err: any) {
      setStatusMessage({ text: `Error al desinstalar: ${err?.message || err}`, type: 'error' });
    }
  };

  const handleOpenPreview = async (pack: InstalledResourcePack) => {
    setPreviewPack(pack);
    setVisiblePreviewCount(24);
    try {
      const assets = await resourcePackService.getPackAssets(pack.id);
      setPreviewAssets(assets);
    } catch (err: any) {
      setStatusMessage({ text: `No se pudieron cargar los recursos: ${err?.message || err}`, type: 'error' });
    }
  };

  if (!isOpen) return null;

  const totalSize = packs.reduce((acc, p) => acc + (p.totalSizeBytes || 0), 0);
  const totalAssetsCount = packs.reduce((acc, p) => acc + (p.itemCount || 0), 0);
  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100" role="dialog" aria-labelledby="resource-packs-modal-title" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package size={20} />
            </div>
            <div>
              <h2 id="resource-packs-modal-title" className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                Packs de Recursos Visuales
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal border border-amber-500/30">
                  Offline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {packs.length} packs instalados ({totalAssetsCount} recursos, ~{formatMB(totalSize)} MB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notificación de estado */}
        {statusMessage && (
          <div
            className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800/60'
                : 'bg-rose-950/80 text-rose-300 border-b border-rose-800/60'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="flex-1">{statusMessage.text}</span>
            <button type="button" onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {previewPack ? (
            /* Vista de Previsualización de Recursos del Pack */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => { setPreviewPack(null); setPreviewAssets([]); }}
                  className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  <ArrowLeft size={16} /> Volver a lista de packs
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  Mostrando {Math.min(visiblePreviewCount, previewAssets.length)} de {previewAssets.length} activos en "{previewPack.name}"
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                {previewAssets.slice(0, visiblePreviewCount).map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl overflow-hidden flex flex-col transition-all"
                  >
                    <div className="aspect-square w-full bg-slate-900/50 flex items-center justify-center overflow-hidden p-1">
                      <img
                        src={asset.thumbnailUrl || asset.dataUrl}
                        alt={asset.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2 text-[10px] text-slate-300 truncate text-center font-medium bg-slate-900/80">
                      {asset.name}
                    </div>
                  </div>
                ))}
              </div>

              {visiblePreviewCount < previewAssets.length && (
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setVisiblePreviewCount((prev) => prev + 24)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                  >
                    Cargar más (+24)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisiblePreviewCount(previewAssets.length)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
                  >
                    Mostrar todos ({previewAssets.length})
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Vista General: Instalador + Listado de Packs */
            <>
              {/* Zona de Arrastrar y Soltar / Subir */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-700/80 hover:border-amber-500/40 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vppack,.json"
                  className="hidden"
                  onChange={handleFileSelected}
                  disabled={isInstalling}
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                    <Upload size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {isInstalling ? 'Instalando paquete de recursos...' : 'Soltá un archivo .vppack aquí o hacé clic para instalar'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md">
                    Los packs curados comprimen y optimizan cientos de tokens o mapas a WebP para su uso inmediato offline.
                  </p>

                  {/* Barra de progreso si está instalando */}
                  {isInstalling && progress && (
                    <div className="w-full max-w-xs mt-3">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Extrayendo e indexando</span>
                        <span>{progress.current} / {progress.total}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-150"
                          style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Packs Instalados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <FolderArchive size={16} className="text-amber-400" />
                    Packs Instalados en este Dispositivo
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {packs.length} disponibles
                  </span>
                </div>

                {isLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                    Cargando biblioteca de packs...
                  </div>
                ) : packs.length === 0 ? (
                  <div className="py-12 border border-slate-800/80 rounded-2xl bg-slate-950/20 text-center space-y-2">
                    <Package size={32} className="mx-auto text-slate-600" />
                    <p className="text-sm text-slate-400 font-medium">No tenés ningún paquete instalado todavía</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Podés armar paquetes desde tu computadora con el comando <code className="text-amber-300 font-mono">npm run pack:create</code> o importar archivos .vppack descargados.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {packs.map((pack) => (
                      <div
                        key={pack.id}
                        className="bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 flex gap-3.5 items-center transition-all"
                      >
                        {/* Portada / Icono */}
                        <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {pack.coverDataUrl ? (
                            <img
                              src={pack.coverDataUrl}
                              alt={pack.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={24} className="text-slate-600" />
                          )}
                        </div>

                        {/* Datos */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {pack.category}
                            </span>
                            {pack.author && (
                              <span className="text-[11px] text-slate-400 truncate">
                                por {pack.author}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-100 truncate mt-1">
                            {pack.name}
                          </h4>

                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {pack.itemCount} recursos · {formatMB(pack.totalSizeBytes)} MB
                          </p>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(pack)}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors"
                            title="Ver recursos del pack"
                            aria-label={`Ver recursos de ${pack.name}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUninstall(pack.id, pack.name)}
                            className="p-2 rounded-lg bg-red-950/30 hover:bg-red-950/70 text-red-400 hover:text-red-300 border border-red-900/30 transition-colors"
                            title="Desinstalar pack y liberar memoria"
                            aria-label={`Desinstalar ${pack.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pie */}
        <footer className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span>Los recursos instalados aparecen organizados en el selector y creador de tokens.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Listo
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};
