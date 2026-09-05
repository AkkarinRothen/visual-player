import React from 'react';
import * as Switch from '@radix-ui/react-switch';

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  checkedLabel: string;
  uncheckedLabel: string;
  ariaLabel: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onCheckedChange,
  checkedLabel,
  uncheckedLabel,
  ariaLabel,
}) => (
  <span className={`toggle-switch-row ${checked ? 'is-on' : 'is-off'}`}>
    <span>{checked ? checkedLabel : uncheckedLabel}</span>
    <Switch.Root
      className="toggle-switch-root"
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
    >
      <Switch.Thumb className="toggle-switch-thumb" />
    </Switch.Root>
  </span>
);
