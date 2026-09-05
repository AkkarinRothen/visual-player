import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageTouchOverlay } from './StageTouchOverlay';
import type { CharacterOnScreen } from '../../../types';

describe('StageTouchOverlay (Lienzo Táctico y Standees)', () => {
  const mockCharacters: CharacterOnScreen[] = [
    {
      id: 'char-1',
      name: 'Valeros',
      avatarUrl: 'https://example.com/valeros.png',
      normalizedX: 20,
      normalizedY: 20,
      tacticalTeam: 'allies',
      scale: 1,
      position: 'center-left',
      isSpeaking: false,
    },
    {
      id: 'char-2',
      name: 'Goblin',
      avatarUrl: 'https://example.com/goblin.png',
      normalizedX: 60,
      normalizedY: 20,
      tacticalTeam: 'enemies',
      scale: 1,
      position: 'center-right',
      isSpeaking: false,
    },
  ];

  it('1. Renderiza hitboxes tradicionales cuando isTacticalMode es false', () => {
    const onSelect = vi.fn();
    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId={null}
        onSelectCharacter={onSelect}
        isTacticalMode={false}
      />
    );

    const char1 = screen.getByTestId('stage-char-hitbox-char-1');
    expect(char1).toBeDefined();
    expect(char1.getAttribute('title')).toContain('Valeros (Tocar para editar)');

    // No debe renderizar la cuadrícula SVG
    const svgGrid = document.querySelector('svg');
    expect(svgGrid).toBeNull();
  });

  it('2. Renderiza tokens circulares y cuadrícula SVG cuando isTacticalMode es true', () => {
    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId="char-1"
        onSelectCharacter={vi.fn()}
        isTacticalMode={true}
        gridConfig={{ enabled: true, type: 'square', columns: 10, opacity: 0.6 }}
      />
    );

    const char1 = screen.getByTestId('stage-char-hitbox-char-1');
    expect(char1.getAttribute('title')).toContain('Token táctico');

    const svgGrid = document.querySelector('svg');
    expect(svgGrid).toBeDefined();
    // Líneas de cuadrícula presentes
    const lines = svgGrid?.querySelectorAll('line');
    expect(lines && lines.length).toBeGreaterThan(10);
  });

  it('3. Tocar un token táctico ejecuta onSelectCharacter', () => {
    const onSelect = vi.fn();
    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId={null}
        onSelectCharacter={onSelect}
        isTacticalMode={true}
      />
    );

    const goblin = screen.getByTestId('stage-char-hitbox-char-2');
    fireEvent.pointerDown(goblin, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(goblin, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(onSelect).toHaveBeenCalledWith('char-2');
  });

  it('4. Arrastrar un token táctico y soltarlo ajusta (snap) la posición a la cuadrícula', () => {
    const onMove = vi.fn();
    const { container } = render(
      <div style={{ width: '1000px', height: '562px' }}>
        <StageTouchOverlay
          characters={mockCharacters}
          selectedCharId="char-1"
          onSelectCharacter={vi.fn()}
          onMoveCharacter={onMove}
          isTacticalMode={true}
          gridConfig={{ enabled: true, type: 'square', columns: 10, opacity: 0.6 }}
        />
      </div>
    );

    // Mock getBoundingClientRect on container
    const overlay = container.firstElementChild?.firstElementChild as HTMLElement;
    if (overlay) {
      vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 562,
        top: 0,
        left: 0,
        bottom: 562,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
    }

    const valeros = screen.getByTestId('stage-char-hitbox-char-1');
    // Start drag at x: 200, y: 300
    fireEvent.pointerDown(valeros, { clientX: 200, clientY: 300, pointerId: 1 });
    // Move by +154px X (15.4% -> approx 35.4% normX) and -60px Y
    fireEvent.pointerMove(valeros, { clientX: 354, clientY: 240, pointerId: 1 });
    // Release
    fireEvent.pointerUp(valeros, { clientX: 354, clientY: 240, pointerId: 1 });

    expect(onMove).toHaveBeenCalledTimes(1);
    const [charId, snappedX] = onMove.mock.calls[0];
    expect(charId).toBe('char-1');
    expect(snappedX % 10).toBe(0); // Exact multiple of stepX (10%)
  });

  it('5. Muestra el HUD de distancia y línea elástica hacia el oponente más cercano', () => {
    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId="char-1" // Valeros (allies)
        onSelectCharacter={vi.fn()}
        isTacticalMode={true}
        gridConfig={{ enabled: true, type: 'square', columns: 10, opacity: 0.6 }}
      />
    );

    // Valeros está seleccionado, Goblin es el oponente más cercano
    const distanceHud = screen.getByTestId('stage-tactical-hud-distance');
    expect(distanceHud).toBeDefined();
    expect(distanceHud.textContent).toContain('Goblin');
    expect(distanceHud.textContent).toContain('celdas');
  });

  it('6. Renderiza cuadrícula hexagonal cuando el tipo es hex', () => {
    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId={null}
        onSelectCharacter={vi.fn()}
        isTacticalMode={true}
        gridConfig={{ enabled: true, type: 'hex', columns: 8, opacity: 0.5 }}
      />
    );

    const svgGrid = document.querySelector('svg');
    expect(svgGrid).toBeDefined();
    const polygons = svgGrid?.querySelectorAll('polygon');
    expect(polygons && polygons.length).toBeGreaterThan(10);
  });
});
