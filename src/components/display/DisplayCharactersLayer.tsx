import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import type {
  CharacterOnScreen,
  CharacterPosition,
  ElementTransitionDirective,
  SceneProp,
  CombatState,
} from '../../types';

interface DisplayCharactersLayerProps {
  characters: CharacterOnScreen[];
  props?: SceneProp[];
  activeTransitions?: ElementTransitionDirective[];
  combatState?: CombatState;
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
  | { type: 'prop'; data: SceneProp; zIndex: number };

interface ExitingStageItem {
  item: StageItem;
  directive: ElementTransitionDirective;
  removeAt: number;
}

export const DisplayCharactersLayer: React.FC<DisplayCharactersLayerProps> = ({
  characters,
  props = [],
  activeTransitions = [],
  combatState,
}) => {
  const hasSpeaking = characters.some((c) => c.isSpeaking);

  // Track previous items to detect elements removed with an 'exit' transition directive
  const prevItemsRef = useRef<StageItem[]>([]);
  const [exitingItems, setExitingItems] = useState<ExitingStageItem[]>([]);

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
          const posY = char.normalizedY !== undefined ? char.normalizedY : 0;
          const effectiveScale = char.scale !== undefined ? char.scale : 1.0;
          const isFlipped = !!char.isFlipped;
          const isDimmed = hasSpeaking && !char.isSpeaking;

          const activeCombatant = combatState?.isActive
            ? combatState.combatants[combatState.currentTurnIndex]
            : null;
          const isActiveCombatant =
            !!activeCombatant &&
            (activeCombatant.characterId === char.id || activeCombatant.id === char.id);

          return (
            /* 1. OUTER WRAPPER: Coordinates and displacement */
            <div
              key={char.id}
              className="stage-item-pos-wrapper"
              style={{
                position: 'absolute',
                left: `${posX}%`,
                bottom: `${posY}%`,
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
                  className={`character-card ${char.isSpeaking ? 'is-speaking' : ''} ${
                    isDimmed ? 'is-dimmed' : ''
                  } ${isActiveCombatant ? 'active-combatant-focal ring-2 ring-amber-400/80 rounded-2xl' : ''}`}
                  style={{
                    transformOrigin: 'bottom center',
                    transform: `translate(-50%, 0) scale(${effectiveScale}) scaleX(${
                      isFlipped ? -1 : 1
                    })`,
                    transition: 'filter 0.4s ease',
                  }}
                >
                  {char.isSpeaking && <div className="speaking-aura" />}
                  {isActiveCombatant && <div className="active-combatant-aura" />}

                  {/* Active combatant condition badges */}
                  {isActiveCombatant && activeCombatant?.conditions && activeCombatant.conditions.length > 0 && (
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
                      {activeCombatant.conditions.map((cond, idx) => (
                        <span
                          key={idx}
                          className="combat-condition-chip"
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
                    </div>
                  )}

                  <div className="standee-proportional-frame">
                    <img
                      src={char.avatarUrl}
                      alt={char.name}
                      className="standee-proportional-img"
                      loading="eager"
                    />
                    {char.isSpeaking && (
                      <div
                        className="speaking-indicator"
                        style={{ transform: `scaleX(${isFlipped ? -1 : 1})` }}
                      >
                        <Sparkles size={16} />
                      </div>
                    )}
                  </div>

                  <div
                    className="character-tag"
                    style={{ transform: `scaleX(${isFlipped ? -1 : 1})` }}
                  >
                    <span className="char-name">{char.name}</span>
                    {char.activeExpression && (
                      <span className="char-expression">({char.activeExpression})</span>
                    )}
                    {char.statusBadge && (
                      <span className="char-status-badge">{char.statusBadge}</span>
                    )}
                  </div>
                </div>
              </div>
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
