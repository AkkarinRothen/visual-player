import { describe, it, expect, beforeEach, vi } from 'vitest';
import { backButtonStack } from './backButtonStack';

describe('BackButtonStack LIFO Priority Navigation Suite', () => {
  beforeEach(() => {
    backButtonStack.clear();
    vi.restoreAllMocks();
  });

  it('1. Returns false when stack is empty and no input is focused', () => {
    const handled = backButtonStack.dispatchBack();
    expect(handled).toBe(false);
  });

  it('2. Dispatches in LIFO priority order: modal over expanded viewport over tab navigation', () => {
    const log: string[] = [];

    backButtonStack.register({
      id: 'tab-nav',
      priority: 'navigation',
      handleBack: () => {
        log.push('tab-nav');
        return true;
      },
    });

    backButtonStack.register({
      id: 'expanded-view',
      priority: 'expanded',
      handleBack: () => {
        log.push('expanded-view');
        return true;
      },
    });

    backButtonStack.register({
      id: 'active-modal',
      priority: 'modal',
      handleBack: () => {
        log.push('active-modal');
        return true;
      },
    });

    // First press should consume the highest priority layer (modal)
    const firstPress = backButtonStack.dispatchBack();
    expect(firstPress).toBe(true);
    expect(log).toEqual(['active-modal']);

    // Unregister closed modal
    backButtonStack.unregister('active-modal');

    // Second press should consume next layer (expanded viewport)
    const secondPress = backButtonStack.dispatchBack();
    expect(secondPress).toBe(true);
    expect(log).toEqual(['active-modal', 'expanded-view']);
  });

  it('3. Dismisses virtual keyboard without closing the form or modal', () => {
    const mockInput = document.createElement('input');
    document.body.appendChild(mockInput);
    mockInput.focus();

    const blurSpy = vi.spyOn(mockInput, 'blur');
    const modalHandler = vi.fn().mockReturnValue(true);

    backButtonStack.register({
      id: 'test-modal',
      priority: 'modal',
      handleBack: modalHandler,
    });

    // Press while input is focused
    const handled = backButtonStack.dispatchBack();

    expect(handled).toBe(true);
    expect(blurSpy).toHaveBeenCalled();
    // Modal handler must NOT be called when keyboard is dismissed
    expect(modalHandler).not.toHaveBeenCalled();

    document.body.removeChild(mockInput);
  });
});
