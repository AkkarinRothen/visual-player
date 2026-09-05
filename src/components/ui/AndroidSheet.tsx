import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';

interface AndroidSheetProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  maxWidth?: number;
  onOpenChange: (open: boolean) => void;
}

export const AndroidSheet: React.FC<AndroidSheetProps> = ({
  open,
  title,
  eyebrow,
  children,
  maxWidth = 720,
  onOpenChange,
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
    <Drawer.Portal>
      <Drawer.Overlay className="android-sheet-overlay" />
      <Drawer.Content
        className="android-sheet-content"
        style={{ '--android-sheet-max-width': `${maxWidth}px` } as React.CSSProperties}
      >
        <div className="android-sheet-handle" aria-hidden="true" />
        <header className="android-sheet-header">
          <div className="android-sheet-title-block">
            {eyebrow && <span className="android-sheet-eyebrow">{eyebrow}</span>}
            <Drawer.Title className="android-sheet-title">{title}</Drawer.Title>
          </div>
          <Drawer.Close asChild>
            <button type="button" className="android-sheet-close" aria-label={`Cerrar ${title}`}>
              <X size={21} />
            </button>
          </Drawer.Close>
        </header>
        <div className="android-sheet-scroll">{children}</div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);
