import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import type {
  CharacterOnScreen,
  CharacterPosition,
  ElementTransitionDirective,
  SceneProp,
  SceneOcclusionRegion,
  CombatState,
} from '../../types';

interface DisplayCharactersLayerProps {
  characters: CharacterOnScreen[];
  props?: SceneProp[];
  occlusionRegions?: SceneOcclusionRegion[];
  backgroundUrl?: string;
  hasActiveDialogue?: boolean;
  activeTransitions?: ElementTransitionDirective[];
  combatState?: CombatState;
  nameDisplayMode?: 'always' | 'speaker_only' | 'hidden';
  groundLineY?: number;
}

function getSlotPositionPercent(pos: CharacterPosition): number {
  switch (pos) {
    case 'left':
      return 20;
    case 'center-left':
      return 40;
    case 'center-right':
      return 60;
    case 'right':
      return 80;
    default:
      return 50;
  }
}

type StageItem =
  | { type: 'character'; data: CharacterOnScreen; zIndex: number }
  | { type: 'prop'; data: SceneProp; zIndex: number }
  | { type: 'occlusion'; data: SceneOcclusionRegion; zIndex: number };

interface ExitingStageItem {
  item: StageItem;
  directive: ElementTransitionDirective;
  removeAt: number;
}

export const DisplayCharactersLayer: React.FC<DisplayCharactersLayerProps> = ({
  characters,
  props = [],
  occlusionRegions = [],
  backgroundUrl,
  hasActiveDialogue = false,
  activeTransitions = [],
  combatState,
  nameDisplayMode = 'always',
  groundLineY = 0,
}) => {
  const hasSpeaking = characters.some((c) => c.isSpeaking);

  // Track previous items to detect elements removed with an 'exit' transition directive
  const prevItemsRef = useRef<StageItem[]>([]);
  const [exitingItems, setExitingItems] = useState<ExitingStageItem[]>([]);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<Set<string>>(() => new Set());

  // Current active stage items
  const currentStageItems: StageItem[] = [
    ...characters.map((c, i) => ({
      type: 'character' as const,
      data: c,
      zIndex: c.zIndex !== undefined ? c.zIndex : i + 1,
    })),
    ...props
      .filter((p) => p.visible !== false)
      .map((p) => ({
        type: 'prop' as const,
        data: p,
        zIndex: p.zIndex,
      })),
    ...occlusionRegions.map((occ) => ({
      type: 'occlusion' as const,
      data: occ,
      zIndex: occ.zIndex !== undefined ? occ.zIndex : 25,
    })),
  ];

  // Detect exiting items
  useEffect(() => {
    const currentIds = new Set([
      ...characters.map((c) => c.id),
      ...props.map((p) => p.id),
    ]);

    const exitingDirectives = activeTransitions.filter((t) => t.direction === 'exit');

    for (const directive of exitingDirectives) {
      if (!currentIds.has(directive.targetId)) {
        // Find previous item
        const prevItem = prevItemsRef.current.find(
          (item) => item.data.id === directive.targetId
        );
        if (prevItem) {
          setExitingItems((prev) => {
            if (prev.some((e) => e.item.data.id === directive.targetId)) return prev;
            return [
              ...prev,
              {
                item: prevItem,
                directive,
                removeAt: Date.now() + (directive.durationMs || 500),
              },
            ];
          });
        }
      }
    }

    prevItemsRef.current = currentStageItems;
  }, [characters, props, activeTransitions]);

  // Clean up expired exiting items
  useEffect(() => {
    if (exitingItems.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setExitingItems((prev) => prev.filter((e) => e.removeAt > now));
    }, 100);

    return () => clearInterval(timer);
  }, [exitingItems]);

  // Merge live items with ephemeral exiting items, sorted by unified zIndex
  const allStageItems: { item: StageItem; isExiting?: boolean; exitDirective?: ElementTransitionDirective }[] = [
    ...currentStageItems.map((item) => ({ item })),
    ...exitingItems.map((e) => ({
      item: e.item,
      isExiting: true,
      exitDirective: e.directive,
    })),
  ].sort((a, b) => a.item.zIndex - b.item.zIndex);

  return (
    <div className="characters-container" aria-label="Capa de Escenario Unificada (NPCs y Props)">
      {allStageItems.map(({ item, isExiting, exitDirective }) => {
        // Find active transition directive for this item
        const transition = isExiting
          ? exitDirective
          : activeTransitions.find((t) => t.targetId === item.data.id);

        let animClass = '';
        let animDurationMs = transition?.durationMs || 500;

        if (transition && transition.animation !== 'instant') {
          if (transition.direction === 'exit' || isExiting) {
            animClass = `anim-exit-${transition.animation.replace('slide-', 'slide-')}`;
          } else {
            animClass = `anim-enter-${transition.animation.replace('slide-', 'slide-')}`;
          }
        }

        if (item.type === 'character') {
          const char = item.data;
          const posX =
            char.normalizedX !== undefined ? char.normalizedX : getSlotPositionPercent(char.position);
          const posY = (char.normalizedY !== undefined ? char.normalizedY : 0) + (groundLineY || 0);
          const effectiveScale = char.scale !== undefined ? char.scale : 1.0;
          const isFlipped = !!char.isFlipped;
          const isDimmed = hasSpeaking && !char.isSpeaking;
          const visualAnchorOffsetY = char.visualAnchorOffsetY || 0;

          const combatant = combatState?.combatants?.find(
            (c) => c.characterId === char.id || c.id === char.id || c.name === char.name
          );
          const activeCombatant = combatState?.isActive
            ? combatState.combatants[combatState.currentTurnIndex]
            : null;
          const isActiveCombatant =
            !!activeCombatant &&
            (activeCombatant.characterId === char.id || activeCombatant.id === char.id || activeCombatant.name === char.name);

          const rawConditions =
            (char as any).activeConditions ||
            (char as any).conditions ||
            combatant?.conditions ||
            (isActiveCombatant ? activeCombatant?.conditions : null) ||
            [];
          const hasConditions = Array.isArray(rawConditions) && rawConditions.length > 0;

          const conditionAuraClasses = (Array.isArray(rawConditions) ? rawConditions : [])
            .map((cond: string) => `aura-${cond.toLowerCase()}`)
            .join(' ');
          const isBloodied = !!combatant && !!combatant.maxHp && (combatant.currentHp <= combatant.maxHp * 0.5);

          return (
            /* 1. OUTER WRAPPER: Coordinates and displacement */
            <div
              key={char.id}
              data-character-id={char.id}
              className="stage-item-pos-wrapper character-display-wrapper"
              style={{
                position: 'absolute',
                left: `${posX}%`,
                bottom: `${posY}%`,
                zIndex: item.zIndex,
                pointerEvents: 'none',
                transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Procedural ground shadow */}
              {char.shadowPreset !== 'none' && (
                <div
                  className={`character-ground-shadow ${char.shadowPreset === 'elongated' ? 'elongated' : ''}`}
                  style={{
                    width: `${Math.max(42, effectiveScale * 84)}px`,
                    height: `${Math.max(14, effectiveScale * 24)}px`,
                    opacity: Math.max(0.15, 0.68 - (posY * 0.007)),
                  }}
                  aria-hidden="true"
                />
              )}

              {/* 2. MIDDLE WRAPPER: Ephemeral transition animation */}
              <div
                className={`stage-item-anim-wrapper ${animClass}`}
                style={
                  animClass
                    ? ({ '--anim-duration': `${animDurationMs}ms` } as React.CSSProperties)
                    : undefined
                }
              >
                {/* 3. INNER WRAPPER: Instance visual transforms */}
                <div
                  className={`character-card ${char.isSpeaking ? 'is-speaking' : ''} ${
                    isDimmed ? 'is-dimmed' : ''
                  } ${isActiveCombatant ? 'active-combatant-focal ring-2 ring-amber-400/80 rounded-2xl' : ''} ${conditionAuraClasses} ${
                    isBloodied ? 'aura-bloodied' : ''
                  }`}
                  style={{
                    transformOrigin: 'bottom center',
                    transform: `translate(-50%, ${visualAnchorOffsetY}%) scale(${effectiveScale}) scaleX(${
                      isFlipped ? -1 : 1
                    })`,
                    transition: 'filter 0.4s ease',
                  }}
                >
                  {char.isSpeaking && <div className="speaking-aura" />}
                  {isActiveCombatant && <div className="active-combatant-aura" />}

                  {/* Active combatant and general condition badges */}
                  {hasConditions && (
                    <div
                      className="active-combatant-conditions"
                      style={{
                        position: 'absolute',
                        top: '-26px',
                        left: '50%',
                        transform: `translateX(-50%) scaleX(${isFlipped ? -1 : 1})`,
                        display: 'flex',
                        gap: '4px',
                        justifyContent: 'center',
                        zIndex: 25,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rawConditions.slice(0, 2).map((cond: string, idx: number) => (
                        <span
                          key={idx}
                          className="combat-condition-chip condition-badge"
                          style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(153, 27, 27, 0.88)',
                            color: '#fee2e2',
                            border: '1px solid rgba(248, 113, 113, 0.6)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.6)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {cond}
                        </span>
                      ))}
                      {rawConditions.length > 2 && (
                        <span
                          className="combat-condition-chip-more condition-badge-more"
                          style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(120, 53, 15, 0.9)',
                            color: '#fef3c7',
                            border: '1px solid rgba(245, 158, 11, 0.7)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.6)',
                          }}
                          title={rawConditions.slice(2).join(', ')}
                        >
                          +{rawConditions.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {(() => {
                    const isIdentityHidden = char.revelation && !char.revelation.isIdentityRevealed;
                    const publicDisplayName = isIdentityHidden
                      ? (char.revelation?.publicAlias || 'Desconocido')
                      : char.name;
                    const isAppearanceHidden = char.revelation && !char.revelation.isAppearanceRevealed;
                    const fallbackInitial = isAppearanceHidden ? '?' : (publicDisplayName ? publicDisplayName.charAt(0).toUpperCase() : '?');

                    return (
                      <>
                        <div className="standee-proportional-frame">
                          {failedAvatarUrls.has(char.avatarUrl) ? (
                            <div className="standee-fallback-token flex flex-col items-center justify-center w-full h-full min-h-[160px] bg-neutral-950/90 border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl text-center">
                              <div className="w-14 h-14 rounded-full bg-neutral-900 border border-amber-500/60 flex items-center justify-center text-amber-300 font-serif text-2xl font-bold shadow-inner">
                                {fallbackInitial}
                              </div>
                              <span className="text-xs text-amber-100 font-serif font-medium mt-2 max-w-[130px] truncate">{publicDisplayName}</span>
                              <span className="text-[9px] text-amber-400/60 mt-0.5">Avatar no disponible</span>
                            </div>
                          ) : (
                            <img
                              src={char.avatarUrl}
                              alt={publicDisplayName}
                              className="standee-proportional-img"
                              loading="eager"
                              onError={() => {
                                setFailedAvatarUrls((prev) => new Set(prev).add(char.avatarUrl));
                              }}
                            />
                          )}
                          {char.isSpeaking && (
                            <div
                              className="speaking-indicator"
                              style={{ transform: `scaleX(${isFlipped ? -1 : 1})` }}
                            >
                              <Sparkles size={16} />
                            </div>
                          )}
                        </div>

                        {(() => {
                          const isNameVisible =
                            nameDisplayMode === 'always' ||
                            !nameDisplayMode ||
                            (nameDisplayMode === 'speaker_only' && char.isSpeaking);

                          const hasVisibleContent = isNameVisible || !!char.statusBadge;
                          if (!hasVisibleContent) return null;

                          const isNameplateTop =
                            char.nameplatePosition === 'top' ||
                            (char.nameplatePosition !== 'bottom' &&
                              char.nameplatePosition !== 'side' &&
                              (hasActiveDialogue && posY < 18));
                          const isNameplateSide = char.nameplatePosition === 'side';

                          const tagPlacementStyle: React.CSSProperties = isNameplateTop
                            ? {
                                position: 'absolute',
                                top: '-34px',
                                left: '50%',
                                transform: `translateX(-50%) scaleX(${isFlipped ? -1 : 1})`,
                                zIndex: 26,
                              }
                            : isNameplateSide
                            ? {
                                position: 'absolute',
                                left: '102%',
                                bottom: '20px',
                                transform: `scaleX(${isFlipped ? -1 : 1})`,
                                zIndex: 26,
                              }
                            : {
                                transform: `scaleX(${isFlipped ? -1 : 1})`,
                              };

                          return (
                            <div
                              className={`character-tag ${
                                isNameplateTop
                                  ? 'character-tag-top'
                                  : isNameplateSide
                                  ? 'character-tag-side'
                                  : 'character-tag-bottom'
                              }`}
                              style={tagPlacementStyle}
                            >
                              {isNameVisible && (
                                <span className="char-name" title={publicDisplayName}>
                                  {publicDisplayName}
                                </span>
                              )}
                              {isNameVisible && char.activeExpression && !isIdentityHidden && (
                                <span className="char-expression">({char.activeExpression})</span>
                              )}
                              {char.statusBadge && (
                                <span className="char-status-badge">{char.statusBadge}</span>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        }

        // Occlusion Region rendering
        if (item.type === 'occlusion') {
          const occ = item.data;
          const leftPercent = occ.x;
          const bottomPercent = occ.y;
          const widthPercent = Math.max(1, occ.width);
          const heightPercent = Math.max(1, occ.height);

          return (
            <div
              key={occ.id}
              className="stage-occlusion-region"
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                bottom: `${bottomPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                zIndex: item.zIndex,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              <div
                className="stage-occlusion-inner"
                style={{
                  position: 'absolute',
                  left: `-${(leftPercent / widthPercent) * 100}%`,
                  bottom: `-${(bottomPercent / heightPercent) * 100}%`,
                  width: `${(100 / widthPercent) * 100}%`,
                  height: `${(100 / heightPercent) * 100}%`,
                  backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
          );
        }

        // Prop item rendering
        const prop = item.data;
        const isBottomAnchor = prop.anchor !== 'center';
        const effectiveScale = prop.scale !== undefined ? prop.scale : 1.0;

        return (
          /* 1. OUTER WRAPPER: Coordinates and displacement */
          <div
            key={prop.id}
            className="stage-item-pos-wrapper"
            style={{
              position: 'absolute',
              left: `${prop.normalizedX}%`,
              bottom: `${prop.normalizedY}%`,
              zIndex: item.zIndex,
              pointerEvents: 'none',
              transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* 2. MIDDLE WRAPPER: Ephemeral transition animation */}
            <div
              className={`stage-item-anim-wrapper ${animClass}`}
              style={
                animClass
                  ? ({ '--anim-duration': `${animDurationMs}ms` } as React.CSSProperties)
                  : undefined
              }
            >
              {/* 3. INNER WRAPPER: Instance visual transforms */}
              <div
                className="scene-prop-card"
                style={{
                  transformOrigin: isBottomAnchor ? 'bottom center' : 'center center',
                  transform: `translate(-50%, ${isBottomAnchor ? '0' : '50%'}) rotate(${
                    prop.rotation || 0
                  }deg) scale(${effectiveScale}) scaleX(${prop.isFlipped ? -1 : 1})`,
                  opacity: prop.opacity !== undefined ? prop.opacity : 1.0,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <img
                  src={prop.assetUrl}
                  alt={prop.name}
                  className="prop-asset-img"
                  style={{
                    maxWidth: '400px',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
                  }}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
