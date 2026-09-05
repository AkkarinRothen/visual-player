import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionIdentityHeader } from './SessionIdentityHeader';

describe('SessionIdentityHeader', () => {
  const defaultProps = {
    sessionName: 'Campaña Épica',
    isEditingSessionName: false,
    sessionNameInputRef: { current: null },
    onStartEditSessionName: vi.fn(),
    onChangeSessionName: vi.fn(),
    onSessionNameKeyDown: vi.fn(),
    onSessionNameBlur: vi.fn(),
    draftSaveState: 'idle' as const,
    savedRelativeTime: 10,
    savedSecondsAgo: 5,
  };

  it('renders both Packs and Sesiones buttons and responds to click events', () => {
    const handleOpenPacks = vi.fn();
    const handleOpenSessions = vi.fn();

    render(
      <SessionIdentityHeader
        {...defaultProps}
        onOpenResourcePacks={handleOpenPacks}
        onOpenSessionLibrary={handleOpenSessions}
      />
    );

    const packsBtn = screen.getByRole('button', { name: /Packs de Recursos Visuales/i });
    expect(packsBtn).toBeDefined();
    expect(packsBtn.textContent).toContain('Packs');

    fireEvent.click(packsBtn);
    expect(handleOpenPacks).toHaveBeenCalledTimes(1);

    const sessionsBtn = screen.getByRole('button', { name: /Biblioteca de Sesiones/i });
    expect(sessionsBtn).toBeDefined();
    expect(sessionsBtn.textContent).toContain('Sesiones');

    fireEvent.click(sessionsBtn);
    expect(handleOpenSessions).toHaveBeenCalledTimes(1);
  });
});
