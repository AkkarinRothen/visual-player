import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { GameSessionPackage, ImportDiffSummary } from '../../../../types';
import { Upload, Copy } from 'lucide-react';

export interface DiffReviewDialogProps {
  pendingImport: { pkg: GameSessionPackage; diff: ImportDiffSummary };
  isImporting: boolean;
  onClose: () => void;
  onExecuteImport: (asIndependentCopy: boolean) => void;
}

export const DiffReviewDialog: React.FC<DiffReviewDialogProps> = ({
  pendingImport,
  isImporting,
  onClose,
  onExecuteImport,
}) => {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !isImporting) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="session-dialog-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="session-dialog session-diff-dialog"
        >
        <div className="session-dialog-header">
          <Upload size={18} />
          <Dialog.Title>Inspección de Importación</Dialog.Title>
        </div>
        <p className="session-dialog-lead">
          Paquete: <strong>{pendingImport.diff.sessionName}</strong>
        </p>

        <div className="diff-summary-card">
          <div className="diff-stat-row">
            <span className="stat-label">Tipo de paquete:</span>
            <span className={`stat-val ${pendingImport.diff.isCompletePackage ? 'text-emerald-400' : 'text-amber-400'}`}>
              {pendingImport.diff.isCompletePackage ? '✓ Completo para Offline' : '⚠️ Incompleto (recursos externos)'}
            </span>
          </div>
          <div className="diff-stat-row">
            <span className="stat-label">Escenas en el paquete:</span>
            <span className="stat-val">
              {pendingImport.diff.scenesCount} ({pendingImport.diff.newScenesCount} nuevas)
            </span>
          </div>
          <div className="diff-stat-row">
            <span className="stat-label">Personajes en el paquete:</span>
            <span className="stat-val">{pendingImport.diff.charactersCount}</span>
          </div>
        </div>

        <p className="session-dialog-hint">
          Por seguridad, se recomienda importar como una <strong>copia independiente</strong> para garantizar que tus escenas y personajes actuales no sufran alteraciones.
        </p>

        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose} disabled={isImporting}>
            Cancelar
          </button>
          <button className="btn-dialog-confirm" onClick={() => onExecuteImport(true)} disabled={isImporting}>
            <Copy size={14} /> Importar como copia independiente (Recomendado)
          </button>
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
