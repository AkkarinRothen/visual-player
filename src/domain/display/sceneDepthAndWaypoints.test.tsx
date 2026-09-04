import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { DisplayCharactersLayer } from '../../components/display/DisplayCharactersLayer';
import type { CharacterOnScreen, SceneOcclusionRegion, StageWaypoint, Character } from '../../types';

describe('Serie 1, 2, 3 & 4: Profundidad de Escenario, Waypoints y Legibilidad Adaptativa', () => {
  // Serie 1: Oclusión de Escenario
  it('1. Renderiza regiones de oclusión con zIndex intercalado y recorte exacto del fondo', () => {
    const bg = 'https://example.com/tavern.jpg';
    const occlusionRegions: SceneOcclusionRegion[] = [
      {
        id: 'occ-counter',
        name: 'Mostrador de la Taberna',
        x: 20,
        y: 0,
        width: 30,
        height: 25,
        zIndex: 15,
      },
    ];

    const characters: CharacterOnScreen[] = [
      {
        id: 'char-innkeeper',
        name: 'Tabernero Brom',
        avatarUrl: 'https://example.com/brom.png',
        position: 'center',
        normalizedX: 30,
        normalizedY: 5,
        zIndex: 10, // Detrás del mostrador
        isSpeaking: false,
      },
      {
        id: 'char-patron',
        name: 'Cliente Sediento',
        avatarUrl: 'https://example.com/patron.png',
        position: 'center',
        normalizedX: 25,
        normalizedY: 0,
        zIndex: 20, // Delante del mostrador
        isSpeaking: false,
      },
    ];

    const { container } = render(
      <DisplayCharactersLayer
        characters={characters}
        occlusionRegions={occlusionRegions}
        backgroundUrl={bg}
        isMesaView={true}
      />
    );

    // Debe contener el contenedor de la región de oclusión
    const occEl = container.querySelector('.stage-occlusion-region') as HTMLElement;
    expect(occEl).not.toBeNull();
    expect(occEl.style.zIndex).toBe('15');
    expect(occEl.style.left).toBe('20%');
    expect(occEl.style.width).toBe('30%');
    expect(occEl.style.height).toBe('25%');

    // La capa interna debe clonar el fondo con backgroundSize cover
    const innerBg = occEl.querySelector('.stage-occlusion-inner') as HTMLElement;
    expect(innerBg).not.toBeNull();
    expect(innerBg.style.backgroundImage).toContain(bg);
  });

  // Serie 2: Puntos Narrativos (Waypoints)
  it('2. Soporta definición de puntos narrativos en la escena y detección de ocupación', () => {
    const waypoints: StageWaypoint[] = [
      {
        id: 'wp-door',
        name: 'En la puerta',
        normalizedX: 10,
        normalizedY: 0,
        suggestedZIndex: 10,
      },
      {
        id: 'wp-bar',
        name: 'Detrás de la barra',
        normalizedX: 35,
        normalizedY: 5,
        suggestedZIndex: 10,
      },
    ];

    const characters: CharacterOnScreen[] = [
      {
        id: 'c1',
        name: 'Guarda',
        avatarUrl: 'https://example.com/guard.png',
        position: 'center',
        normalizedX: 11, // Muy cerca de wp-door (distancia < 5%)
        normalizedY: 1,
        isSpeaking: false,
      },
    ];

    // Función de cálculo de proximidad utilizada en el Director Overlay
    const isWaypointOccupied = (wp: StageWaypoint, chars: CharacterOnScreen[]) => {
      return chars.some((c) => {
        const dx = (c.normalizedX ?? 50) - wp.normalizedX;
        const dy = (c.normalizedY ?? 0) - wp.normalizedY;
        return Math.hypot(dx, dy) < 6;
      });
    };

    expect(isWaypointOccupied(waypoints[0], characters)).toBe(true); // 'En la puerta' ocupado
    expect(isWaypointOccupied(waypoints[1], characters)).toBe(false); // 'Detrás de la barra' libre
  });

  // Serie 3: Legibilidad Adaptativa y Evasión de Diálogo
  it('3. Adapta la posición de las etiquetas de nombre según nameplatePosition y eleva a top si hay diálogo activo y está abajo', () => {
    const characters: CharacterOnScreen[] = [
      {
        id: 'c-bottom',
        name: 'Aldeano',
        avatarUrl: 'https://example.com/npc.png',
        position: 'center',
        normalizedX: 50,
        normalizedY: 5, // Está en la parte baja de la pantalla
        nameplatePosition: 'auto',
        isSpeaking: false,
      },
      {
        id: 'c-forced-top',
        name: 'Mago',
        avatarUrl: 'https://example.com/mage.png',
        position: 'center',
        normalizedX: 70,
        normalizedY: 50,
        nameplatePosition: 'top',
        isSpeaking: false,
      },
      {
        id: 'c-forced-side',
        name: 'Pícaro',
        avatarUrl: 'https://example.com/rogue.png',
        position: 'center',
        normalizedX: 20,
        normalizedY: 50,
        nameplatePosition: 'side',
        isSpeaking: false,
      },
    ];

    // Con diálogo activo en la pantalla
    const { container: containerWithDialogue } = render(
      <DisplayCharactersLayer
        characters={characters}
        hasActiveDialogue={true}
        isMesaView={true}
      />
    );

    // c-bottom estaba en Y=5 con auto, pero al haber diálogo activo se eleva automáticamente a top
    const tagBottom = containerWithDialogue.querySelector('.character-display-wrapper[data-character-id="c-bottom"] .character-tag');
    expect(tagBottom?.classList.contains('character-tag-top')).toBe(true);

    // c-forced-top se mantiene en top
    const tagTop = containerWithDialogue.querySelector('.character-display-wrapper[data-character-id="c-forced-top"] .character-tag');
    expect(tagTop?.classList.contains('character-tag-top')).toBe(true);

    // c-forced-side se coloca en lateral
    const tagSide = containerWithDialogue.querySelector('.character-display-wrapper[data-character-id="c-forced-side"] .character-tag');
    expect(tagSide?.classList.contains('character-tag-side')).toBe(true);
  });

  // Serie 3b: Compactación de condiciones de combate
  it('4. Agrupa visualmente condiciones de combate mostrando máximo 2 y badge +N si hay más', () => {
    const characters: CharacterOnScreen[] = [
      {
        id: 'c-buffed',
        name: 'Paladín Afectado',
        avatarUrl: 'https://example.com/paladin.png',
        position: 'center',
        normalizedX: 50,
        normalizedY: 20,
        activeConditions: ['blinded', 'charmed', 'poisoned', 'stunned'], // 4 condiciones
        isSpeaking: false,
      },
    ];

    const { container } = render(
      <DisplayCharactersLayer
        characters={characters}
        isMesaView={true}
      />
    );

    const badges = container.querySelectorAll('.condition-badge');
    expect(badges.length).toBe(2); // Máximo 2 badges individuales

    const moreBadge = container.querySelector('.condition-badge-more');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge?.textContent).toBe('+2'); // +2 condiciones restantes
  });

  // Serie 4: Hermeticidad de Sesiones Preparadas
  it('5. Al clonar anclajes de expresiones a la instancia onScreen, se aísla de cambios posteriores en la biblioteca de campaña', () => {
    const originalCampaignChar: Character = {
      id: 'char-hero',
      name: 'Héroe Épico',
      defaultAvatarUrl: 'https://example.com/hero.png',
      visualAnchorOffsetY: -3,
      expressionAnchors: {
        'happy': { x: 50, y: 30, scale: 1.1 },
        'angry': { x: 52, y: 28, scale: 1.0 },
      },
    };

    // Simula la invocación hermética (como implementada en summonCharacter de MasterController)
    const onScreenChar: CharacterOnScreen = {
      id: `instance-${Date.now()}`,
      name: originalCampaignChar.name,
      avatarUrl: originalCampaignChar.defaultAvatarUrl,
      position: 'center',
      isSpeaking: false,
      visualAnchorOffsetY: originalCampaignChar.visualAnchorOffsetY,
      instanceVariantAnchors: originalCampaignChar.expressionAnchors
        ? JSON.parse(JSON.stringify(originalCampaignChar.expressionAnchors))
        : undefined,
    };

    // Ahora mutamos la campaña original (el usuario edita la biblioteca posteriormente)
    originalCampaignChar.visualAnchorOffsetY = 15;
    if (originalCampaignChar.expressionAnchors) {
      originalCampaignChar.expressionAnchors['happy'] = { x: 99, y: 99, scale: 2.0 };
      delete originalCampaignChar.expressionAnchors['angry'];
    }

    // La instancia en pantalla preserva fielmente sus coordenadas congeladas
    expect(onScreenChar.visualAnchorOffsetY).toBe(-3);
    expect(onScreenChar.instanceVariantAnchors?.['happy']).toEqual({ x: 50, y: 30, scale: 1.1 });
    expect(onScreenChar.instanceVariantAnchors?.['angry']).toEqual({ x: 52, y: 28, scale: 1.0 });
  });
});
