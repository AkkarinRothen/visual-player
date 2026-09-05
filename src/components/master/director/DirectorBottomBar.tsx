import React from 'react';
import type { CharacterOnScreen, Character } from '../../../types';
import {
  Mic,
  MicOff,
  Smile,
  Eye,
  EyeOff,
  DoorOpen,
  Sliders,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  ArrowUp,
  Tag,
  X,
  Check,
  Copy,
} from 'lucide-react';

export interface DirectorBottomBarProps {
  primarySelectedChar: CharacterOnScreen | null;
  activeCampaignChar: Character | null;
  characters: CharacterOnScreen[];
  isDragging: boolean;
  showExpressionsForId: string | null;
  setShowExpressionsForId: (id: string | null) => void;
  editingPrivateLabelId: string | null;
  setEditingPrivateLabelId: (id: string | null) => void;
  privateLabelInput: string;
  setPrivateLabelInput: (val: string) => void;
  showMorePanel: boolean;
  setShowMorePanel: (val: boolean) => void;
  setSelectedIds: (ids: Set<string>) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onDuplicateCharacter?: (character: CharacterOnScreen) => void;
}

export const DirectorBottomBar: React.FC<DirectorBottomBarProps> = ({
  primarySelectedChar,
  activeCampaignChar,
  characters,
  isDragging,
  showExpressionsForId,
  setShowExpressionsForId,
  editingPrivateLabelId,
  setEditingPrivateLabelId,
  privateLabelInput,
  setPrivateLabelInput,
  showMorePanel,
  setShowMorePanel,
  setSelectedIds,
  onUpdateCharacter,
  onDuplicateCharacter,
}) => {
  if (!primarySelectedChar) return null;

  return (
    <>
      {/* ── FLOATING QUICK ACTIONS BAR (On Selected Character) ── */}
      {!isDragging && (
        <div className="director-ui-element absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-slate-950/95 backdrop-blur-md border-2 border-amber-500/60 rounded-2xl p-1.5 shadow-2xl pointer-events-auto max-w-[96vw] overflow-x-auto no-scrollbar">
          {/* Avatar & Name Pill */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-300 truncate max-w-[120px] shrink-0">
            <img
              src={primarySelectedChar.avatarUrl}
              alt={primarySelectedChar.name}
              className="w-4 h-4 rounded-full object-cover shrink-0 border border-slate-700"
            />
            <span className="truncate">{primarySelectedChar.privateLabel || primarySelectedChar.name}</span>
          </div>

          {/* Primary 1: Voice / Speak Toggle */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              primarySelectedChar.isSpeaking
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() =>
              onUpdateCharacter(
                primarySelectedChar.id,
                { isSpeaking: !primarySelectedChar.isSpeaking },
                `${primarySelectedChar.isSpeaking ? 'Silenciar' : 'Hablar'} ${primarySelectedChar.name}`
              )
            }
            title={primarySelectedChar.isSpeaking ? 'Desactivar foco de voz' : 'Activar foco de voz'}
          >
            {primarySelectedChar.isSpeaking ? <Mic size={15} /> : <MicOff size={15} />}
            <span className="hidden sm:inline">Voz</span>
          </button>

          {/* Primary 2: Quick Expression Selector */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              showExpressionsForId === primarySelectedChar.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() =>
              setShowExpressionsForId(
                showExpressionsForId === primarySelectedChar.id ? null : primarySelectedChar.id
              )
            }
            title="Cambiar expresión facial"
          >
            <Smile size={15} />
            <span className="hidden sm:inline">Expresión</span>
          </button>

          {/* Primary 3: Visibility Toggle (Explicit label: Ocultar / Mostrar) */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              primarySelectedChar.isHidden
                ? 'bg-amber-900/60 text-amber-300 border border-amber-500/50'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() =>
              onUpdateCharacter(
                primarySelectedChar.id,
                { isHidden: !primarySelectedChar.isHidden },
                `${primarySelectedChar.isHidden ? 'Mostrar en Mesa' : 'Ocultar en escena'} a ${primarySelectedChar.name}`
              )
            }
            title={primarySelectedChar.isHidden ? 'Mostrar en pantalla pública' : 'Ocultar de la pantalla pública (conserva posición)'}
          >
            {primarySelectedChar.isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{primarySelectedChar.isHidden ? 'Mostrar' : 'Ocultar'}</span>
          </button>

          {/* Primary 4: Presence Toggle (Retirar a reserva / Enviar a escena) */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              primarySelectedChar.presence === 'in_reserve'
                ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() => {
              const nextPresence =
                primarySelectedChar.presence === 'in_reserve' ? 'on_stage' : 'in_reserve';
              onUpdateCharacter(
                primarySelectedChar.id,
                { presence: nextPresence },
                `${nextPresence === 'on_stage' ? 'Hacer entrar a escena' : 'Retirar a reserva'} a ${primarySelectedChar.name}`
              );
            }}
            title={primarySelectedChar.presence === 'in_reserve' ? 'Hacer entrar al escenario' : 'Retirar a la reserva (conserva posición al volver)'}
          >
            <DoorOpen size={15} />
            <span>
              {primarySelectedChar.presence === 'in_reserve' ? 'Entrar' : 'A reserva'}
            </span>
          </button>

          {/* Primary 5: Quick Duplicate Copy */}
          {onDuplicateCharacter && (
            <button
              type="button"
              className="p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
              onClick={() => onDuplicateCharacter(primarySelectedChar)}
              title="Duplicar figura (añade otra copia con etiqueta privada secuencial)"
            >
              <Copy size={15} className="text-cyan-400" />
              <span>Duplicar</span>
            </button>
          )}

          {/* Primary 6: "Más…" Mobile Bottom Drawer Button */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              showMorePanel
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() => setShowMorePanel(!showMorePanel)}
            title="Más opciones (Presencia, Transformación, Calibración de apoyo)"
          >
            <Sliders size={15} />
            <span>Más…</span>
          </button>

          {/* Quick Actions (Direct access on medium/wide screens) */}
          <div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-1">
            {/* Flip / Horizontal Mirror */}
            <button
              type="button"
              className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium ${
                primarySelectedChar.isFlipped
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() =>
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { isFlipped: !primarySelectedChar.isFlipped },
                  `Voltear horizontalmente a ${primarySelectedChar.name}`
                )
              }
              title="Invertir orientación horizontal (espejo)"
            >
              <FlipHorizontal size={15} />
              <span>Girar</span>
            </button>

            {/* Scale Step Adjuster */}
            <div className="flex items-center bg-slate-900 rounded-xl px-1 border border-slate-800 text-xs">
              <button
                type="button"
                className="p-1 text-slate-300 hover:text-white"
                onClick={() => {
                  const currentScale = primarySelectedChar.scale ?? 1.0;
                  const nextScale = Math.max(0.5, +(currentScale - 0.1).toFixed(1));
                  onUpdateCharacter(
                    primarySelectedChar.id,
                    { scale: nextScale },
                    `Ajustar escala de ${primarySelectedChar.name} a ${nextScale}x`
                  );
                }}
                title="Reducir escala visual"
              >
                <ZoomOut size={13} />
              </button>
              <span className="px-1 text-[11px] font-mono text-amber-300 min-w-[28px] text-center">
                {(primarySelectedChar.scale ?? 1.0).toFixed(1)}x
              </span>
              <button
                type="button"
                className="p-1 text-slate-300 hover:text-white"
                onClick={() => {
                  const currentScale = primarySelectedChar.scale ?? 1.0;
                  const nextScale = Math.min(2.5, +(currentScale + 0.1).toFixed(1));
                  onUpdateCharacter(
                    primarySelectedChar.id,
                    { scale: nextScale },
                    `Ajustar escala de ${primarySelectedChar.name} a ${nextScale}x`
                  );
                }}
                title="Aumentar escala visual"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Lock / Unlock */}
            <button
              type="button"
              className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium ${
                primarySelectedChar.isLocked
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() =>
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { isLocked: !primarySelectedChar.isLocked },
                  `${primarySelectedChar.isLocked ? 'Desbloquear posición' : 'Bloquear posición'} de ${primarySelectedChar.name}`
                )
              }
              title={primarySelectedChar.isLocked ? 'Desbloquear movimiento' : 'Bloquear posición'}
            >
              {primarySelectedChar.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </button>

            {/* Layer Ordering (Bring to Front) */}
            <button
              type="button"
              className="p-2 rounded-xl bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
              onClick={() => {
                const allZ = characters.map((c) => c.zIndex ?? 1);
                const maxZ = Math.max(1, ...allZ);
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { zIndex: maxZ + 1 },
                  `Traer al frente a ${primarySelectedChar.name}`
                );
              }}
              title="Traer al frente de la escena"
            >
              <ArrowUp size={15} />
              <span>Al frente</span>
            </button>

            {/* Private Label Editor */}
            <button
              type="button"
              className="p-2 rounded-xl bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
              onClick={() => {
                setEditingPrivateLabelId(primarySelectedChar.id);
                setPrivateLabelInput(primarySelectedChar.privateLabel || '');
              }}
              title="Asignar etiqueta privada del DM"
            >
              <Tag size={15} />
              <span>Etiqueta</span>
            </button>
          </div>

          {/* Close Selection */}
          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5 shrink-0"
            onClick={() => {
              setSelectedIds(new Set());
              setShowMorePanel(false);
            }}
            title="Deseleccionar"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── EXPRESSIONS POPOVER ── */}
      {showExpressionsForId && (
        <div className="director-ui-element absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 min-w-[200px] pointer-events-auto">
          <div className="text-xs font-semibold text-amber-300 flex items-center justify-between">
            <span>Expresiones de {primarySelectedChar.name}</span>
            <button
              type="button"
              onClick={() => setShowExpressionsForId(null)}
              className="text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
            {/* Default Avatar Option */}
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs border ${
                !primarySelectedChar.activeExpression
                  ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-semibold'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              onClick={() => {
                const defaultUrl = activeCampaignChar?.defaultAvatarUrl || primarySelectedChar.avatarUrl;
                const resolvedAnchor =
                  primarySelectedChar.instanceVariantAnchors?.['default'] ??
                  activeCampaignChar?.expressionAnchors?.['default'] ??
                  primarySelectedChar.visualAnchorOffsetY ??
                  0;
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { avatarUrl: defaultUrl, activeExpression: undefined, visualAnchorOffsetY: resolvedAnchor },
                  `Expresión neutral para ${primarySelectedChar.name}`
                );
                setShowExpressionsForId(null);
              }}
            >
              Neutral / Predeterminada
            </button>

            {/* Campaign expressions */}
            {activeCampaignChar?.expressions &&
              Object.entries(activeCampaignChar.expressions).map(([expKey, expUrl]) => (
                <button
                  key={expKey}
                  type="button"
                  className={`px-2 py-1 rounded text-xs border capitalize ${
                    primarySelectedChar.activeExpression === expKey
                      ? 'bg-purple-600 text-white border-purple-400 font-semibold'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                  onClick={() => {
                    const resolvedAnchor =
                      primarySelectedChar.instanceVariantAnchors?.[expKey] ??
                      activeCampaignChar?.expressionAnchors?.[expKey] ??
                      primarySelectedChar.visualAnchorOffsetY ??
                      0;
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { avatarUrl: expUrl, activeExpression: expKey, visualAnchorOffsetY: resolvedAnchor },
                      `Expresión "${expKey}" para ${primarySelectedChar.name} (apoyo: +${resolvedAnchor}%)`
                    );
                    setShowExpressionsForId(null);
                  }}
                >
                  {expKey}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── PRIVATE LABEL EDITOR MODAL / POPOVER ── */}
      {editingPrivateLabelId && (
        <div className="director-ui-element absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950 border border-amber-500/50 rounded-xl p-3 shadow-2xl flex flex-col gap-2 min-w-[260px] pointer-events-auto">
          <div className="text-xs font-semibold text-amber-300">
            Etiqueta privada (Solo visible para el DM):
          </div>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            placeholder="ej. Guardia puerta, Guardia herido..."
            value={privateLabelInput}
            onChange={(e) => setPrivateLabelInput(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button
              type="button"
              className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
              onClick={() => setEditingPrivateLabelId(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1"
              onClick={() => {
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { privateLabel: privateLabelInput.trim() || undefined },
                  `Etiqueta privada asignada: "${privateLabelInput.trim()}"`
                );
                setEditingPrivateLabelId(null);
              }}
            >
              <Check size={13} />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
