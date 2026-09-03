import React, { useState } from 'react';
import {
  Film,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Wand2,
  Save,
  Send,
  Check,
  EyeOff,
} from 'lucide-react';
import type { Campaign, CampaignRecap, RecapSlide } from '../../../types';
import {
  generateRecapDraftFromCampaign,
  nextRecapSlide,
  prevRecapSlide,
  goToRecapSlide,
} from '../../../domain/session/campaignRecapGenerator';

interface CampaignRecapModalProps {
  isOpen: boolean;
  campaign: Campaign;
  activeRecap?: CampaignRecap | null;
  onProjectRecap: (recap: CampaignRecap) => Promise<void>;
  onDismissRecap: () => Promise<void>;
  onSaveRecap: (recap: CampaignRecap) => Promise<void>;
  onClose: () => void;
}

export const CampaignRecapModal: React.FC<CampaignRecapModalProps> = ({
  isOpen,
  campaign,
  activeRecap,
  onProjectRecap,
  onDismissRecap,
  onSaveRecap,
  onClose,
}) => {
  if (!isOpen) return null;

  const [recap, setRecap] = useState<CampaignRecap>(() => {
    if (activeRecap) return { ...activeRecap };
    if (campaign.savedRecap && campaign.savedRecap.slides.length > 0) {
      return { ...campaign.savedRecap };
    }
    return generateRecapDraftFromCampaign(campaign);
  });

  const [isSaved, setIsSaved] = useState(false);

  const isCurrentlyProjected = Boolean(activeRecap && activeRecap.id === recap.id);

  const handleGenerateFromJournal = () => {
    const draft = generateRecapDraftFromCampaign(campaign);
    setRecap(draft);
    setIsSaved(false);
  };

  const handleUpdateSlide = (index: number, updates: Partial<RecapSlide>) => {
    const nextSlides = recap.slides.map((s, i) => (i === index ? { ...s, ...updates } : s));
    const nextRecap: CampaignRecap = { ...recap, slides: nextSlides };
    setRecap(nextRecap);
    setIsSaved(false);
    if (isCurrentlyProjected) {
      onProjectRecap(nextRecap);
    }
  };

  const handleAddSlide = () => {
    const fallbackImage =
      campaign.scenes?.[0]?.backgroundUrl ||
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';

    const newSlide: RecapSlide = {
      id: `slide-${Date.now()}`,
      title: `Nuevo Hito ${recap.slides.length + 1}`,
      text: 'Los aventureros continuaron su travesía hacia lo desconocido...',
      imageUrl: fallbackImage,
      durationSeconds: 8,
    };

    const nextRecap: CampaignRecap = {
      ...recap,
      slides: [...recap.slides, newSlide],
    };
    setRecap(nextRecap);
    setIsSaved(false);
    if (isCurrentlyProjected) {
      onProjectRecap(nextRecap);
    }
  };

  const handleRemoveSlide = (index: number) => {
    if (recap.slides.length <= 1) return;
    const nextSlides = recap.slides.filter((_, i) => i !== index);
    const nextIndex = Math.min(nextSlides.length - 1, recap.currentSlideIndex);
    const nextRecap: CampaignRecap = {
      ...recap,
      slides: nextSlides,
      currentSlideIndex: nextIndex,
    };
    setRecap(nextRecap);
    setIsSaved(false);
    if (isCurrentlyProjected) {
      onProjectRecap(nextRecap);
    }
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= recap.slides.length) return;

    const nextSlides = [...recap.slides];
    const temp = nextSlides[index];
    nextSlides[index] = nextSlides[targetIdx];
    nextSlides[targetIdx] = temp;

    const nextRecap: CampaignRecap = {
      ...recap,
      slides: nextSlides,
    };
    setRecap(nextRecap);
    setIsSaved(false);
    if (isCurrentlyProjected) {
      onProjectRecap(nextRecap);
    }
  };

  // Live Navigation Handlers
  const handleNext = () => {
    const next = nextRecapSlide(recap);
    setRecap(next);
    if (isCurrentlyProjected) {
      onProjectRecap(next);
    }
  };

  const handlePrev = () => {
    const prev = prevRecapSlide(recap);
    setRecap(prev);
    if (isCurrentlyProjected) {
      onProjectRecap(prev);
    }
  };

  const handleGoTo = (index: number) => {
    const updated = goToRecapSlide(recap, index);
    setRecap(updated);
    if (isCurrentlyProjected) {
      onProjectRecap(updated);
    }
  };

  const handleSave = async () => {
    await onSaveRecap(recap);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleProjectToggle = async () => {
    if (isCurrentlyProjected) {
      await onDismissRecap();
    } else {
      await onProjectRecap(recap);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[92vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-purple-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base">
              Crónica de Apertura ("Anteriormente...")
            </span>
            {isCurrentlyProjected ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En Pantalla
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

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateFromJournal}
              className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 flex items-center gap-1.5 font-bold transition-all"
              title="Generar borrador automático seguro a partir de los hitos públicos del diario"
            >
              <Wand2 size={13} />
              <span>Generar desde Diario</span>
            </button>

            <button
              type="button"
              onClick={handleAddSlide}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
              title="Añadir una nueva diapositiva a la crónica"
            >
              <Plus size={13} />
              <span>Añadir Diapositiva</span>
            </button>
          </div>

          {/* LIVE TRANSPORT BAR */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={handlePrev}
              disabled={recap.currentSlideIndex <= 0}
              className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
              title="Diapositiva anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-mono font-bold text-amber-300 px-1">
              {recap.currentSlideIndex + 1} / {recap.slides.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={recap.currentSlideIndex >= recap.slides.length - 1}
              className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
              title="Siguiente diapositiva"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* SLIDE LIST & EDITORS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
          {recap.slides.map((slide, index) => {
            const isCurrent = index === recap.currentSlideIndex;
            return (
              <div
                key={slide.id || index}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Slide Thumbnail */}
                  <div
                    onClick={() => handleGoTo(index)}
                    className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 cursor-pointer group bg-black"
                  >
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-amber-300 font-mono px-1.5 py-0.5 rounded bg-black/60">
                        #{index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Slide Fields */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => handleUpdateSlide(index, { title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded px-2.5 py-1 text-xs font-bold"
                        placeholder="Título del Hito"
                      />

                      {/* Reorder and Delete Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-20"
                          title="Mover arriba"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(index, 'down')}
                          disabled={index === recap.slides.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-20"
                          title="Mover abajo"
                        >
                          <ArrowDown size={13} />
                        </button>
                        {recap.slides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlide(index)}
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                            title="Eliminar diapositiva"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={slide.text}
                      onChange={(e) => handleUpdateSlide(index, { text: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs resize-none"
                      placeholder="Texto narrativo para los jugadores..."
                    />

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <input
                        type="text"
                        value={slide.imageUrl}
                        onChange={(e) => handleUpdateSlide(index, { imageUrl: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-400 rounded px-2 py-0.5 text-[11px]"
                        placeholder="URL de imagen o ilustración"
                      />
                      <button
                        type="button"
                        onClick={() => handleGoTo(index)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium"
                      >
                        Enfocar #{index + 1}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/90">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {isSaved ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
            <span>{isSaved ? 'Guardado' : 'Guardar en Campaña'}</span>
          </button>

          <div className="flex items-center gap-2">
            {isCurrentlyProjected ? (
              <button
                type="button"
                onClick={handleProjectToggle}
                className="px-4 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <EyeOff size={14} />
                <span>Cerrar Crónica en Mesa</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProjectToggle}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-purple-50 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all active:scale-95"
              >
                <Send size={14} />
                <span>Proyectar a la Mesa</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
