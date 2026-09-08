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

  it('7. Emite streaming con onStreamMoveCharacter durante el arrastre y onMoveCharacter al soltar', () => {
    const onMove = vi.fn();
    const onStream = vi.fn();

    const { container } = render(
      <div style={{ width: '1000px', height: '562px' }}>
        <StageTouchOverlay
          characters={mockCharacters}
          selectedCharId="char-1"
          onSelectCharacter={vi.fn()}
          onMoveCharacter={onMove}
          onStreamMoveCharacter={onStream}
          isTacticalMode={false}
        />
      </div>
    );

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
    fireEvent.pointerDown(valeros, { clientX: 200, clientY: 300, pointerId: 1 });
    // Simulate drag movement
    fireEvent.pointerMove(valeros, { clientX: 250, clientY: 300, pointerId: 1 });

    expect(onStream).toHaveBeenCalled();
    // onMove (commit) is NOT yet called while dragging
    expect(onMove).not.toHaveBeenCalled();

    // Release pointer
    fireEvent.pointerUp(valeros, { clientX: 250, clientY: 300, pointerId: 1 });

    // onMove (commit) is called exactly once on release
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith('char-1', expect.any(Number), expect.any(Number));
  });

  it('8. Pellizco con 2 dedos sobre un personaje escala en vivo (onStreamScaleCharacter) y confirma al soltar (onScaleCharacter)', () => {
    const onScale = vi.fn();
    const onStreamScale = vi.fn();

    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId="char-1"
        onSelectCharacter={vi.fn()}
        onScaleCharacter={onScale}
        onStreamScaleCharacter={onStreamScale}
        isTacticalMode={false}
      />
    );

    const valeros = screen.getByTestId('stage-char-hitbox-char-1');

    // Primer dedo toca el personaje
    fireEvent.pointerDown(valeros, { clientX: 200, clientY: 200, pointerId: 1 });
    // Segundo dedo toca el personaje -> inicia pinch
    fireEvent.pointerDown(valeros, { clientX: 300, clientY: 200, pointerId: 2 });

    // Badge flotante de escala debe aparecer
    const chip = screen.getByTestId('stage-pinch-scale-chip-char-1');
    expect(chip).toBeDefined();
    expect(chip.textContent).toContain('100%');

    // Separar dedos (distancia inicial = 100px -> nueva distancia = 150px => factor 1.5x)
    fireEvent.pointerMove(valeros, { clientX: 350, clientY: 200, pointerId: 2 });

    expect(onStreamScale).toHaveBeenCalledWith('char-1', 1.5);
    expect(chip.textContent).toContain('150% · Grande');

    // Levantar segundo dedo -> commit atómico
    fireEvent.pointerUp(valeros, { clientX: 350, clientY: 200, pointerId: 2 });
    expect(onScale).toHaveBeenCalledWith('char-1', 1.5);

    // Levantar primer dedo
    fireEvent.pointerUp(valeros, { clientX: 200, clientY: 200, pointerId: 1 });
    // El chip debe desaparecer
    expect(screen.queryByTestId('stage-pinch-scale-chip-char-1')).toBeNull();
  });

  it('9. Pellizco con 2 dedos sobre el fondo del escenario ajusta el zoom de la cámara y muestra la píldora flotante', () => {
    const onCamera = vi.fn();
    const onStreamCamera = vi.fn();

    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId={null}
        onSelectCharacter={vi.fn()}
        onCameraChange={onCamera}
        onStreamCameraChange={onStreamCamera}
        camera={{ focalPoint: { x: 50, y: 50 }, zoom: 1.0 }}
        isTacticalMode={false}
      />
    );

    const bgTouch = screen.getByTestId('stage-background-touch-area');

    // Dedo 1 y dedo 2 tocan el fondo a 100px de distancia
    fireEvent.pointerDown(bgTouch, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerDown(bgTouch, { clientX: 300, clientY: 200, pointerId: 2 });

    // Separar dedos a 140px (1.4x zoom)
    fireEvent.pointerMove(bgTouch, { clientX: 340, clientY: 200, pointerId: 2 });

    expect(onStreamCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        zoom: 1.4,
      })
    );

    // Debe mostrar la píldora de zoom
    const zoomPill = screen.getByTestId('stage-camera-zoom-pill');
    expect(zoomPill).toBeDefined();
    expect(zoomPill.textContent).toContain('1.4x');

    // Soltar dedos -> commit
    fireEvent.pointerUp(bgTouch, { clientX: 340, clientY: 200, pointerId: 2 });
    expect(onCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        zoom: 1.4,
      })
    );
  });

  it('10. Botón de reinicio en píldora de zoom restablece la cámara a 1.0x', () => {
    const onCamera = vi.fn();

    render(
      <StageTouchOverlay
        characters={mockCharacters}
        selectedCharId={null}
        onSelectCharacter={vi.fn()}
        onCameraChange={onCamera}
        camera={{ focalPoint: { x: 50, y: 50 }, zoom: 1.6 }}
        isTacticalMode={false}
      />
    );

    const resetBtn = screen.getByTestId('stage-camera-reset-zoom-btn');
    expect(resetBtn).toBeDefined();

    fireEvent.click(resetBtn);

    expect(onCamera).toHaveBeenCalledWith({
      focalPoint: { x: 50, y: 50 },
      zoom: 1.0,
    });
  });
});
