import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface IconTooltipProps {
  label: string;
  children: React.ReactElement;
}

export const IconTooltip: React.FC<IconTooltipProps> = ({ label, children }) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="vp-tooltip-content" sideOffset={7}>
        {label}
        <Tooltip.Arrow className="vp-tooltip-arrow" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);
