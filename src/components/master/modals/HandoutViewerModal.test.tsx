import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HandoutViewerModal } from './HandoutViewerModal';
import type { HandoutState } from '../../../types';

describe('HandoutViewerModal', () => {
  const sampleHandout: HandoutState = {
    id: 'test-handout-1',
    title: 'Carta Secreta del Nigromante',
    imageUrl: 'https://example.com/letter.jpg',
    revealedRects: [],
    revealedCircles: [],
    isFullyRevealed: false,
    zoom: 1.0,
    panOffset: { x: 0, y: 0 },
  };

  it('renders modal header, multipage bar and controls when open', () => {
    const handleClose = vi.fn();
    const handleProject = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <HandoutViewerModal
        isOpen={true}
        activeHandout={null}
        savedHandouts={[sampleHandout]}
        onProjectHandout={handleProject}
        onDismissHandout={handleDismiss}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Visor de Handouts y Cartas')).toBeDefined();
    expect(screen.getByText('Borrador DM')).toBeDefined();
    expect(screen.getByText('Pág. 1')).toBeDefined();
    expect(screen.getByText('Recuadro')).toBeDefined();
    expect(screen.getByText('Pincel')).toBeDefined();
    expect(screen.getByText('Mover')).toBeDefined();
    expect(screen.getByText(/Proyectar Pág\. 1 a la Mesa/i)).toBeDefined();

    // Close button
    const closeBtn = screen.getByTitle('Cerrar visor');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows adding and navigating between pages', () => {
    const handleProject = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <HandoutViewerModal
        isOpen={true}
        activeHandout={null}
        savedHandouts={[sampleHandout]}
        onProjectHandout={handleProject}
        onDismissHandout={handleDismiss}
        onClose={vi.fn()}
      />
    );

    // Initial page
    expect(screen.getByText('Pág. 1')).toBeDefined();
    expect(screen.queryByText('Pág. 2')).toBeNull();

    // Add page
    const addPageBtn = screen.getByTitle('Añadir una nueva página al documento');
    fireEvent.click(addPageBtn);

    // Page 2 should now exist
    expect(screen.getByText('Pág. 2')).toBeDefined();

    // Switch back to Page 1
    fireEvent.click(screen.getByText('Pág. 1'));
    expect(screen.getByText(/Proyectar Pág\. 1 a la Mesa/i)).toBeDefined();
  });

  it('triggers onProjectHandout when projecting and onDismissHandout when retracting', () => {
    const handleProject = vi.fn();
    const handleDismiss = vi.fn();

    const { rerender } = render(
      <HandoutViewerModal
        isOpen={true}
        activeHandout={null}
        savedHandouts={[sampleHandout]}
        onProjectHandout={handleProject}
        onDismissHandout={handleDismiss}
        onClose={vi.fn()}
      />
    );

    const projectBtn = screen.getByText(/Proyectar Pág\. 1 a la Mesa/i);
    fireEvent.click(projectBtn);
    expect(handleProject).toHaveBeenCalledTimes(1);

    // When projected
    rerender(
      <HandoutViewerModal
        isOpen={true}
        activeHandout={sampleHandout}
        savedHandouts={[sampleHandout]}
        onProjectHandout={handleProject}
        onDismissHandout={handleDismiss}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Mesa: Pág\. 1/i)).toBeDefined();
    const dismissBtn = screen.getByText('Retirar de la Mesa');
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
