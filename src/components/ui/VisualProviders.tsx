import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Toaster } from 'sonner';

export const VisualProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const root = document.documentElement;
    const setKeyboardState = (isOpen: boolean, height = 0) => {
      root.classList.toggle('visual-keyboard-open', isOpen);
      root.style.setProperty('--keyboard-height', `${Math.max(0, height)}px`);
    };

    const showListener = Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      setKeyboardState(true, keyboardHeight);
    });
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardState(false);
    });

    return () => {
      setKeyboardState(false);
      void Promise.all([showListener, hideListener]).then((listeners) => {
        listeners.forEach((listener) => void listener.remove());
      });
    };
  }, []);

  return (
    <>
      <Tooltip.Provider delayDuration={220} skipDelayDuration={80}>
        {children}
      </Tooltip.Provider>
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          classNames: {
            toast: 'visual-toast',
            title: 'visual-toast-title',
            description: 'visual-toast-description',
            actionButton: 'visual-toast-action',
            cancelButton: 'visual-toast-cancel',
            closeButton: 'visual-toast-close',
          },
        }}
      />
    </>
  );
};
