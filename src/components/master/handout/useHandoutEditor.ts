import { useState, useRef, useCallback } from 'react';
import type { HandoutState, HandoutPage, RevealedRegionRect, RevealedRegionCircle } from '../../../types';
import { normalizeHandoutState } from '../../../domain/display/handoutNormalizer';
import type { HandoutTouchMode, DragRect } from './handoutTypes';

export const DEFAULT_SAMPLE_HANDOUT: HandoutState = {
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

interface UseHandoutEditorProps {
  activeHandout?: HandoutState | null;
  savedHandouts?: HandoutState[];
  onProjectHandout: (handout: HandoutState) => Promise<void>;
}

export function useHandoutEditor({
  activeHandout,
  savedHandouts = [],
  onProjectHandout,
}: UseHandoutEditorProps) {
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
  const [touchMode, setTouchMode] = useState<HandoutTouchMode>('reveal-rect');
  const [brushRadius, setBrushRadius] = useState<number>(8); // 4%, 8%, 14%

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<DragRect | null>(null);
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

  const updateCurrentPage = useCallback(
    (updater: (p: HandoutPage) => HandoutPage, syncToMesa = false) => {
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
    },
    [draftPages, safeEditorIdx, currentHandout, mesaPageIndex, activeHandout, onProjectHandout]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [getImageRelativeCoords, touchMode, brushRadius]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [touchMode, isDrawing, drawStart, getImageRelativeCoords, brushRadius, isPanning, panStart, updateCurrentPage]
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [touchMode, isDrawing, currentDragRect, updateCurrentPage, strokeCircles, isPanning]
  );

  const handleUndo = useCallback(() => {
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
  }, [updateCurrentPage]);

  const handleResetFog = useCallback(() => {
    updateCurrentPage((page) => ({
      ...page,
      revealedRects: [],
      revealedCircles: [],
      isFullyRevealed: false,
    }));
  }, [updateCurrentPage]);

  const handleRevealAll = useCallback(() => {
    updateCurrentPage((page) => ({
      ...page,
      isFullyRevealed: true,
    }));
  }, [updateCurrentPage]);

  const handleZoom = useCallback(
    (delta: number) => {
      updateCurrentPage((page) => ({
        ...page,
        zoom: Math.max(1.0, Math.min(3.0, page.zoom + delta)),
      }));
    },
    [updateCurrentPage]
  );

  const handleResetView = useCallback(() => {
    updateCurrentPage((page) => ({
      ...page,
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
    }));
  }, [updateCurrentPage]);

  // Multipage Handlers
  const handleAddPage = useCallback(() => {
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
  }, [draftPages, currentPage.imageUrl]);

  const handleRemovePage = useCallback(
    (indexToRemove: number) => {
      if (draftPages.length <= 1) return;
      const nextPages = draftPages.filter((_, idx) => idx !== indexToRemove);
      setDraftPages(nextPages);
      setEditorPageIndex((prev) => Math.min(nextPages.length - 1, prev));
      setMesaPageIndex((prev) => Math.min(nextPages.length - 1, prev));
    },
    [draftPages]
  );

  const handlePublishPageToMesa = useCallback(() => {
    setMesaPageIndex(safeEditorIdx);
    const updatedHandout: HandoutState = {
      ...currentHandout,
      pages: draftPages,
      activePageIndex: safeEditorIdx,
    };
    setCurrentHandout(updatedHandout);
    onProjectHandout(updatedHandout);
  }, [safeEditorIdx, currentHandout, draftPages, onProjectHandout]);

  const isCurrentlyProjected = activeHandout?.id === currentHandout.id;
  const isThisPageOnMesa = isCurrentlyProjected && mesaPageIndex === safeEditorIdx;
  const totalRevealedShapes =
    (currentPage.revealedRects?.length || 0) + (currentPage.revealedCircles?.length || 0);

  return {
    currentHandout,
    draftPages,
    editorPageIndex,
    setEditorPageIndex,
    mesaPageIndex,
    safeEditorIdx,
    currentPage,
    touchMode,
    setTouchMode,
    brushRadius,
    setBrushRadius,
    isDrawing,
    currentDragRect,
    strokeCircles,
    containerRef,
    imgRef,
    updateCurrentPage,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleUndo,
    handleResetFog,
    handleRevealAll,
    handleZoom,
    handleResetView,
    handleAddPage,
    handleRemovePage,
    handlePublishPageToMesa,
    isCurrentlyProjected,
    isThisPageOnMesa,
    totalRevealedShapes,
  };
}
