/**
 * Centralized LIFO Navigation & Back Button Stack for Android and Web
 *
 * Coordinates hardware/gesture Back button handling across modals,
 * drawers, active drag gestures, virtual keyboard, expanded viewports
 * and root session exit confirmation.
 */

export type BackHandlerPriority =
  | 'keyboard' // Priority 1: Virtual keyboard is open
  | 'gesture' // Priority 2: In-flight touch drag or edit gesture
  | 'drawer' // Priority 3: Bottom drawer / contextual menu
  | 'modal' // Priority 4: Centered overlay modal
  | 'expanded' // Priority 5: Fullscreen / expanded viewport mode
  | 'navigation' // Priority 6: Internal tab navigation
  | 'root'; // Priority 7: Root exit session confirmation

export interface BackHandlerRegistration {
  id: string;
  priority: BackHandlerPriority;
  handleBack: () => boolean; // return true if consumed, false if delegated
}

const PRIORITY_ORDER: Record<BackHandlerPriority, number> = {
  keyboard: 100,
  gesture: 90,
  drawer: 80,
  modal: 70,
  expanded: 60,
  navigation: 50,
  root: 10,
};

class BackButtonStack {
  private handlers: BackHandlerRegistration[] = [];

  /**
   * Registers a back action handler in the stack.
   * Returns an unregister function.
   */
  public register(registration: BackHandlerRegistration): () => void {
    this.handlers.push(registration);
    return () => {
      this.unregister(registration.id);
    };
  }

  /**
   * Removes a handler by registration id.
   */
  public unregister(id: string): void {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  /**
   * Dispatches a Back button event down the LIFO priority stack.
   * Resolves exactly ONE active layer per event.
   * Returns true if consumed, false if unhandled (can exit app).
   */
  public dispatchBack(): boolean {
    // 1. Automatic Keyboard Dismissal Layer
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        activeEl.blur();
        return true; // Consumed by dismissing the keyboard; keeps modal/form open
      }
    }

    if (this.handlers.length === 0) {
      return false;
    }

    // Sort handlers by priority descending, then insertion order descending (LIFO)
    const sorted = [...this.handlers].sort((a, b) => {
      const diff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (diff !== 0) return diff;
      return this.handlers.indexOf(b) - this.handlers.indexOf(a);
    });

    for (const handler of sorted) {
      const consumed = handler.handleBack();
      if (consumed) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clears all registered handlers (used in test teardown or logout).
   */
  public clear(): void {
    this.handlers = [];
  }
}

export const backButtonStack = new BackButtonStack();
