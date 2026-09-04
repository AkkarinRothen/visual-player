import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CharacterDirectorOverlay } from '../../components/master/CharacterDirectorOverlay';
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
});

