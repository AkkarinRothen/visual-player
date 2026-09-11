import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Map as MapIcon,
  Image as ImageIcon,
  Trash2,
  Copy,
  Send,
  Plus,
  Search,
} from 'lucide-react';
import type { HandoutState, HandoutType } from '../../../types';
import { optimizeImage } from '../../../utils/imageOptimizer';

interface HandoutLibraryViewProps {
  savedHandouts: HandoutState[];
  activeHandout?: HandoutState | null;
  onSelectHandout: (handout: HandoutState) => void;
  onProjectHandout: (handout: HandoutState) => Promise<void>;
  onDismissHandout: () => Promise<void>;
  onSaveHandouts?: (handouts: HandoutState[]) => Promise<void>;
  onDeleteHandout?: (id: string) => Promise<void>;
  onCreateNew: (type: HandoutType) => void;
}

export const HandoutLibraryView: React.FC<HandoutLibraryViewProps> = ({
  savedHandouts,
  activeHandout,
  onSelectHandout,
  onProjectHandout,
  onDismissHandout,
  onSaveHandouts,
  onDeleteHandout,
  onCreateNew,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const optimized = await optimizeImage(file, 'background');
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const isLikelyMap = baseName.toLowerCase().includes('map') || baseName.toLowerCase().includes('mapa');

      const newHandout: HandoutState = {
        id: `handout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: baseName || 'Nueva Imagen de Galería',
        type: isLikelyMap ? 'map' : 'image',
        imageUrl: optimized.dataUrl,
        revealedRects: [],
        revealedCircles: [],
        isFullyRevealed: !isLikelyMap,
        zoom: 1.0,
        panOffset: { x: 0, y: 0 },
        createdAt: Date.now(),
      };

      const updated = [newHandout, ...savedHandouts];
      await onSaveHandouts?.(updated);
      onSelectHandout(newHandout);
    } catch (err) {
      console.error('Error al importar imagen como handout:', err);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDuplicate = async (handout: HandoutState, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: HandoutState = {
      ...JSON.parse(JSON.stringify(handout)),
      id: `handout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${handout.title} (Copia)`,
      createdAt: Date.now(),
    };
    const updated = [copy, ...savedHandouts];
    await onSaveHandouts?.(updated);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este handout de la campaña?')) {
      if (onDeleteHandout) {
        await onDeleteHandout(id);
      } else if (onSaveHandouts) {
        await onSaveHandouts(savedHandouts.filter((h) => h.id !== id));
      }
    }
  };

  const filtered = savedHandouts.filter((h) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.textContent && h.textContent.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'all') return true;
    if (filterType === 'image') return h.type === 'image' || (!h.type && !h.textContent && !h.revealedRects?.length);
    if (filterType === 'map') return h.type === 'map' || (!h.type && Boolean(h.revealedRects?.length || h.revealedCircles?.length));
    if (filterType === 'document') return h.type === 'document' || Boolean(h.textContent);
    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-4 bg-slate-950/70 overflow-hidden">
      {/* Hidden File Input for Gallery / Local Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TOP CONTROLS & FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filterType === 'all'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            ⭐ Todos ({savedHandouts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('image')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterType === 'image'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <ImageIcon size={13} />
            <span>Imágenes</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('map')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterType === 'map'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <MapIcon size={13} />
            <span>Mapas (Fog)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('document')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterType === 'document'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <FileText size={13} />
            <span>Documentos</span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar handout..."
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-36 sm:w-48 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Import Button */}
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Importar foto o mapa desde el dispositivo"
          >
            <Upload size={13} className="text-blue-400" />
            <span>{isImporting ? 'Cargando…' : 'Subir Imagen/Mapa'}</span>
          </button>

          {/* New Document Button */}
          <button
            type="button"
            onClick={() => onCreateNew('document')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40 active:scale-95"
            title="Crear nueva carta o pergamino temático"
          >
            <Plus size={13} />
            <span>Nueva Carta</span>
          </button>
        </div>
      </div>

      {/* HANDOUTS GRID */}
      <div className="flex-1 overflow-y-auto pt-4">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 gap-3">
            <div className="text-3xl">📜</div>
            <div className="font-semibold text-slate-400">No hay handouts en esta categoría</div>
            <div className="text-xs max-w-sm">
              Subí una imagen de tu galería o creá un pergamino temático para compartirlo en directo con tus jugadores.
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              >
                Subir Imagen / Mapa
              </button>
              <button
                type="button"
                onClick={() => onCreateNew('document')}
                className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-amber-100 text-xs font-medium"
              >
                Crear Documento
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((handout) => {
              const isProjected = activeHandout?.id === handout.id;
              const isDoc = handout.type === 'document' || Boolean(handout.textContent);
              const isMap = handout.type === 'map' || Boolean(handout.revealedRects?.length);

              return (
                <div
                  key={handout.id}
                  onClick={() => onSelectHandout(handout)}
                  className={`group relative rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer select-none ${
                    isProjected
                      ? 'bg-slate-900/95 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/60'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-md'
                  }`}
                >
                  {/* CARD PREVIEW THUMBNAIL */}
                  <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 mb-3">
                    {isDoc ? (
                      <div className="w-full h-full p-3 bg-[#f6eedb] text-[#2a1708] flex flex-col justify-between font-serif text-[10px] leading-tight">
                        <div className="font-bold border-b border-amber-900/30 pb-1 line-clamp-1">
                          {handout.title}
                        </div>
                        <div className="line-clamp-4 italic opacity-85">
                          {handout.textContent || 'Documento sin contenido...'}
                        </div>
                        <div className="text-[9px] text-right font-bold text-amber-900">
                          {handout.authorSeal || '⚜️ Sello'}
                        </div>
                      </div>
                    ) : handout.imageUrl ? (
                      <img
                        src={handout.imageUrl}
                        alt={handout.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-slate-600 text-2xl">🖼️</div>
                    )}

                    {/* TYPE BADGE */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 flex items-center gap-1">
                      {isDoc ? (
                        <>
                          <span>📜</span>
                          <span>Documento</span>
                        </>
                      ) : isMap ? (
                        <>
                          <span>🗺️</span>
                          <span>Mapa</span>
                        </>
                      ) : (
                        <>
                          <span>🖼️</span>
                          <span>Imagen</span>
                        </>
                      )}
                    </div>

                    {/* LIVE IN MESA STATUS */}
                    {isProjected && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>En Mesa</span>
                      </div>
                    )}
                  </div>

                  {/* CARD TITLE & INFO */}
                  <div className="flex-1 mb-3">
                    <h4 className="font-bold text-slate-100 text-sm line-clamp-1 mb-0.5 group-hover:text-amber-400 transition-colors">
                      {handout.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {handout.subtitle || (handout.pages && handout.pages.length > 1 ? `${handout.pages.length} páginas` : '1 página')}
                    </p>
                  </div>

                  {/* CARD ACTIONS */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-1.5">
                    {isProjected ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissHandout();
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Trash2 size={12} />
                        <span>Retirar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectHandout(handout);
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                      >
                        <Send size={12} />
                        <span>Proyectar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(handout, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Duplicar handout"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(handout.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar handout"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
