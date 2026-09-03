import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Printer,
  Share2,
  Check,
  Edit3,
  Eye,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import type { Campaign, DisplayState, PublicChronicleDraft } from '../../../types';
import {
  generatePublicChronicleDraft,
  formatChronicleToMarkdown,
} from '../../../domain/session/chronicleExportGenerator';

interface SessionChronicleExportModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  liveState?: DisplayState;
  onClose: () => void;
}

export const SessionChronicleExportModal: React.FC<SessionChronicleExportModalProps> = ({
  isOpen,
  campaign,
  liveState,
  onClose,
}) => {
  if (!isOpen) return null;

  // Generate initial draft safely from allowed public fields
  const [draft, setDraft] = useState<PublicChronicleDraft>(() =>
    generatePublicChronicleDraft(campaign, liveState)
  );

  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const markdownContent = formatChronicleToMarkdown(draft);

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (draft.title || 'cronica-sesion')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  };

  const handlePrintOrPdf = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: draft.title,
          text: markdownContent,
        });
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      handleCopyToClipboard();
    }
  };

  const handleResetToAuto = () => {
    setDraft(generatePublicChronicleDraft(campaign, liveState));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh]">
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-amber-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base">
              Exportador de Crónica y Diario de Sesión
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('edit')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${
                  activeView === 'edit'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 size={13} />
                <span>Editar Borrador</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${
                  activeView === 'preview'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye size={13} />
                <span>Vista Previa (.md)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/70 space-y-4">
          {activeView === 'edit' ? (
            /* EDIT VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
                <span>
                  Proyección pública autorizada · Modificar estos campos no altera los registros originales de la campaña.
                </span>
                <button
                  type="button"
                  onClick={handleResetToAuto}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <Sparkles size={12} />
                  <span>Regenerar Borrador</span>
                </button>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Título del Documento
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Fecha / Etiqueta de Sesión
                  </label>
                  <input
                    type="text"
                    value={draft.sessionDateLabel}
                    onChange={(e) =>
                      setDraft({ ...draft, sessionDateLabel: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Synopsis */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Sinopsis de la Sesión
                </label>
                <textarea
                  rows={3}
                  value={draft.synopsis}
                  onChange={(e) => setDraft({ ...draft, synopsis: e.target.value })}
                  placeholder="Breve introducción narrativa de lo acontecido..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 resize-y"
                />
              </div>

              {/* Milestones */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>Hitos y Acontecimientos Clave (un hito por línea)</span>
                  <span className="text-[10px] text-slate-400">
                    {draft.keyMilestones.length} hitos
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={draft.keyMilestones.join('\n')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      keyMilestones: e.target.value
                        .split('\n')
                        .filter((line) => line.trim().length > 0),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-y"
                />
              </div>

              {/* Objectives */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex justify-between">
                  <span>Objetivos y Próximos Pasos (un objetivo por línea)</span>
                  <span className="text-[10px] text-slate-400">
                    {draft.activeQuestsOrObjectives.length} objetivos
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={draft.activeQuestsOrObjectives.join('\n')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      activeQuestsOrObjectives: e.target.value
                        .split('\n')
                        .filter((line) => line.trim().length > 0),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono resize-y"
                />
              </div>

              {/* Closing notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Notas de Cierre del DM (Avisos de inventario, fecha próxima sesión, etc.)
                </label>
                <input
                  type="text"
                  value={draft.dmClosingNotes || ''}
                  onChange={(e) => setDraft({ ...draft, dmClosingNotes: e.target.value })}
                  placeholder="Recordad subir de nivel y revisar hechizos..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                />
              </div>
            </div>
          ) : (
            /* PREVIEW VIEW */
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono whitespace-pre-wrap selection:bg-amber-600 selection:text-white leading-relaxed">
                {markdownContent}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {copySuccess ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copySuccess ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintOrPdf}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Printer size={13} />
              <span>Imprimir / PDF</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Share2 size={13} />
                <span>Compartir</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-900/40 transition-all active:scale-95"
          >
            <Download size={14} />
            <span>Descargar Markdown (.md)</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
