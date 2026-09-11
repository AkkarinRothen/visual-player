import React from 'react';
import type { HandoutPage, HandoutTheme, HandoutTypography } from '../../../types';

interface HandoutDocumentEditorProps {
  currentPage: HandoutPage;
  fallbackTitle: string;
  onUpdatePage: (updater: (p: HandoutPage) => HandoutPage) => void;
}

const THEMES: { id: HandoutTheme; label: string; icon: string }[] = [
  { id: 'parchment', label: 'Pergamino', icon: '📜' },
  { id: 'dark', label: 'Grimorio', icon: '📖' },
  { id: 'scroll', label: 'Papiro', icon: '🏺' },
  { id: 'royal', label: 'Carta Real', icon: '👑' },
];

const TYPOGRAPHIES: { id: HandoutTypography; label: string; fontClass: string }[] = [
  { id: 'medieval', label: 'Medieval', fontClass: 'font-serif italic' },
  { id: 'serif', label: 'Serif Clásica', fontClass: 'font-serif' },
  { id: 'classic', label: 'Moderna', fontClass: 'font-sans' },
  { id: 'typewriter', label: 'Máquina', fontClass: 'font-mono' },
];

const SEAL_PRESETS = ['⚜️', '📜', '👑', '🩸', '🛡️', '⚔️', '🦅', '🗝️'];

export const HandoutDocumentEditor: React.FC<HandoutDocumentEditorProps> = ({
  currentPage,
  fallbackTitle,
  onUpdatePage,
}) => {
  const currentTheme = currentPage.theme || 'parchment';
  const currentTypo = currentPage.typography || 'medieval';
  const currentSeal = currentPage.authorSeal || '⚜️ Sello del Consejo';

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto bg-slate-950/60">
      {/* LEFT COLUMN: EDIT CONTROLS */}
      <div className="flex flex-col gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Redacción de Documento
          </span>
          <span className="text-[11px] text-slate-400">
            Página {currentPage.pageNumber}
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Título del Documento
            </label>
            <input
              type="text"
              value={currentPage.title || fallbackTitle}
              onChange={(e) => onUpdatePage((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Carta del Conde"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Subtítulo o Epígrafe (opcional)
            </label>
            <input
              type="text"
              value={currentPage.subtitle || ''}
              onChange={(e) => onUpdatePage((p) => ({ ...p, subtitle: e.target.value }))}
              placeholder="Ej: Hallado en los aposentos"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Theme Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Estilo Visual del Soporte
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onUpdatePage((p) => ({ ...p, theme: t.id }))}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  currentTheme === t.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Typography Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Caligrafía / Tipografía
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {TYPOGRAPHIES.map((ty) => (
              <button
                key={ty.id}
                type="button"
                onClick={() => onUpdatePage((p) => ({ ...p, typography: ty.id }))}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${ty.fontClass} ${
                  currentTypo === ty.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {ty.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content Textarea */}
        <div className="flex-1 flex flex-col min-h-[160px]">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Contenido de la Carta o Manuscrito
            </label>
            <span className="text-[10px] text-slate-500">
              {(currentPage.textContent || '').length} caracteres
            </span>
          </div>
          <textarea
            value={currentPage.textContent || ''}
            onChange={(e) => onUpdatePage((p) => ({ ...p, textContent: e.target.value }))}
            placeholder="Escribí aquí el mensaje, carta, conjuro o pista revelada..."
            rows={8}
            className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-serif leading-relaxed resize-none"
          />
        </div>

        {/* Seal & Signatory */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Firma y Sello de Lacre
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {SEAL_PRESETS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() =>
                  onUpdatePage((p) => ({
                    ...p,
                    authorSeal: `${icon} ${p.authorSeal?.replace(/^[^\s]+\s*/, '') || 'Sello Oficial'}`,
                  }))
                }
                className="w-7 h-7 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sm flex items-center justify-center transition-colors"
                title={`Usar ${icon}`}
              >
                {icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={currentPage.authorSeal || ''}
            onChange={(e) => onUpdatePage((p) => ({ ...p, authorSeal: e.target.value }))}
            placeholder="Ej: ⚜️ Sello del Gran Maestre"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* RIGHT COLUMN: LIVE PARCHMENT PREVIEW */}
      <div className="flex flex-col items-center justify-center bg-slate-950/90 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <span>👁️</span>
          <span>Vista en Mesa</span>
        </div>

        {/* Simulated Document Sheet */}
        <div
          className={`w-full max-w-md p-6 sm:p-8 rounded-xl shadow-2xl border transition-all duration-300 flex flex-col justify-between min-h-[360px] ${
            currentTheme === 'parchment'
              ? 'bg-[#f6eedb] text-[#2a1708] border-amber-900/40 shadow-amber-950/40'
              : currentTheme === 'dark'
              ? 'bg-[#1b1624] text-[#f3ebfc] border-purple-800/60 shadow-purple-950/60'
              : currentTheme === 'scroll'
              ? 'bg-[#eee3ca] text-[#2c1704] border-[#7a481c] shadow-amber-950/50'
              : 'bg-[#fcfaf5] text-[#161220] border-amber-500 shadow-red-950/30'
          }`}
        >
          {/* Inner border */}
          <div className="border border-current/20 p-5 rounded-lg flex flex-col gap-3 relative h-full">
            <div className="text-center pb-2 border-b border-current/15">
              <h3 className={`text-xl font-bold tracking-tight ${currentTypo === 'medieval' ? 'font-serif' : currentTypo === 'typewriter' ? 'font-mono' : 'font-serif'}`}>
                {currentPage.title || fallbackTitle}
              </h3>
              {currentPage.subtitle && (
                <p className="text-xs italic opacity-80 mt-0.5">
                  {currentPage.subtitle}
                </p>
              )}
            </div>

            <div
              className={`flex-1 py-1 text-xs leading-relaxed whitespace-pre-line text-justify ${
                currentTypo === 'medieval'
                  ? 'font-serif italic'
                  : currentTypo === 'typewriter'
                  ? 'font-mono'
                  : currentTypo === 'classic'
                  ? 'font-sans'
                  : 'font-serif'
              }`}
            >
              {currentPage.textContent || (
                <span className="opacity-40 italic">
                  Escribí en el editor para previsualizar el documento...
                </span>
              )}
            </div>

            {currentSeal && (
              <div className="pt-3 border-t border-current/15 flex items-center justify-between">
                <span className="text-[10px] italic opacity-75">
                  Sellado y certificado
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-amber-900 text-amber-200 border border-amber-700 flex items-center justify-center text-xs shadow">
                    {currentSeal.slice(0, 2).trim() || '⚜️'}
                  </div>
                  <span className="text-[11px] font-bold">
                    {currentSeal}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
