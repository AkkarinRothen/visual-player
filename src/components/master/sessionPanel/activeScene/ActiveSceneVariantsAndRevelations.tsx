import React from 'react';
import { Eye } from 'lucide-react';
import type { DisplayState, Scene, SceneVariant } from '../../../../types';

interface ActiveSceneVariantsAndRevelationsProps {
  liveState: DisplayState;
  activeScene: Scene | null;
  onSelectSceneVariant?: (variant: SceneVariant) => void;
  onRevealCharacterAppearance?: (characterId: string) => void;
  onRevealCharacterIdentity?: (characterId: string) => void;
}

export const ActiveSceneVariantsAndRevelations: React.FC<ActiveSceneVariantsAndRevelationsProps> = ({
  liveState,
  activeScene,
  onSelectSceneVariant,
  onRevealCharacterAppearance,
  onRevealCharacterIdentity,
}) => {
  const hasVariants = activeScene?.variants && activeScene.variants.length > 0;
  const charactersWithHiddenRevelations = liveState.characters.filter(
    (c) =>
      c.revelation &&
      (!c.revelation.isAppearanceRevealed || !c.revelation.isIdentityRevealed)
  );

  if (!hasVariants && charactersWithHiddenRevelations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Quick Scene Variants Chips */}
      {hasVariants && (
        <div className="scene-variants-row">
          <span className="variants-tag">Variantes:</span>
          <div className="variants-chips-scroll">
            {activeScene!.variants!.map((v) => {
              const isActive =
                liveState.activeVariantId === v.id ||
                (!liveState.activeVariantId && liveState.backgroundUrl === v.backgroundUrl);
              return (
                <button
                  key={v.id}
                  className={`variant-pill ${isActive ? 'active-variant' : ''}`}
                  onClick={() => onSelectSceneVariant?.(v)}
                  title={`Cambiar a variante "${v.name}"`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Progressive Disclosure / Revelations of Characters */}
      {charactersWithHiddenRevelations.length > 0 && (
        <div className="scene-revelations-row flex items-center gap-2 overflow-x-auto py-1.5 px-2 bg-slate-950/70 border border-purple-900/40 rounded-lg text-xs mt-2">
          <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1 shrink-0">
            <Eye size={12} className="text-purple-400" />
            <span>Revelaciones:</span>
          </span>
          {charactersWithHiddenRevelations.map((char) => (
            <div
              key={char.id}
              className="flex items-center gap-1.5 bg-slate-900/90 border border-purple-800/30 rounded-lg p-1 shrink-0"
            >
              <span className="text-slate-300 text-[11px] font-semibold max-w-[100px] truncate">
                {char.revelation?.isIdentityRevealed
                  ? char.name
                  : char.revelation?.publicAlias || 'Desconocido'}
              </span>
              {!char.revelation?.isAppearanceRevealed && onRevealCharacterAppearance && (
                <button
                  type="button"
                  onClick={() => onRevealCharacterAppearance(char.id)}
                  className="px-1.5 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-700/50 text-purple-200 text-[10px] font-bold flex items-center gap-1"
                  title="Revelar rostro a los jugadores en la Mesa"
                >
                  <Eye size={10} />
                  <span>Rostro</span>
                </button>
              )}
              {!char.revelation?.isIdentityRevealed && onRevealCharacterIdentity && (
                <button
                  type="button"
                  onClick={() => onRevealCharacterIdentity(char.id)}
                  className="px-1.5 py-0.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-700/50 text-amber-200 text-[10px] font-bold flex items-center gap-1"
                  title="Revelar nombre e identidad real a los jugadores"
                >
                  <span>Nombre</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
