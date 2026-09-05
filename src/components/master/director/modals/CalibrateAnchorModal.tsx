import React from 'react';
import type { CharacterOnScreen, Character } from '../../../../types';
import { Sliders, X, Check } from 'lucide-react';

export interface CalibrateAnchorModalProps {
  char: CharacterOnScreen | null;
  campaignCharacters?: Character[];
  calibratingOffsetValue: number;
  setCalibratingOffsetValue: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateCampaignCharacter?: (characterId: string, updates: Partial<Character>) => void;
}

export const CalibrateAnchorModal: React.FC<CalibrateAnchorModalProps> = ({
  char,
  campaignCharacters = [],
  calibratingOffsetValue,
  setCalibratingOffsetValue,
  onClose,
  onUpdateCharacter,
  onUpdateCampaignCharacter,
}) => {
  if (!char) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
            <Sliders size={14} />
            <span>Calibrar apoyo en suelo: {char.name}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-slate-300">
          Ajustá el punto de apoyo para compensar márgenes transparentes bajo los pies. La
          línea roja representa el suelo de la escena.
        </p>

        {/* Checkerboard Preview Stage */}
        <div className="w-full h-44 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 rounded-xl border border-slate-700 relative overflow-hidden flex items-end justify-center pb-0">
          {/* Ground red line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 z-10 shadow-[0_0_8px_rgba(244,63,94,0.8)] flex items-center justify-end pr-2">
            <span className="text-[8px] font-mono text-rose-300 font-bold">SUELO</span>
          </div>

          {/* Standee with current offset */}
          <img
            src={char.avatarUrl}
            alt={char.name}
            className="max-h-36 object-contain transition-transform duration-75"
            style={{
              transform: `translateY(${calibratingOffsetValue}%)`,
            }}
          />
        </div>

        {/* Slider & Controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono w-20">
            Offset: +{calibratingOffsetValue}%
          </span>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={calibratingOffsetValue}
            onChange={(e) => setCalibratingOffsetValue(Number(e.target.value))}
            className="flex-1 accent-amber-500 cursor-pointer"
          />
          <button
            type="button"
            className="text-[10px] text-slate-400 hover:text-white underline shrink-0"
            onClick={() => setCalibratingOffsetValue(0)}
          >
            Restablecer
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800 flex-wrap">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/40"
            onClick={() => {
              const expKey = char.activeExpression || 'default';
              const updatedAnchors = {
                ...(char.instanceVariantAnchors || {}),
                [expKey]: calibratingOffsetValue,
              };
              onUpdateCharacter(
                char.id,
                {
                  visualAnchorOffsetY: calibratingOffsetValue,
                  instanceVariantAnchors: updatedAnchors,
                },
                `Punto de apoyo calibrado (+${calibratingOffsetValue}%) para figura de ${char.name}`
              );
              onClose();
            }}
            title="Guarda la calibración solo para esta figura en la escena actual"
          >
            <span>Guardar en esta figura</span>
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1"
            onClick={() => {
              const expKey = char.activeExpression || 'default';
              const updatedAnchors = {
                ...(char.instanceVariantAnchors || {}),
                [expKey]: calibratingOffsetValue,
              };
              onUpdateCharacter(
                char.id,
                {
                  visualAnchorOffsetY: calibratingOffsetValue,
                  instanceVariantAnchors: updatedAnchors,
                },
                `Punto de apoyo calibrado (+${calibratingOffsetValue}%) para ${char.name}`
              );
              if (char.characterId && onUpdateCampaignCharacter) {
                const baseChar = campaignCharacters.find((c) => c.id === char.characterId);
                const campAnchors = {
                  ...(baseChar?.expressionAnchors || {}),
                  [expKey]: calibratingOffsetValue,
                };
                onUpdateCampaignCharacter(char.characterId, { expressionAnchors: campAnchors });
              }
              onClose();
            }}
            title="Guarda en la biblioteca/ficha para que todas las futuras apariciones usen esta calibración"
          >
            <Check size={14} />
            <span>Guardar apoyo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
