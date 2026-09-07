import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { HandoutState } from '../../../types';
import { useHandoutEditor } from '../handout/useHandoutEditor';
import { HandoutHeader } from '../handout/HandoutHeader';
import { HandoutMultipageBar } from '../handout/HandoutMultipageBar';
import { HandoutToolbar } from '../handout/HandoutToolbar';
import { HandoutCanvasWorkspace } from '../handout/HandoutCanvasWorkspace';
import { HandoutFooter } from '../handout/HandoutFooter';

export interface HandoutViewerModalProps {
  isOpen: boolean;
  activeHandout?: HandoutState | null;
  savedHandouts?: HandoutState[];
  onProjectHandout: (handout: HandoutState) => Promise<void>;
  onDismissHandout: () => Promise<void>;
  onClose: () => void;
}

export const HandoutViewerModal: React.FC<HandoutViewerModalProps> = ({
  isOpen,
  activeHandout,
  savedHandouts = [],
  onProjectHandout,
  onDismissHandout,
  onClose,
}) => {
  const editor = useHandoutEditor({
    activeHandout,
    savedHandouts,
    onProjectHandout,
  });

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
        {/* MODAL HEADER */}
        <HandoutHeader
          isCurrentlyProjected={editor.isCurrentlyProjected}
          mesaPageIndex={editor.mesaPageIndex}
          onClose={onClose}
        />

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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
