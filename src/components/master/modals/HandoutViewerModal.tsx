import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { HandoutState, HandoutType } from '../../../types';
import type { HandoutViewTab } from '../handout/handoutTypes';
import { useHandoutEditor } from '../handout/useHandoutEditor';
import { HandoutHeader } from '../handout/HandoutHeader';
import { HandoutMultipageBar } from '../handout/HandoutMultipageBar';
import { HandoutToolbar } from '../handout/HandoutToolbar';
import { HandoutCanvasWorkspace } from '../handout/HandoutCanvasWorkspace';
import { HandoutFooter } from '../handout/HandoutFooter';
import { HandoutLibraryView } from '../handout/HandoutLibraryView';
import { HandoutDocumentEditor } from '../handout/HandoutDocumentEditor';

export interface HandoutViewerModalProps {
  isOpen: boolean;
  activeHandout?: HandoutState | null;
  savedHandouts?: HandoutState[];
  onProjectHandout: (handout: HandoutState) => Promise<void>;
  onDismissHandout: () => Promise<void>;
  onSaveHandouts?: (handouts: HandoutState[]) => Promise<void>;
  onDeleteHandout?: (handoutId: string) => Promise<void>;
  onClose: () => void;
}

export const HandoutViewerModal: React.FC<HandoutViewerModalProps> = ({
  isOpen,
  activeHandout,
  savedHandouts = [],
  onProjectHandout,
  onDismissHandout,
  onSaveHandouts,
  onDeleteHandout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HandoutViewTab>('editor');

  const editor = useHandoutEditor({
    activeHandout,
    savedHandouts,
    onProjectHandout,
  });

  const isCurrentPageDocument =
    editor.currentPage.type === 'document' ||
    (Boolean(editor.currentPage.textContent) && !editor.currentPage.imageUrl);

  const handleCreateNew = async (type: HandoutType) => {
    if (type === 'document') {
      const newDoc: HandoutState = {
        id: `handout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: 'Nueva Carta Sellada',
        type: 'document',
        textContent: 'Mi fiel compañero:\n\nSi estás leyendo esta carta...',
        theme: 'parchment',
        typography: 'medieval',
        authorSeal: '⚜️ Sello del Consejo',
        revealedRects: [],
        revealedCircles: [],
        isFullyRevealed: true,
        zoom: 1.0,
        panOffset: { x: 0, y: 0 },
        createdAt: Date.now(),
      };
      await onSaveHandouts?.([newDoc, ...savedHandouts]);
      editor.selectHandout(newDoc);
      setActiveTab('editor');
    } else {
      const newHandout: HandoutState = {
        id: `handout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: type === 'map' ? 'Nuevo Mapa Táctico' : 'Nueva Imagen',
        type,
        imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
        revealedRects: [],
        revealedCircles: [],
        isFullyRevealed: type !== 'map',
        zoom: 1.0,
        panOffset: { x: 0, y: 0 },
        createdAt: Date.now(),
      };
      await onSaveHandouts?.([newHandout, ...savedHandouts]);
      editor.selectHandout(newHandout);
      setActiveTab('editor');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 outline-none"
        >
          <div className="relative w-full max-w-5xl h-[94vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <Dialog.Title className="sr-only">Visor de Handout</Dialog.Title>

            {/* MODAL HEADER WITH TABS */}
            <HandoutHeader
              isCurrentlyProjected={editor.isCurrentlyProjected}
              mesaPageIndex={editor.mesaPageIndex}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={onClose}
            />

            {activeTab === 'library' ? (
              /* LIBRARY VIEW */
              <HandoutLibraryView
                savedHandouts={savedHandouts}
                activeHandout={activeHandout}
                onSelectHandout={(handout) => {
                  editor.selectHandout(handout);
                  setActiveTab('editor');
                }}
                onProjectHandout={onProjectHandout}
                onDismissHandout={onDismissHandout}
                onSaveHandouts={onSaveHandouts}
                onDeleteHandout={onDeleteHandout}
                onCreateNew={handleCreateNew}
              />
            ) : (
              /* EDITOR VIEW */
              <>
                {/* MULTIPAGE TAB BAR */}
                <HandoutMultipageBar
                  draftPages={editor.draftPages}
                  safeEditorIdx={editor.safeEditorIdx}
                  mesaPageIndex={editor.mesaPageIndex}
                  isCurrentlyProjected={editor.isCurrentlyProjected}
                  isThisPageOnMesa={editor.isThisPageOnMesa}
                  onSelectPage={editor.setEditorPageIndex}
                  onAddPage={editor.handleAddPage}
                  onRemovePage={editor.handleRemovePage}
                  onPublishPageToMesa={editor.handlePublishPageToMesa}
                />

                {isCurrentPageDocument ? (
                  /* DOCUMENT / PARCHMENT EDITOR */
                  <HandoutDocumentEditor
                    currentPage={editor.currentPage}
                    fallbackTitle={editor.currentHandout.title}
                    onUpdatePage={(updater) => editor.updateCurrentPage(updater, editor.isCurrentlyProjected)}
                  />
                ) : (
                  /* IMAGE / MAP WORKSPACE WITH FOG OF WAR */
                  <>
                    {/* TOOLBAR CONTROLS */}
                    <HandoutToolbar
                      touchMode={editor.touchMode}
                      setTouchMode={editor.setTouchMode}
                      brushRadius={editor.brushRadius}
                      setBrushRadius={editor.setBrushRadius}
                      totalRevealedShapes={editor.totalRevealedShapes}
                      onUndo={editor.handleUndo}
                      onResetFog={editor.handleResetFog}
                      onRevealAll={editor.handleRevealAll}
                      zoom={editor.currentPage.zoom}
                      onZoom={editor.handleZoom}
                      onResetView={editor.handleResetView}
                    />

                    {/* WORKSPACE PREVIEW AREA */}
                    <HandoutCanvasWorkspace
                      containerRef={editor.containerRef}
                      imgRef={editor.imgRef}
                      currentPage={editor.currentPage}
                      fallbackTitle={editor.currentHandout.title}
                      touchMode={editor.touchMode}
                      brushRadius={editor.brushRadius}
                      isDrawing={editor.isDrawing}
                      currentDragRect={editor.currentDragRect}
                      strokeCircles={editor.strokeCircles}
                      onPointerDown={editor.handlePointerDown}
                      onPointerMove={editor.handlePointerMove}
                      onPointerUp={editor.handlePointerUp}
                    />
                  </>
                )}

                {/* MODAL FOOTER */}
                <HandoutFooter
                  pageTitle={editor.currentPage.title || editor.currentHandout.title}
                  imageUrl={editor.currentPage.imageUrl}
                  isCurrentlyProjected={editor.isCurrentlyProjected}
                  isThisPageOnMesa={editor.isThisPageOnMesa}
                  safeEditorIdx={editor.safeEditorIdx}
                  onChangeTitle={(title) => editor.updateCurrentPage((page) => ({ ...page, title }))}
                  onChangeImageUrl={(imageUrl) => editor.updateCurrentPage((page) => ({ ...page, imageUrl }))}
                  onDismissHandout={onDismissHandout}
                  onPublishPageToMesa={editor.handlePublishPageToMesa}
                />
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
