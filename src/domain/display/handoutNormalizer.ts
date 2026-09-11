import type { HandoutPage, HandoutState } from '../../types';

export interface NormalizedHandout {
  pages: HandoutPage[];
  activePageIndex: number;
  activePage: HandoutPage;
}

/**
 * Normalizes any HandoutState (legacy single-page or modern multipage) into
 * a robust multipage structure with safe default values for zoom, pan, masks,
 * and multi-type document metadata.
 */
export function normalizeHandoutState(handout: HandoutState): NormalizedHandout {
  const inferType = (
    explicitType?: string,
    text?: string,
    rects?: any[],
    circles?: any[]
  ) => {
    if (explicitType === 'document' || explicitType === 'map' || explicitType === 'image') {
      return explicitType;
    }
    if (text && text.trim().length > 0) return 'document';
    if ((rects && rects.length > 0) || (circles && circles.length > 0)) return 'map';
    return 'image';
  };

  if (handout.pages && handout.pages.length > 0) {
    const safePages: HandoutPage[] = handout.pages.map((p, idx) => {
      const pageType = inferType(
        p.type || handout.type,
        p.textContent || handout.textContent,
        p.revealedRects,
        p.revealedCircles
      );

      return {
        id: p.id || `page-${idx + 1}`,
        pageNumber: p.pageNumber || idx + 1,
        title: p.title || handout.title,
        subtitle: p.subtitle || handout.subtitle,
        type: pageType,
        imageUrl: p.imageUrl || handout.imageUrl || '',
        textContent: p.textContent || handout.textContent,
        theme: p.theme || handout.theme || 'parchment',
        typography: p.typography || handout.typography || 'medieval',
        authorSeal: p.authorSeal || handout.authorSeal,
        revealedRects: Array.isArray(p.revealedRects) ? p.revealedRects : [],
        revealedCircles: Array.isArray(p.revealedCircles) ? p.revealedCircles : [],
        isFullyRevealed: Boolean(p.isFullyRevealed),
        zoom: typeof p.zoom === 'number' ? p.zoom : 1.0,
        panOffset: p.panOffset || { x: 0, y: 0 },
      };
    });

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
  const fallbackType = inferType(
    handout.type,
    handout.textContent,
    handout.revealedRects,
    handout.revealedCircles
  );

  const fallbackPage: HandoutPage = {
    id: `${handout.id}-p1`,
    pageNumber: 1,
    title: handout.title,
    subtitle: handout.subtitle,
    type: fallbackType,
    imageUrl: handout.imageUrl || '',
    textContent: handout.textContent,
    theme: handout.theme || 'parchment',
    typography: handout.typography || 'medieval',
    authorSeal: handout.authorSeal,
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
