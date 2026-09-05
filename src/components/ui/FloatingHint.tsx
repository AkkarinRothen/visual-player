import React, { useState } from 'react';
import {
  FloatingPortal,
  offset,
  flip,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  autoUpdate,
} from '@floating-ui/react';

interface FloatingHintProps {
  label: string;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>>;
}

export const FloatingHint: React.FC<FloatingHintProps> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 10 })],
  });
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss]);

  return (
    <>
      {React.cloneElement(children, {
        ref: refs.setReference,
        ...getReferenceProps(children.props),
      })}
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="vp-floating-hint"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {label}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
