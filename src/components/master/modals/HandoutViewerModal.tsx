import React, { useState, useRef, useCallback } from 'react';
import {
  FileText,
  X,
  Eye,
  EyeOff,
  Undo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Crop,
  Paintbrush,
  Send,
  Trash2,
  Check,
  Plus,
  Tv,
} from 'lucide-react';
import type { HandoutState, HandoutPage, RevealedRegionRect, RevealedRegionCircle } from '../../../types';
import { normalizeHandoutState } from '../../../domain/display/handoutNormalizer';

interface HandoutViewerModalProps {
  isOpen: boolean;
  activeHandout?: HandoutState | null;
  savedHandouts?: HandoutState[];
  onProjectHandout: (handout: HandoutState) => Promise<void>;
  onDismissHandout: () => Promise<void>;
  onClose: () => void;
}

const DEFAULT_SAMPLE_HANDOUT: HandoutState = {
  id: 'handout-ancient-map',
  title: 'Manuscrito y Mapa de las Catacumbas',
  imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
  revealedRects: [],
  revealedCircles: [],
  isFullyRevealed: false,
  zoom: 1.0,
  panOffset: { x: 0, y: 0 },
  isConfidential: false,
};

export const HandoutViewerModal: React.FC<HandoutViewerModalProps> = ({
  isOpen,
  activeHandout,
  savedHandouts = [],
  onProjectHandout,
  onDismissHandout,
  onClose,
}) => {
  if (!isOpen) return null;

  // Working draft handout structure with multipage normalization
  const [currentHandout, setCurrentHandout] = useState<HandoutState>(() => {
    if (activeHandout) return { ...activeHandout };
    if (savedHandouts.length > 0) return { ...savedHandouts[0] };
    return { ...DEFAULT_SAMPLE_HANDOUT };
  });

  const normalized = normalizeHandoutState(currentHandout);
  const [draftPages, setDraftPages] = useState<HandoutPage[]>(normalized.pages);
  const [editorPageIndex, setEditorPageIndex] = useState<number>(normalized.activePageIndex);
  const [mesaPageIndex, setMesaPageIndex] = useState<number>(normalized.activePageIndex);

  // Active page currently in editor view
  const safeEditorIdx = Math.max(0, Math.min(draftPages.length - 1, editorPageIndex));
  const currentPage = draftPages[safeEditorIdx] || draftPages[0];

  // Mode: 'pan' | 'reveal-rect' | 'reveal-brush'
  const [touchMode, setTouchMode] = useState<'pan' | 'reveal-rect' | 'reveal-brush'>('reveal-rect');
  const [brushRadius, setBrushRadius] = useState<number>(8); // 4%, 8%, 14%

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [strokeCircles, setStrokeCircles] = useState<RevealedRegionCircle[]>([]);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Helper to get normalized 0-100 coordinates relative to the image
  const getImageRelativeCoords = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
      if (!imgRef.current) return null;
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const clientX = e.clientX;
      const clientY = e.clientY;

      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      return { x, y };
    },
    []
  );

  const updateCurrentPage = (updater: (p: HandoutPage) => HandoutPage, syncToMesa = false) => {
    const nextPages = draftPages.map((p, idx) => (idx === safeEditorIdx ? updater(p) : p));
    setDraftPages(nextPages);

    const updatedHandout: HandoutState = {
      ...currentHandout,
      pages: nextPages,
      activePageIndex: syncToMesa ? safeEditorIdx : mesaPageIndex,
    };
    setCurrentHandout(updatedHandout);

    if (activeHandout && activeHandout.id === updatedHandout.id && (syncToMesa || mesaPageIndex === safeEditorIdx)) {
      onProjectHandout(updatedHandout);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const coords = getImageRelativeCoords(e);

    if (touchMode === 'reveal-rect') {
      if (!coords) return;
      setIsDrawing(true);
      setDrawStart(coords);
      setCurrentDragRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (touchMode === 'reveal-brush') {
      if (!coords) return;
      setIsDrawing(true);
      const newCircle: RevealedRegionCircle = {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cx: Math.round(coords.x * 10) / 10,
        cy: Math.round(coords.y * 10) / 10,
        r: brushRadius,
      };
      setStrokeCircles([newCircle]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      // Pan mode
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchMode === 'reveal-rect' && isDrawing && drawStart) {
      const coords = getImageRelativeCoords(e);
      if (!coords) return;

      const minX = Math.min(drawStart.x, coords.x);
      const minY = Math.min(drawStart.y, coords.y);
      const w = Math.abs(coords.x - drawStart.x);
      const h = Math.abs(coords.y - drawStart.y);

      setCurrentDragRect({ x: minX, y: minY, w, h });
    } else if (touchMode === 'reveal-brush' && isDrawing) {
      const coords = getImageRelativeCoords(e);
      if (!coords) return;

      const newCircle: RevealedRegionCircle = {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cx: Math.round(coords.x * 10) / 10,
        cy: Math.round(coords.y * 10) / 10,
        r: brushRadius,
      };
      setStrokeCircles((prev) => [...prev, newCircle]);
    } else if (touchMode === 'pan' && isPanning && panStart) {
      const dx = ((e.clientX - panStart.x) / window.innerWidth) * 40;
      const dy = ((e.clientY - panStart.y) / window.innerHeight) * 40;

      updateCurrentPage((page) => ({
        ...page,
        panOffset: {
          x: Math.max(-80, Math.min(80, page.panOffset.x + dx)),
          y: Math.max(-80, Math.min(80, page.panOffset.y + dy)),
        },
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    if (touchMode === 'reveal-rect' && isDrawing && currentDragRect) {
      setIsDrawing(false);
      setDrawStart(null);

      if (currentDragRect.w >= 2 && currentDragRect.h >= 2) {
        const newRect: RevealedRegionRect = {
          id: `rect-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          x: Math.round(currentDragRect.x * 10) / 10,
          y: Math.round(currentDragRect.y * 10) / 10,
          width: Math.round(currentDragRect.w * 10) / 10,
          height: Math.round(currentDragRect.h * 10) / 10,
        };

        updateCurrentPage((page) => ({
          ...page,
          revealedRects: [...page.revealedRects, newRect],
          isFullyRevealed: false,
        }));
      }
      setCurrentDragRect(null);
    } else if (touchMode === 'reveal-brush' && isDrawing) {
      setIsDrawing(false);
      if (strokeCircles.length > 0) {
        updateCurrentPage((page) => ({
          ...page,
          revealedCircles: [...(page.revealedCircles || []), ...strokeCircles],
          isFullyRevealed: false,
        }));
      }
      setStrokeCircles([]);
    } else if (touchMode === 'pan' && isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
  };

  const handleUndo = () => {
    updateCurrentPage((page) => {
      const circles = page.revealedCircles || [];
      if (circles.length > 0) {
        return { ...page, revealedCircles: circles.slice(0, -1) };
      }
      if (page.revealedRects.length > 0) {
        return { ...page, revealedRects: page.revealedRects.slice(0, -1) };
      }
      return page;
    });
  };

  const handleResetFog = () => {
    updateCurrentPage((page) => ({
      ...page,
      revealedRects: [],
      revealedCircles: [],
      isFullyRevealed: false,
    }));
  };

  const handleRevealAll = () => {
    updateCurrentPage((page) => ({
      ...page,
      isFullyRevealed: true,
    }));
  };

  const handleZoom = (delta: number) => {
    updateCurrentPage((page) => ({
      ...page,
      zoom: Math.max(1.0, Math.min(3.0, page.zoom + delta)),
    }));
  };

  const handleResetView = () => {
    updateCurrentPage((page) => ({
      ...page,
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
    }));
  };

  // Multipage Handlers
  const handleAddPage = () => {
    const newPage: HandoutPage = {
      id: `page-${Date.now()}`,
      pageNumber: draftPages.length + 1,
      title: `Página ${draftPages.length + 1}`,
      imageUrl: currentPage.imageUrl,
      revealedRects: [],
      revealedCircles: [],
      isFullyRevealed: false,
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
    };
    const nextPages = [...draftPages, newPage];
    setDraftPages(nextPages);
    setEditorPageIndex(nextPages.length - 1);
  };

  const handleRemovePage = (indexToRemove: number) => {
    if (draftPages.length <= 1) return;
    const nextPages = draftPages.filter((_, idx) => idx !== indexToRemove);
    setDraftPages(nextPages);
    setEditorPageIndex(Math.min(nextPages.length - 1, editorPageIndex));
    setMesaPageIndex(Math.min(nextPages.length - 1, mesaPageIndex));
  };

  const handlePublishPageToMesa = () => {
    setMesaPageIndex(safeEditorIdx);
    const updatedHandout: HandoutState = {
      ...currentHandout,
      pages: draftPages,
      activePageIndex: safeEditorIdx,
    };
    setCurrentHandout(updatedHandout);
    onProjectHandout(updatedHandout);
  };

  const isCurrentlyProjected = activeHandout?.id === currentHandout.id;
  const isThisPageOnMesa = isCurrentlyProjected && mesaPageIndex === safeEditorIdx;
  const totalRevealedShapes =
    (currentPage.revealedRects?.length || 0) + (currentPage.revealedCircles?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[94vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base">
              Visor de Handouts y Cartas
            </span>
            {isCurrentlyProjected ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Mesa: Pág. {mesaPageIndex + 1}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
                Borrador DM
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* MULTIPAGE TAB BAR */}
        <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {draftPages.map((page, idx) => {
              const isSelected = idx === safeEditorIdx;
              const isOnMesa = isCurrentlyProjected && idx === mesaPageIndex;
              return (
                <div key={page.id || idx} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setEditorPageIndex(idx)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-slate-800 text-amber-300 border border-amber-500/50 shadow'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                    }`}
                  >
                    <span>Pág. {idx + 1}</span>
                    {isOnMesa && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        title="Actualmente proyectada en la Mesa"
                      />
                    )}
                  </button>
                  {draftPages.length > 1 && isSelected && (
                    <button
                      type="button"
                      onClick={() => handleRemovePage(idx)}
                      className="ml-0.5 p-1 text-red-400 hover:text-red-300"
                      title="Eliminar esta página"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddPage}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 text-xs"
              title="Añadir una nueva página al documento"
            >
              <Plus size={13} />
              <span>Página</span>
            </button>
          </div>

          {/* Quick Publish Page to Mesa */}
          <div className="flex items-center gap-2">
            {!isThisPageOnMesa && isCurrentlyProjected && (
              <button
                type="button"
                onClick={handlePublishPageToMesa}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1 text-xs transition-all shadow"
                title="Mostrar esta página a los jugadores en la Mesa"
              >
                <Tv size={12} />
                <span>Mostrar Pág. {safeEditorIdx + 1} en Mesa</span>
              </button>
            )}
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setTouchMode('reveal-rect')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition-all ${
                touchMode === 'reveal-rect'
                  ? 'bg-amber-600 text-amber-50 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Arrastra un recuadro para recortar la niebla"
            >
              <Crop size={13} />
              <span>Recuadro</span>
            </button>

            <button
              type="button"
              onClick={() => setTouchMode('reveal-brush')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition-all ${
                touchMode === 'reveal-brush'
                  ? 'bg-amber-600 text-amber-50 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pincel circular para descubrir pistas gradualmente"
            >
              <Paintbrush size={13} />
              <span>Pincel</span>
            </button>

            <button
              type="button"
              onClick={() => setTouchMode('pan')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition-all ${
                touchMode === 'pan'
                  ? 'bg-blue-600 text-blue-50 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mover documento libremente sin pintar"
            >
              <Hand size={13} />
              <span>Mover</span>
            </button>
          </div>

          {/* Brush Radius Selector (Only visible in brush mode) */}
          {touchMode === 'reveal-brush' && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Radio:</span>
              <button
                type="button"
                onClick={() => setBrushRadius(4)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  brushRadius === 4 ? 'bg-amber-600 text-white' : 'text-slate-400'
                }`}
              >
                Fino
              </button>
              <button
                type="button"
                onClick={() => setBrushRadius(8)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  brushRadius === 8 ? 'bg-amber-600 text-white' : 'text-slate-400'
                }`}
              >
                Medio
              </button>
              <button
                type="button"
                onClick={() => setBrushRadius(14)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  brushRadius === 14 ? 'bg-amber-600 text-white' : 'text-slate-400'
                }`}
              >
                Grande
              </button>
            </div>
          )}

          {/* Reveal & Mask Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={totalRevealedShapes === 0}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center gap-1 transition-all"
              title="Deshacer último trazo o rectángulo"
            >
              <Undo2 size={13} />
              <span>Deshacer ({totalRevealedShapes})</span>
            </button>

            <button
              type="button"
              onClick={handleResetFog}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-all"
              title="Cubrir toda la página con niebla"
            >
              <EyeOff size={13} />
              <span>Ocultar Todo</span>
            </button>

            <button
              type="button"
              onClick={handleRevealAll}
              className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 flex items-center gap-1 transition-all"
              title="Revelar toda la página a los jugadores"
            >
              <Eye size={13} />
              <span>Revelar Todo</span>
            </button>
          </div>

          {/* Zoom and Navigation */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleZoom(-0.25)}
              className="p-1 rounded text-slate-400 hover:text-slate-200"
              title="Alejar"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono font-bold text-amber-300 w-10 text-center">
              {Math.round(currentPage.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.25)}
              className="p-1 rounded text-slate-400 hover:text-slate-200"
              title="Acercar"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 rounded text-slate-400 hover:text-slate-200 ml-1"
              title="Restablecer zoom y posición"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* WORKSPACE PREVIEW AREA */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center select-none ${
            touchMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Document container with current zoom/pan */}
          <div
            className="relative transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${currentPage.zoom}) translate(${currentPage.panOffset.x}%, ${currentPage.panOffset.y}%)`,
              transformOrigin: 'center center',
            }}
          >
            {/* The Document Image */}
            <img
              ref={imgRef}
              src={currentPage.imageUrl}
              alt={currentPage.title || currentHandout.title}
              className="max-h-[64vh] max-w-[85vw] object-contain rounded shadow-2xl pointer-events-none select-none"
              draggable={false}
            />

            {/* DM GHOST MASK PREVIEW: Shows what players see vs what is hidden */}
            {!currentPage.isFullyRevealed && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Dark translucent tint over all non-revealed areas (50% opacity) */}
                <div className="absolute inset-0 bg-black/55 backdrop-brightness-75" />

                {/* Render clear window cutouts for revealed rectangles */}
                {currentPage.revealedRects.map((rect) => (
                  <div
                    key={rect.id}
                    className="absolute border-2 border-dashed border-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                    style={{
                      left: `${rect.x}%`,
                      top: `${rect.y}%`,
                      width: `${rect.width}%`,
                      height: `${rect.height}%`,
                      background: 'rgba(255,255,255,0.01)',
                      backdropFilter: 'brightness(1.8) contrast(1.1)',
                    }}
                  >
                    <span className="absolute -top-4 left-0 text-[9px] px-1 bg-amber-950 text-amber-300 font-bold rounded">
                      Público
                    </span>
                  </div>
                ))}

                {/* Render clear circular cutouts for revealed circles */}
                {currentPage.revealedCircles?.map((circle) => (
                  <div
                    key={circle.id}
                    className="absolute border-2 border-dashed border-amber-400/90 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                    style={{
                      left: `${circle.cx - circle.r}%`,
                      top: `${circle.cy - circle.r}%`,
                      width: `${circle.r * 2}%`,
                      height: `${circle.r * 2}%`,
                      background: 'rgba(255,255,255,0.01)',
                      backdropFilter: 'brightness(1.8) contrast(1.1)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Active Dragging Rectangle preview */}
            {isDrawing && currentDragRect && (
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-500/20 pointer-events-none"
                style={{
                  left: `${currentDragRect.x}%`,
                  top: `${currentDragRect.y}%`,
                  width: `${currentDragRect.w}%`,
                  height: `${currentDragRect.h}%`,
                }}
              />
            )}

            {/* Active Brush Stroke preview */}
            {isDrawing && strokeCircles.length > 0 && (
              <>
                {strokeCircles.map((c) => (
                  <div
                    key={c.id}
                    className="absolute border border-emerald-400 rounded-full bg-emerald-500/25 pointer-events-none"
                    style={{
                      left: `${c.cx - c.r}%`,
                      top: `${c.cy - c.r}%`,
                      width: `${c.r * 2}%`,
                      height: `${c.r * 2}%`,
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Mode Overlay Tip */}
          <div className="absolute bottom-3 left-4 px-3 py-1 rounded bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300 pointer-events-none">
            {touchMode === 'reveal-brush' && (
              <span>🖌 Pincel Circular: Pinta o toca para despejar niebla con radio {brushRadius}%</span>
            )}
            {touchMode === 'reveal-rect' && (
              <span>✂️ Recuadro: Arrastra sobre la imagen para despejar esa región</span>
            )}
            {touchMode === 'pan' && <span>🖐 Modo Mover: Arrastra para desplazar el documento libremente</span>}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentPage.title || currentHandout.title}
              onChange={(e) =>
                updateCurrentPage((page) => ({ ...page, title: e.target.value }))
              }
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs w-48 sm:w-60"
              placeholder="Título de la Página"
            />
            <input
              type="text"
              value={currentPage.imageUrl}
              onChange={(e) =>
                updateCurrentPage((page) => ({ ...page, imageUrl: e.target.value }))
              }
              className="bg-slate-900 border border-slate-800 text-slate-400 rounded px-2 py-1 text-[11px] w-40 sm:w-60 hidden sm:block"
              placeholder="URL de imagen"
            />
          </div>

          <div className="flex items-center gap-2">
            {isCurrentlyProjected && (
              <button
                type="button"
                onClick={onDismissHandout}
                className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={13} />
                <span>Retirar de la Mesa</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePublishPageToMesa}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-900/40 transition-all active:scale-95"
            >
              {isThisPageOnMesa ? (
                <>
                  <Check size={14} />
                  <span>Actualizar en Mesa</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Proyectar Pág. {safeEditorIdx + 1} a la Mesa</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
