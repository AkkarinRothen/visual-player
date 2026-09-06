import React from 'react';
import { ArrowRight } from 'lucide-react';
import { IonRippleEffect, setupIonicReact } from '@ionic/react';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import { Button } from 'react-aria-components';
import { FloatingHint } from './FloatingHint';

setupIonicReact({ mode: 'md' });

interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'danger';
  compact?: boolean;
}

export const ActionTile: React.FC<ActionTileProps> = ({
  icon,
  label,
  hint,
  onClick,
  tone = 'default',
  compact = false,
}) => {
  const tile = (
    <Button
      className={`action-tile action-tile-${tone} ${compact ? 'action-tile-compact' : ''} ion-activatable`}
      onPress={onClick}
    >
    <span className="action-tile-icon">{icon}</span>
    <span className="action-tile-copy">
      <strong>{label}</strong>
      {hint && <small>{hint}</small>}
    </span>
    <ArrowRight size={15} aria-hidden="true" />
      <IonRippleEffect />
    </Button>
  );

  return hint ? <FloatingHint label={hint}>{tile}</FloatingHint> : tile;
};
