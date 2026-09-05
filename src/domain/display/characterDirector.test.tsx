import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CharacterDirectorOverlay } from '../../components/master/CharacterDirectorOverlay';
import {
  calculateFormationPositions,
  evaluateMagneticSnap,
} from '../../components/master/director/formationMath';
import type { CharacterOnScreen, Character } from '../../types';

describe('CharacterDirectorOverlay & Touch Direction Suite', () => {
  const mockCharacters: CharacterOnScreen[] = [
    {
      id: 'guard-1',
      name: 'Guardia',
      privateLabel: 'Guardia Puerta',
      avatarUrl: 'https://example.com/guard.png',
      position: 'center-left',
      normalizedX: 30,
      normalizedY: 0,
      isSpeaking: false,
      scale: 1.0,
      presence: 'on_stage',
      isHidden: false,
    },
    {
      id: 'guard-2',
      name: 'Guardia',
      privateLabel: 'Guardia Izquierdo',
      avatarUrl: 'https://example.com/guard.png',
      position: 'center-right',
      normalizedX: 60,
      normalizedY: 10,
      isSpeaking: false,
      scale: 1.0,
      presence: 'on_stage',
      isHidden: false,
    },
    {
      id: 'rogue-reserve',
      name: 'Pícaro Emboscador',
      avatarUrl: 'https://example.com/rogue.png',
      position: 'left',
      normalizedX: 10,
      normalizedY: 0,
      isSpeaking: false,
      scale: 1.0,
      presence: 'in_reserve', // En reserva
      isHidden: false,
    },
  ];

  const mockCampaignCharacters: Character[] = [
    {
      id: 'char-guard',
      name: 'Guardia',
      roleOrTitle: 'Vigilante de la Muralla',
      defaultAvatarUrl: 'https://example.com/guard.png',
      expressions: {
        alerta: 'https://example.com/guard_alert.png',
        furia: 'https://example.com/guard_angry.png',
      },
    },
  ];

  it('1. Renderiza lista de chips con etiquetas privadas y estados de presencia/visibilidad', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Muestra etiqueta privada si está presente
    expect(getByText('[Guardia Puerta]')).toBeTruthy();
    expect(getByText('[Guardia Izquierdo]')).toBeTruthy();
    expect(getByText('Pícaro Emboscador')).toBeTruthy();
    expect(getByText('DESTINO: MESA (EN VIVO)')).toBeTruthy();
  });

  it('2. Selección táctil y barra de acciones rápidas: Voz, Ocultar, Presencia y Bloqueo', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText, queryByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Al inicio no hay personaje seleccionado ni barra flotante
    expect(queryByText('Voz')).toBeNull();

    // Seleccionar al Guardia Puerta tocando su chip
    fireEvent.click(getByText('[Guardia Puerta]'));

    // Ahora la barra de acciones rápidas está visible
    expect(getByText('Voz')).toBeTruthy();
    expect(getByText('Expresión')).toBeTruthy();
    expect(getByText('Ocultar')).toBeTruthy();
    expect(getByText('A reserva')).toBeTruthy();

    // 1. Conmutar Voz (isSpeaking)
    fireEvent.click(getByText('Voz'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { isSpeaking: true },
      expect.stringContaining('Hablar Guardia')
    );

    // 2. Conmutar Visibilidad (Ocultar en escena)
    fireEvent.click(getByText('Ocultar'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { isHidden: true },
      expect.stringContaining('Ocultar en escena')
    );

    // 3. Conmutar Presencia (Retirar a reserva)
    fireEvent.click(getByText('A reserva'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { presence: 'in_reserve' },
      expect.stringContaining('Retirar a reserva')
    );
  });

  it('3. Asignación de etiqueta privada del DM exclusiva para distinguir copias', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText, getByPlaceholderText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Seleccionar guardia 2
    fireEvent.click(getByText('[Guardia Izquierdo]'));

    // Abrir editor de etiqueta
    fireEvent.click(getByText('Etiqueta'));

    const input = getByPlaceholderText('ej. Guardia puerta, Guardia herido...');
    expect(input).toBeTruthy();

    // Escribir nueva etiqueta privada
    fireEvent.change(input, { target: { value: 'Guardia Torreta Norte' } });
    fireEvent.click(getByText('Guardar'));

    expect(onUpdate).toHaveBeenCalledWith(
      'guard-2',
      { privateLabel: 'Guardia Torreta Norte' },
      'Etiqueta privada asignada: "Guardia Torreta Norte"'
    );
  });

  it('4. Modo Selección Múltiple: desplaza un grupo conservando distancias relativas', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Activar selección múltiple
    fireEvent.click(getByText('Seleccionar varios'));
    expect(getByText('Selección múltiple (Activa)')).toBeTruthy();

    // Seleccionar guardia 1 y guardia 2
    fireEvent.click(getByText('[Guardia Puerta]'));
    fireEvent.click(getByText('[Guardia Izquierdo]'));

    // Simular arrastre sobre guardia 1 (delta X: +10%, delta Y: +5%)
    // mock container rect
    const container = document.querySelector('.director-ui-element')?.parentElement;
    if (container) {
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 500,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);
    }

    const guardHitboxes = document.querySelectorAll('.cursor-grab');
    const firstHitbox = guardHitboxes[0];

    fireEvent.pointerDown(firstHitbox, { clientX: 300, clientY: 400, pointerId: 1 });
    // Mover 100px a la derecha (+10%), 50px arriba (+10% en Y invertida)
    fireEvent.pointerMove(container || firstHitbox, { clientX: 400, clientY: 350, pointerId: 1 });
    fireEvent.pointerUp(container || firstHitbox, { pointerId: 1 });

    // Debe emitir onUpdateMultipleCharacterPositions con ambos guardias desplazados en bloque
    expect(onUpdateMultiple).toHaveBeenCalledTimes(1);
    const callArgs = onUpdateMultiple.mock.calls[0][0];
    expect(callArgs).toHaveLength(2);

    // Guardia 1: arrancó en (30, 0), con +10% en X y +10% en Y -> (40, 10)
    const g1Update = callArgs.find((u: any) => u.id === 'guard-1');
    expect(g1Update.normalizedX).toBe(40);
    expect(g1Update.normalizedY).toBe(10);

    // Guardia 2: arrancó en (60, 10), con +10% en X y +10% en Y -> (70, 20)
    const g2Update = callArgs.find((u: any) => u.id === 'guard-2');
    expect(g2Update.normalizedX).toBe(70);
    expect(g2Update.normalizedY).toBe(20);

    // Distancia relativa entre guardias (60 - 30 = 30) se conservó exactamente (70 - 40 = 30)
    expect(g2Update.normalizedX - g1Update.normalizedX).toBe(30);
  });

  it('5. Respeta isLocked: figuras bloqueadas no se mueven', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const lockedCharacters: CharacterOnScreen[] = [
      {
        ...mockCharacters[0],
        isLocked: true, // Bloqueado
      },
    ];

    render(
      <CharacterDirectorOverlay
        characters={lockedCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    const lockedHitbox = document.querySelector('.cursor-not-allowed');
    expect(lockedHitbox).toBeTruthy();

    fireEvent.pointerDown(lockedHitbox!, { clientX: 300, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(lockedHitbox!, { clientX: 500, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(lockedHitbox!, { pointerId: 1 });

    // No debe emitir ninguna actualización de movimiento
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onUpdateMultiple).not.toHaveBeenCalled();
  });

  it('6. Ajuste rápido de escala, volteo horizontal (isFlipped) y capas en la barra de acciones', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText, getByTitle } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Seleccionar guardia 1
    fireEvent.click(getByText('[Guardia Puerta]'));

    // 1. Volteo horizontal
    fireEvent.click(getByTitle('Invertir orientación horizontal (espejo)'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { isFlipped: true },
      'Voltear horizontalmente a Guardia'
    );

    // 2. Aumento de escala
    fireEvent.click(getByTitle('Aumentar escala visual'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { scale: 1.1 },
      'Ajustar escala de Guardia a 1.1x'
    );

    // 3. Traer al frente
    fireEvent.click(getByTitle('Traer al frente de la escena'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { zIndex: expect.any(Number) },
      'Traer al frente a Guardia'
    );
  });

  it('7. Conmutador de guías de escena y alineación al suelo de grupo seleccionado', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText, queryByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Al inicio las guías no están activas
    expect(queryByText('Línea de suelo (Y = 0%)')).toBeNull();

    // Activar guías
    fireEvent.click(getByText('Guías'));
    expect(getByText('Línea de suelo (Y = 0%)')).toBeTruthy();
    expect(getByText('Margen seguro: Diálogos y Nombres')).toBeTruthy();

    // Activar selección múltiple y seleccionar ambos guardias
    fireEvent.click(getByText('Seleccionar varios'));
    fireEvent.click(getByText('[Guardia Puerta]'));
    fireEvent.click(getByText('[Guardia Izquierdo]'));

    // Aparecen botones de alineación de grupo
    expect(getByText('Al suelo')).toBeTruthy();
    fireEvent.click(getByText('Al suelo'));

    expect(onUpdateMultiple).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'guard-1', normalizedY: 0 }),
        expect.objectContaining({ id: 'guard-2', normalizedY: 0 }),
      ]),
      'Alinear personajes a la línea de suelo'
    );
  });

  it('8. Menú de presets rápidos de cámara (Plano General, Hablante, Selección)', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();
    const onFocusCamera = vi.fn();

    const { getByText, queryByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
        onFocusCamera={onFocusCamera}
      />
    );

    // Al inicio el menú está cerrado
    expect(queryByText('Plano General')).toBeNull();

    // Abrir menú de cámara
    fireEvent.click(getByText('Cámara'));
    expect(getByText('Plano General')).toBeTruthy();
    expect(getByText('Hablante')).toBeTruthy();

    // Pulsar Plano General
    fireEvent.click(getByText('Plano General'));
    expect(onFocusCamera).toHaveBeenCalledWith(50, 50);
  });

  it('9. Panel "Más…" en móvil/compacto despliega secciones agrupadas (Presencia, Transformación, Organización)', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Seleccionar guardia
    fireEvent.click(getByText('[Guardia Puerta]'));

    // Pulsar "Más…"
    fireEvent.click(getByText('Más…'));

    // Comprobar secciones agrupadas
    expect(getByText('Presencia')).toBeTruthy();
    expect(getByText('Transformación')).toBeTruthy();
    expect(getByText('Organización')).toBeTruthy();

    // Probar acción "Girar (Espejo)" desde el panel
    fireEvent.click(getByText('Girar (Espejo)'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { isFlipped: true },
      'Voltear a Guardia'
    );
  });

  it('10. Calibración de apoyo visual (ajuste de offset para compensar márgenes transparentes)', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText, getByRole } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Seleccionar guardia y abrir "Más…"
    fireEvent.click(getByText('[Guardia Puerta]'));
    fireEvent.click(getByText('Más…'));

    // Abrir calibrador de apoyo
    fireEvent.click(getByText('Calibrar apoyo visual...'));
    expect(getByText('Calibrar apoyo en suelo: Guardia')).toBeTruthy();

    // Mover slider
    const slider = getByRole('slider');
    fireEvent.change(slider, { target: { value: '15' } });
    expect(getByText('Offset: +15%')).toBeTruthy();

    // Guardar
    fireEvent.click(getByText('Guardar apoyo'));
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      expect.objectContaining({ visualAnchorOffsetY: 15 }),
      'Punto de apoyo calibrado (+15%) para Guardia'
    );
  });

  it('11. Preparación de entrada desde reserva con animación y precarga verificada', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Seleccionar personaje en reserva (Pícaro Emboscador)
    fireEvent.click(getByText('Pícaro Emboscador'));
    fireEvent.click(getByText('Más…'));

    // Botón preparar entrada disponible por estar en reserva
    expect(getByText('Preparar entrada...')).toBeTruthy();
    fireEvent.click(getByText('Preparar entrada...'));

    expect(getByText('Preparar entrada: Pícaro Emboscador')).toBeTruthy();
    expect(getByText('Recurso público verificado y listo en Mesa')).toBeTruthy();

    // Seleccionar animación "Desde abajo"
    fireEvent.click(getByText('Desde abajo'));

    // Ejecutar entrada
    fireEvent.click(getByText('Hacer entrar a escena'));
    expect(onUpdate).toHaveBeenCalledWith(
      'rogue-reserve',
      { presence: 'on_stage' },
      'Entrada a escena con slide-bottom para Pícaro Emboscador'
    );
  });

  it('12. Encuadres de cámara personalizados con nombre y guardado', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();
    const onFocusCamera = vi.fn();
    const onSaveCameraPreset = vi.fn();

    const savedPresets = [
      {
        id: 'cam-bar',
        name: 'Mostrador',
        camera: { focalPoint: { x: 35, y: 45 }, zoom: 1.6 },
      },
    ];

    const { getByText, getByPlaceholderText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        savedCameraPresets={savedPresets}
        onSaveCameraPreset={onSaveCameraPreset}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
        onFocusCamera={onFocusCamera}
      />
    );

    // Abrir menú de cámara
    fireEvent.click(getByText('Cámara'));
    expect(getByText('Mostrador')).toBeTruthy();

    // Pulsar el encuadre personalizado "Mostrador"
    fireEvent.click(getByText('Mostrador'));
    expect(onFocusCamera).toHaveBeenCalledWith(35, 45);

    // Guardar nuevo encuadre
    fireEvent.click(getByText('Cámara'));
    fireEvent.click(getByText('Guardar encuadre actual...'));

    const input = getByPlaceholderText('ej. Mostrador, Puerta sótano...');
    fireEvent.change(input, { target: { value: 'Puerta Sótano' } });
    fireEvent.click(getByText('Guardar'));

    expect(onSaveCameraPreset).toHaveBeenCalledWith(
      'Puerta Sótano',
      expect.objectContaining({ zoom: 1.35 })
    );
  });

  it('13. Orden contextual "Detrás de…" y "Delante de…" entre personaje y prop (Mostrador de taberna)', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();
    const onReorderLayers = vi.fn();

    const mockProps = [
      {
        id: 'counter-1',
        name: 'Mostrador de Roble',
        assetUrl: 'https://example.com/counter.png',
        normalizedX: 40,
        normalizedY: 0,
        scale: 1.0,
        zIndex: 15,
        visible: true,
      },
    ];

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        props={mockProps}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
        onReorderLayers={onReorderLayers}
      />
    );

    // Seleccionar guardia y abrir panel "Más…"
    fireEvent.click(getByText('[Guardia Puerta]'));
    fireEvent.click(getByText('Más…'));

    // Botón "Detrás de…"
    expect(getByText('Detrás de…')).toBeTruthy();
    fireEvent.click(getByText('Detrás de…'));

    // Debe mostrar la lista con el Mostrador
    expect(getByText('Mostrador de Roble')).toBeTruthy();

    // Seleccionar el mostrador
    fireEvent.click(getByText('Mostrador de Roble'));

    // Debe llamar a reorderLayers reubicando al guardia detrás del mostrador
    expect(onReorderLayers).toHaveBeenCalled();
  });

  it('14. Modal "Ver capas de escena" lista de forma unificada personajes y props', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();
    const onReorderLayers = vi.fn();

    const mockProps = [
      {
        id: 'counter-1',
        name: 'Mostrador de Roble',
        assetUrl: 'https://example.com/counter.png',
        normalizedX: 40,
        normalizedY: 0,
        scale: 1.0,
        zIndex: 15,
        visible: true,
      },
    ];

    const { getByText, getAllByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        props={mockProps}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
        onReorderLayers={onReorderLayers}
      />
    );

    // Seleccionar guardia y abrir "Más…"
    fireEvent.click(getByText('[Guardia Puerta]'));
    fireEvent.click(getByText('Más…'));

    // Abrir "Ver capas de escena"
    fireEvent.click(getByText('Ver capas de escena'));

    // Comprobar que aparecen los elementos en la ventana
    expect(getByText('Capas de la Escena (Orden de Profundidad)')).toBeTruthy();
    expect(getByText('Mostrador de Roble')).toBeTruthy();
    expect(getAllByText('Guardia Puerta').length).toBeGreaterThanOrEqual(1);
  });

  it('15. Cambio de expresión resuelve el punto de apoyo específico sin saltos verticales', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const campaignCharsWithAnchors = [
      {
        ...mockCampaignCharacters[0],
        expressionAnchors: {
          furia: 24, // Apoyo calibrado para la imagen de furia
        },
      },
    ];

    const charsWithCampaignRef = [
      {
        ...mockCharacters[0],
        characterId: 'char-guard', // Vinculado a la campaña
        visualAnchorOffsetY: 5,
      },
    ];

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={charsWithCampaignRef}
        campaignCharacters={campaignCharsWithAnchors}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Seleccionar personaje
    fireEvent.click(getByText('[Guardia Puerta]'));

    // Abrir menú de expresión
    fireEvent.click(getByText('Expresión'));
    expect(getByText('furia')).toBeTruthy();

    // Seleccionar expresión "furia"
    fireEvent.click(getByText('furia'));

    // onUpdateCharacter debe haber recibido visualAnchorOffsetY = 24 automáticamente
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      expect.objectContaining({
        activeExpression: 'furia',
        visualAnchorOffsetY: 24,
      }),
      expect.stringContaining('apoyo: +24%')
    );
  });

  it('16. Desplazamiento grupal rígido se detiene en bloque al tocar el borde del escenario', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    // Activar modo multiselección
    fireEvent.click(getByText('Seleccionar varios'));

    // Seleccionar Guardia 1 (X=30) y Guardia 2 (X=60)
    fireEvent.click(getByText('[Guardia Puerta]'));
    fireEvent.click(getByText('[Guardia Izquierdo]'));

    // Simular inicio de arrastre en Guardia 2
    const targetNode = getByText('Guardia Izquierdo').closest('.director-ui-element');
    expect(targetNode).toBeTruthy();

    fireEvent.pointerDown(targetNode!, { clientX: 500, clientY: 300, pointerId: 1 });

    // Simular arrastre hacia la derecha
    const container = targetNode!.parentElement!;
    fireEvent.pointerMove(container, { clientX: 700, clientY: 300, pointerId: 1 });

    // Soltar
    fireEvent.pointerUp(container, { pointerId: 1 });

    // Ambos personajes deben haberse movido por el mismo delta exacto sin comprimirse
    expect(onUpdateMultiple).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'guard-1' }),
        expect.objectContaining({ id: 'guard-2' }),
      ]),
      expect.stringContaining('Mover grupo')
    );

    const callArgs = onUpdateMultiple.mock.calls[0][0];
    const g1 = callArgs.find((a: any) => a.id === 'guard-1');
    const g2 = callArgs.find((a: any) => a.id === 'guard-2');

    // La distancia relativa inicial (60 - 30 = 30) se debe conservar con precisión
    expect(g2.normalizedX - g1.normalizedX).toBe(30);
  });

  it('17. La tira permite añadir y retirar personajes con una sola pulsación', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();
    const onOpenCharacterLibrary = vi.fn();

    const { getByText, getByLabelText, getAllByLabelText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
        onOpenCharacterLibrary={onOpenCharacterLibrary}
      />
    );

    fireEvent.click(getByText('Añadir'));
    expect(onOpenCharacterLibrary).toHaveBeenCalledTimes(1);

    fireEvent.click(getAllByLabelText('Retirar a Guardia a reserva')[0]);
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { presence: 'in_reserve' },
      'Retirar a reserva a Guardia'
    );

    fireEvent.click(getByLabelText('Hacer entrar a Pícaro Emboscador'));
    expect(onUpdate).toHaveBeenCalledWith(
      'rogue-reserve',
      { presence: 'on_stage' },
      'Hacer entrar a escena a Pícaro Emboscador'
    );
  });

  it('18. Ignora temblores menores a 10 px y conserva precisión subporcentual al arrastrar', () => {
    const onUpdate = vi.fn();
    const onUpdateMultiple = vi.fn();

    const { getByTestId } = render(
      <CharacterDirectorOverlay
        characters={[mockCharacters[0]]}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={onUpdateMultiple}
      />
    );

    const handle = getByTestId('director-handle-guard-1');
    const container = handle.parentElement!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    fireEvent.pointerDown(handle, { clientX: 300, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(container, { clientX: 305, clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerId: 1 });
    expect(onUpdate).not.toHaveBeenCalled();

    fireEvent.pointerDown(handle, { clientX: 300, clientY: 400, pointerId: 2 });
    fireEvent.pointerMove(container, { clientX: 315, clientY: 400, pointerId: 2 });
    fireEvent.pointerUp(container, { pointerId: 2 });
    expect(onUpdate).toHaveBeenCalledWith(
      'guard-1',
      { normalizedX: 31.5, normalizedY: 0 },
      expect.stringContaining('(31.5%, 0%)')
    );
  });

  it('19. Permite arrastrar una ficha desde reserva hasta una posición concreta del escenario', () => {
    const onUpdate = vi.fn();
    const { getByText, getByTestId } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdate}
        onUpdateMultipleCharacterPositions={vi.fn()}
      />
    );

    const root = getByTestId('director-handle-guard-1').parentElement!;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    const reserveChip = getByText('Pícaro Emboscador').closest('button')!;
    fireEvent.pointerDown(reserveChip, { clientX: 120, clientY: 60, pointerId: 9 });
    fireEvent.pointerMove(root, { clientX: 700, clientY: 400, pointerId: 9 });
    fireEvent.pointerUp(root, { clientX: 700, clientY: 400, pointerId: 9 });

    expect(onUpdate).toHaveBeenCalledWith(
      'rogue-reserve',
      expect.objectContaining({
        presence: 'on_stage',
        isHidden: false,
        normalizedX: 70,
        normalizedY: 33.3,
      }),
      expect.stringContaining('Hacer entrar a Pícaro Emboscador')
    );
  });

  it('20. Muestra zonas de soltado, quita la instancia y ofrece Deshacer', () => {
    const onRemoveCharacters = vi.fn();
    const onUndo = vi.fn();
    const { getByText, getByTestId, getAllByRole } = render(
      <CharacterDirectorOverlay
        characters={[mockCharacters[0]]}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={vi.fn()}
        onUpdateMultipleCharacterPositions={vi.fn()}
        onRemoveCharacters={onRemoveCharacters}
        onUndo={onUndo}
        canUndo={true}
      />
    );

    const handle = getByTestId('director-handle-guard-1');
    const root = handle.parentElement!;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    fireEvent.pointerDown(handle, { clientX: 300, clientY: 400, pointerId: 10 });
    fireEvent.pointerMove(root, { clientX: 960, clientY: 550, pointerId: 10 });
    expect(getByText('Quitar')).toBeTruthy();
    fireEvent.pointerUp(root, { clientX: 960, clientY: 550, pointerId: 10 });

    expect(onRemoveCharacters).toHaveBeenCalledWith(['guard-1']);
    const undoButtons = getAllByRole('button', { name: 'Deshacer' });
    fireEvent.click(undoButtons[undoButtons.length - 1]);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('21. Duplica un personaje asignando etiquetas privadas secuenciales automáticas («Guardia 1», «Guardia 2»)', () => {
    const onAddCharacter = vi.fn();
    const onUpdateCharacter = vi.fn();
    const { getByTestId, getByText } = render(
      <CharacterDirectorOverlay
        characters={[{ ...mockCharacters[0], privateLabel: undefined }]}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={onUpdateCharacter}
        onUpdateMultipleCharacterPositions={vi.fn()}
        onAddCharacter={onAddCharacter}
      />
    );

    // Seleccionar la figura de Guardia
    const handle = getByTestId('director-handle-guard-1');
    fireEvent.click(handle);

    // Botón Duplicar en la barra inferior
    const duplicateButton = getByText('Duplicar');
    fireEvent.click(duplicateButton);

    // Verifica que el original se renombra a "Guardia 1"
    expect(onUpdateCharacter).toHaveBeenCalledWith(
      'guard-1',
      { privateLabel: 'Guardia 1' },
      expect.stringContaining('Guardia 1')
    );

    // Verifica que la nueva copia recibe "Guardia 2" y posición con offset
    expect(onAddCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        privateLabel: 'Guardia 2',
        presence: 'on_stage',
        normalizedX: expect.any(Number),
        normalizedY: expect.any(Number),
      }),
      expect.stringContaining('Guardia 2')
    );
  });

  it('22. Muestra puntos narrativos visibles y traslada la figura seleccionada al punto pulsado', () => {
    const onUpdateCharacter = vi.fn();
    const mockWaypoints = [
      { id: 'wp-door', name: 'Puerta Principal', normalizedX: 25, normalizedY: 0 },
      { id: 'wp-altar', name: 'Altar Sagrado', normalizedX: 75, normalizedY: 15 },
    ];

    const { getByTestId, getByText } = render(
      <CharacterDirectorOverlay
        characters={[mockCharacters[0]]}
        campaignCharacters={mockCampaignCharacters}
        waypoints={mockWaypoints}
        isStaging={false}
        onUpdateCharacter={onUpdateCharacter}
        onUpdateMultipleCharacterPositions={vi.fn()}
      />
    );

    // Activar conmutador de Puntos en la barra superior
    const pointsToggle = getByText(/Puntos/i);
    fireEvent.click(pointsToggle);

    // Verificar que los waypoints son visibles en el escenario
    const doorPoint = getByTestId('director-waypoint-wp-door');
    expect(doorPoint).toBeTruthy();
    expect(getByText('Puerta Principal')).toBeTruthy();

    // Seleccionar al Guardia
    const handle = getByTestId('director-handle-guard-1');
    fireEvent.click(handle);

    // Tocar el punto narrativo
    fireEvent.click(doorPoint);

    // Verifica que la figura seleccionada se mueve a las coordenadas del waypoint
    expect(onUpdateCharacter).toHaveBeenCalledWith(
      'guard-1',
      { normalizedX: 25, normalizedY: 0 },
      expect.stringContaining('Puerta Principal')
    );
  });

  it('23. Modo Seguir en Mesa: emite actualizaciones de arrastre en vivo con throttling', () => {
    const onLiveDragMove = vi.fn();
    const { getByTestId, getByText } = render(
      <CharacterDirectorOverlay
        characters={[mockCharacters[0]]}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={vi.fn()}
        onUpdateMultipleCharacterPositions={vi.fn()}
        onLiveDragMove={onLiveDragMove}
      />
    );

    // Activar conmutador "Seguir en Mesa"
    const followToggle = getByText('Seguir en Mesa');
    fireEvent.click(followToggle);
    expect(getByText('Mesa en vivo')).toBeTruthy();

    const handle = getByTestId('director-handle-guard-1');
    const root = handle.parentElement!;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    // Iniciar arrastre y mover superando touch slop (>10px)
    fireEvent.pointerDown(handle, { clientX: 300, clientY: 400, pointerId: 12 });
    fireEvent.pointerMove(root, { clientX: 450, clientY: 400, pointerId: 12 });

    // onLiveDragMove debe haber sido llamado con las coordenadas actualizadas
    expect(onLiveDragMove).toHaveBeenCalled();
    const updates = onLiveDragMove.mock.calls[0][0];
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'guard-1',
          normalizedX: expect.any(Number),
        }),
      ])
    );
  });

  describe('Formaciones Tácticas & Matemáticas de Escena (formationMath)', () => {
    const chars: CharacterOnScreen[] = [
      { id: 'c1', name: 'Alpha', avatarUrl: '', position: 'center-left', isSpeaking: false, normalizedX: 50, normalizedY: 0, presence: 'on_stage' },
      { id: 'c2', name: 'Beta', avatarUrl: '', position: 'center-left', isSpeaking: false, normalizedX: 40, normalizedY: 0, presence: 'on_stage' },
      { id: 'c3', name: 'Gamma', avatarUrl: '', position: 'center-left', isSpeaking: false, normalizedX: 60, normalizedY: 0, presence: 'on_stage' },
    ];

    it('calcula formación en Fila centrada respecto al ancla', () => {
      const positions = calculateFormationPositions(chars, 'c1', 'line');
      expect(positions).toHaveLength(3);
      // c1, c2, c3 deben estar horizontalmente distribuidas
      const c1Pos = positions.find((p) => p.id === 'c1');
      const c2Pos = positions.find((p) => p.id === 'c2');
      const c3Pos = positions.find((p) => p.id === 'c3');
      expect(c1Pos).toBeDefined();
      expect(c2Pos).toBeDefined();
      expect(c3Pos).toBeDefined();
      expect(c1Pos!.normalizedX).toBeLessThan(c2Pos!.normalizedX);
      expect(c2Pos!.normalizedX).toBeLessThan(c3Pos!.normalizedX);
      // Todas conservan Y = 0
      expect(c1Pos!.normalizedY).toBe(0);
      expect(c2Pos!.normalizedY).toBe(0);
      expect(c3Pos!.normalizedY).toBe(0);
    });

    it('calcula formación en Semicírculo arqueada', () => {
      const positions = calculateFormationPositions(chars, 'c1', 'semicircle');
      expect(positions).toHaveLength(3);
      const center = positions[1];
      const left = positions[0];
      const right = positions[2];
      expect(center.normalizedY).toBe(0);
      expect(left.normalizedY).toBeGreaterThan(center.normalizedY);
      expect(right.normalizedY).toBeGreaterThan(center.normalizedY);
    });

    it('calcula formación en Flancos dividiendo las alas', () => {
      const positions = calculateFormationPositions(chars, 'c1', 'flanks');
      const anchor = positions.find((p) => p.id === 'c1');
      const leftWing = positions.find((p) => p.id === 'c2');
      const rightWing = positions.find((p) => p.id === 'c3');
      expect(anchor!.normalizedX).toBe(50);
      expect(leftWing!.normalizedX).toBeLessThan(50);
      expect(rightWing!.normalizedX).toBeGreaterThan(50);
    });

    it('comprime elásticamente las formaciones para no salir de los bordes del escenario', () => {
      const edgeChars: CharacterOnScreen[] = [
        { id: 'e1', name: 'Borde', avatarUrl: '', position: 'center-left', isSpeaking: false, normalizedX: 92, normalizedY: 10, presence: 'on_stage' },
        { id: 'e2', name: 'Borde 2', avatarUrl: '', position: 'center-left', isSpeaking: false, normalizedX: 93, normalizedY: 10, presence: 'on_stage' },
        { id: 'e3', name: 'Borde 3', avatarUrl: '', position: 'center-left', isSpeaking: false, normalizedX: 94, normalizedY: 10, presence: 'on_stage' },
      ];
      const positions = calculateFormationPositions(edgeChars, 'e1', 'line');
      positions.forEach((p) => {
        expect(p.normalizedX).toBeGreaterThanOrEqual(5);
        expect(p.normalizedX).toBeLessThanOrEqual(95);
        expect(p.normalizedY).toBeGreaterThanOrEqual(0);
        expect(p.normalizedY).toBeLessThanOrEqual(70);
      });
    });
  });

  describe('Guías Magnéticas (evaluateMagneticSnap)', () => {
    it('atrae al centro horizontal (50%) dentro del umbral', () => {
      const res = evaluateMagneticSnap(49.2, 15, { snapThreshold: 2.2 });
      expect(res.snappedX).toBe(50);
      expect(res.guideLines).toHaveLength(1);
      expect(res.guideLines[0].label).toContain('Centro');
    });

    it('atrae a los tercios de escena (33.3% y 66.7%)', () => {
      const res1 = evaluateMagneticSnap(34.0, 10, { snapThreshold: 2.2 });
      expect(res1.snappedX).toBe(33.3);
      expect(res1.guideLines[0].label).toContain('Tercio');

      const res2 = evaluateMagneticSnap(65.8, 10, { snapThreshold: 2.2 });
      expect(res2.snappedX).toBe(66.7);
      expect(res2.guideLines[0].label).toContain('Tercio');
    });

    it('atrae a la línea de suelo (Y = 0%)', () => {
      const res = evaluateMagneticSnap(20, 1.5, { snapThreshold: 2.2 });
      expect(res.snappedY).toBe(0);
      expect(res.guideLines.some((g) => g.label?.includes('Suelo'))).toBe(true);
    });

    it('atrae a los puntos narrativos configurados', () => {
      const res = evaluateMagneticSnap(70.5, 29.5, {
        snapThreshold: 2.2,
        waypoints: [{ id: 'wp-door', name: 'Puerta Principal', normalizedX: 70, normalizedY: 30 }],
      });
      expect(res.snappedX).toBe(70);
      expect(res.snappedY).toBe(30);
      expect(res.guideLines.some((g) => g.label === 'Puerta Principal')).toBe(true);
    });
  });

  it('24. Selección múltiple: botón "Seleccionar todos" selecciona todas las figuras en escena', () => {
    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={vi.fn()}
        onUpdateMultipleCharacterPositions={vi.fn()}
      />
    );

    // Activar modo multiselección
    const multiBtn = getByText('Seleccionar varios');
    fireEvent.click(multiBtn);
    expect(getByText('Selección múltiple (Activa)')).toBeTruthy();

    // El botón "Seleccionar todos" debe aparecer
    const selectAllBtn = getByText('Seleccionar todos');
    expect(selectAllBtn).toBeTruthy();
    fireEvent.click(selectAllBtn);

    // Debe mostrar la barra de grupo o botones de grupo porque guard-1 y guard-2 están en escena
    expect(getByText('Al suelo')).toBeTruthy();
    expect(getByText('Distribuir')).toBeTruthy();
    expect(getByText('Formación ▾')).toBeTruthy();
  });

  it('25. Formaciones tácticas: menú desplegable y aplicación de formación en fila', () => {
    const onUpdateMultipleCharacterPositions = vi.fn();
    const { getByText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={vi.fn()}
        onUpdateMultipleCharacterPositions={onUpdateMultipleCharacterPositions}
      />
    );

    // Activar multiselección y seleccionar todos
    fireEvent.click(getByText('Seleccionar varios'));
    fireEvent.click(getByText('Seleccionar todos'));

    // Abrir menú "Formación ▾"
    const formationDropdownBtn = getByText('Formación ▾');
    fireEvent.click(formationDropdownBtn);

    expect(getByText('Fila horizontal')).toBeTruthy();
    expect(getByText('Semicírculo')).toBeTruthy();
    expect(getByText('Flancos (Alas)')).toBeTruthy();
    expect(getByText('Racimo (2 filas)')).toBeTruthy();

    // Clic en "Fila horizontal"
    fireEvent.click(getByText('Fila horizontal'));

    expect(onUpdateMultipleCharacterPositions).toHaveBeenCalled();
    const updates = onUpdateMultipleCharacterPositions.mock.calls[0][0];
    expect(updates.length).toBe(2); // guard-1 y guard-2
    expect(getByText('Formación "Fila horizontal" aplicada')).toBeTruthy();
  });

  it('26. Guardar formación personalizada mediante modal y aplicarla', () => {
    const onUpdateMultipleCharacterPositions = vi.fn();
    const { getByText, getByPlaceholderText } = render(
      <CharacterDirectorOverlay
        characters={mockCharacters}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={vi.fn()}
        onUpdateMultipleCharacterPositions={onUpdateMultipleCharacterPositions}
      />
    );

    // Seleccionar grupo
    fireEvent.click(getByText('Seleccionar varios'));
    fireEvent.click(getByText('Seleccionar todos'));

    // Abrir menú y seleccionar "Guardar formación actual..."
    fireEvent.click(getByText('Formación ▾'));
    fireEvent.click(getByText('Guardar formación actual...'));

    // El modal de guardar formación debe abrirse
    expect(getByText('Guardar formación personalizada')).toBeTruthy();
    const input = getByPlaceholderText('ej. Escolta en V, Guardia en puerta, Emboscada...');
    fireEvent.change(input, { target: { value: 'Escolta Real' } });

    fireEvent.click(getByText('Guardar formación'));

    expect(getByText('Formación "Escolta Real" guardada')).toBeTruthy();

    // Abrir menú de formación de nuevo y comprobar que "Escolta Real" aparece en Personalizadas
    fireEvent.click(getByText('Formación ▾'));
    expect(getByText('Escolta Real')).toBeTruthy();

    fireEvent.click(getByText('Escolta Real'));
    expect(onUpdateMultipleCharacterPositions).toHaveBeenCalled();
  });

  it('27. Guías magnéticas: retroalimentación háptica y líneas visuales al arrastrar', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    const { getByTestId, getByText } = render(
      <CharacterDirectorOverlay
        characters={[mockCharacters[0]]}
        campaignCharacters={mockCampaignCharacters}
        isStaging={false}
        onUpdateCharacter={vi.fn()}
        onUpdateMultipleCharacterPositions={vi.fn()}
      />
    );

    // Activar Imán
    const magnetBtn = getByText('Imán');
    fireEvent.click(magnetBtn);

    const handle = getByTestId('director-handle-guard-1');
    const root = handle.parentElement!;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    // Iniciar arrastre y arrastrar hacia el centro (X = 50%)
    // startX = 30%. deltaX = +20% -> 200px
    fireEvent.pointerDown(handle, { clientX: 300, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 500, clientY: 400, pointerId: 1 });

    // Debe dispararse la vibración háptica al engancharse magnéticamente con el eje central
    expect(vibrateMock).toHaveBeenCalledWith(10);
    // Debe dibujarse la guía visual de snap al 50%
    expect(getByTestId('snap-guide-x-50')).toBeTruthy();
  });
});
