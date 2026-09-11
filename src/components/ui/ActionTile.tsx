import React from 'react';
import { ArrowRight } from 'lucide-react';
import { FloatingHint } from './FloatingHint';

interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  onMouseEnter?: () => void;
  onTouchStart?: () => void;
  tone?: 'default' | 'accent' | 'danger';
  compact?: boolean;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  hint,
  onClick,
  onMouseEnter,
  onTouchStart,
  tone = 'default',
  compact = false,
}) => {
  const tile = (
    <button
      type="button"
      className={`action-tile action-tile-${tone} ${compact ? 'action-tile-compact' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      aria-label={label}
    >
      <span className="action-tile-icon">{icon}</span>
      <span className="action-tile-copy">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );

  return hint ? <FloatingHint label={hint}>{tile}</FloatingHint> : tile;
};
