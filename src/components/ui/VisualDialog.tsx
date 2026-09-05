import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface VisualDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
}

export const VisualDialog: React.FC<VisualDialogProps> = ({
  open,
  title,
  children,
  className = '',
  onOpenChange,
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="visual-dialog-overlay" />
      <Dialog.Content className={`visual-dialog-content ${className}`}>
        <header className="visual-dialog-header">
          <Dialog.Title className="visual-dialog-title">{title}</Dialog.Title>
          <Dialog.Close asChild>
            <button type="button" className="visual-dialog-close" aria-label={`Cerrar ${title}`}>
              <X size={20} />
            </button>
          </Dialog.Close>
        </header>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
