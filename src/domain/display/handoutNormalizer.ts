import type { HandoutPage, HandoutState } from '../../types';

export interface NormalizedHandout {
  pages: HandoutPage[];
  activePageIndex: number;
  activePage: HandoutPage;
}

/**
 * Normalizes any HandoutState (legacy single-page or modern multipage) into
 * a robust multipage structure with safe default values for zoom, pan, and masks.
 */
export function normalizeHandoutState(handout: HandoutState): NormalizedHandout {
  if (handout.pages && handout.pages.length > 0) {
    const safePages: HandoutPage[] = handout.pages.map((p, idx) => ({
      id: p.id || `page-${idx + 1}`,
      pageNumber: p.pageNumber || idx + 1,
      title: p.title,
      imageUrl: p.imageUrl,
      revealedRects: Array.isArray(p.revealedRects) ? p.revealedRects : [],
      revealedCircles: Array.isArray(p.revealedCircles) ? p.revealedCircles : [],
      isFullyRevealed: Boolean(p.isFullyRevealed),
      zoom: typeof p.zoom === 'number' ? p.zoom : 1.0,
      panOffset: p.panOffset || { x: 0, y: 0 },
    }));

    const safeIndex = Math.max(
      0,
      Math.min(safePages.length - 1, handout.activePageIndex ?? 0)
    );

    return {
      pages: safePages,
      activePageIndex: safeIndex,
      activePage: safePages[safeIndex],
    };
  }

  // Backward compatibility for single-page handouts
  const fallbackPage: HandoutPage = {
    id: `${handout.id}-p1`,
    pageNumber: 1,
    title: handout.title,
    imageUrl: handout.imageUrl || '',
    revealedRects: Array.isArray(handout.revealedRects) ? handout.revealedRects : [],
    revealedCircles: Array.isArray(handout.revealedCircles) ? handout.revealedCircles : [],
    isFullyRevealed: Boolean(handout.isFullyRevealed),
    zoom: typeof handout.zoom === 'number' ? handout.zoom : 1.0,
    panOffset: handout.panOffset || { x: 0, y: 0 },
  };

  return {
    pages: [fallbackPage],
    activePageIndex: 0,
    activePage: fallbackPage,
  };
}
