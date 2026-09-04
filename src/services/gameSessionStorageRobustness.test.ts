import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  createGameSession,
  getGameSession,
  getSessionsByCampaign,
  trashGameSession,
  restoreGameSessionFromTrash,
  getTrashedSessions,
  emptyTrash,
  createSessionCheckpoint,
  getSessionCheckpoints,
  restoreCheckpointAsNewSession,
  scanSessionAssetDependencies,
  downloadExternalAssetsForSession,
  packSessionForExport,
  importSessionPackageWithRemap,
  duplicateGameSession,
  getAllSessions,
  getAllSessionTemplates,
  saveSessionAsTemplate,
  createSessionFromTemplate,
  prepareNextGameSession,
  createSessionForNewGroup,
  saveSceneAsCompositionPreset,
  instantiateScenePresetIntoSession,
  scanPresetDependencies,
  checkSessionReadiness,
  detectImportVersionConflict,
  updateSessionFromTemplate,
  saveSessionInitialBaseline,
  getTemplateUpdateDiff,
  applyGranularTemplateUpdate,
  migrateLegacySession,
  calculateStorageAudit,
  purgeOrphanAssets,
  importSessionAsAuditCopy,
  registerImmutableAsset,
} from '../db';
import { sessionReducer, initialSessionState } from '../domain/session/sessionReducer';
import type {
  Campaign,
  GameSession,
  DisplayState,
} from '../types';
import { gameSessionService } from './gameSessionService';

describe('Robust Storage & Session Lifecycle Suite', () => {
  const testCampaignId = 'test-camp-robust-1';

  beforeEach(async () => {
    await db.sessions.clear();
    await db.checkpoints.clear();
    await db.assets.clear();
    await db.campaigns.clear();

    const mockCampaign: Campaign = {
      id: testCampaignId,
      title: 'Campaña de Prueba',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [
        {
          id: 'sc-1',
          name: 'Cueva de los Lamentos',
          backgroundUrl: 'data:image/png;base64,cueva_original',
          ambientAudioUrl: 'data:audio/mp3;base64,audio_cueva',
          variants: [
            { id: 'var-1', name: 'Noche', backgroundUrl: 'data:image/png;base64,cueva_noche' },
          ],
        },
      ],
      characters: [
        {
          id: 'char-1',
          name: 'Valeros',
          roleOrTitle: 'Guerrero',
          defaultAvatarUrl: 'data:image/png;base64,valeros_avatar',
          expressions: { angry: 'data:image/png;base64,valeros_angry' },
        },
      ],
    };
    await db.campaigns.put(mockCampaign);
  });

  it('1. Independencia Sesión ↔ Campaña: Los cambios posteriores en la campaña no alteran el snapshot congelado', async () => {
    // 1. Crear sesión
    const session = await createGameSession(testCampaignId, 'Sesión 1 - El Despertar');
    expect(session.frozenScenes).toBeDefined();
    expect(session.frozenScenes?.length).toBe(1);
    expect(session.frozenScenes?.[0].name).toBe('Cueva de los Lamentos');
    expect(session.frozenCharacters?.length).toBe(1);

    // 2. Modificar la campaña (cambiar nombre de la escena y eliminar personaje)
    const camp = (await db.campaigns.get(testCampaignId))!;
    camp.scenes[0].name = 'Cueva Renombrada Radicalmente';
    camp.scenes[0].backgroundUrl = 'data:image/png;base64,fondo_completamente_nuevo';
    camp.characters = []; // Borrar personajes
    await db.campaigns.put(camp);

    // 3. Verificar que la sesión conserva su versión congelada
    const reloadedSession = (await getGameSession(session.id))!;
    expect(reloadedSession.frozenScenes?.[0].name).toBe('Cueva de los Lamentos');
    expect(reloadedSession.frozenScenes?.[0].backgroundUrl).toBe('data:image/png;base64,cueva_original');
    expect(reloadedSession.frozenCharacters?.length).toBe(1);
    expect(reloadedSession.frozenCharacters?.[0].name).toBe('Valeros');
  });

  it('2. Escáner de Dependencias: Detecta exhaustivamente todos los recursos visuales y auditivos', () => {
    const mockState: any = {
      currentSceneId: 'sc-1',
      sceneName: 'Cueva',
      backgroundUrl: 'https://example.com/cueva.jpg',
      ambientAudioUrl: 'https://example.com/viento.mp3',
      ambientPlaying: true,
      ambientVolume: 0.8,
      weather: 'none',
      weatherIntensity: 0,
      lighting: 'normal',
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      locationBanner: { text: 'Cueva', visible: true },
      characters: [
        {
          id: 'inst-1',
          name: 'Valeros',
          avatarUrl: 'https://example.com/valeros.png',
          expressions: { combat: 'https://example.com/valeros_combat.png' },
          visualStates: [{ id: 'vs-1', name: 'Herido', assetUrl: 'https://example.com/valeros_wounded.png' }],
          position: 'center',
          normalizedX: 50,
          normalizedY: 50,
          scale: 1,
          zIndex: 1,
          visibleToPlayers: true,
          statusBadges: [],
        },
      ],
      props: [
        {
          id: 'prop-1',
          name: 'Puerta Rúnica',
          customUrl: 'https://example.com/door.png',
          x: 10,
          y: 20,
          scale: 1,
          zIndex: 1,
          visible: true,
        },
      ],
      handoutState: {
        id: 'h-1',
        title: 'Mapa Antiguo',
        imageUrl: 'https://example.com/mapa.png',
        pages: [{ id: 'p-1', pageNumber: 1, imageUrl: 'https://example.com/mapa_pag2.png' }],
      },
      lastSfx: {
        id: 'sfx-1',
        type: 'gong',
        audioUrl: 'https://example.com/gong.mp3',
        timestamp: Date.now(),
      },
      cinematicDialogue: {
        id: 'cd-1',
        speakerName: 'Chamán',
        text: '¡Alto ahí!',
        avatarUrl: 'https://example.com/chaman.png',
        style: 'speech',
        visible: true,
      },
    };

    const mockSession: GameSession = {
      id: 'gs-dep-test',
      campaignId: testCampaignId,
      name: 'Sesión Dependencias',
      status: 'preparing',
      schemaVersion: 1,
      planNotes: '',
      stagedState: mockState,
      liveState: null,
      revision: 1,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const deps = scanSessionAssetDependencies(mockSession);
    const urls = deps.map((d) => d.url);

    expect(urls).toContain('https://example.com/cueva.jpg');
    expect(urls).toContain('https://example.com/viento.mp3');
    expect(urls).toContain('https://example.com/valeros.png');
    expect(urls).toContain('https://example.com/valeros_combat.png');
    expect(urls).toContain('https://example.com/valeros_wounded.png');
    expect(urls).toContain('https://example.com/door.png');
    expect(urls).toContain('https://example.com/mapa.png');
    expect(urls).toContain('https://example.com/mapa_pag2.png');
    expect(urls).toContain('https://example.com/gong.mp3');
    expect(urls).toContain('https://example.com/chaman.png');
    expect(deps.length).toBe(10);
  });

  it('3. Pre-flight Downloader: Distingue paquete completo offline de exportación incompleta', async () => {
    // Escaneo con un asset local y una URL externa inaccesible
    const deps = [
      { url: 'data:image/png;base64,local_data', context: 'Fondo Local', type: 'image' as const },
      { url: 'https://invalid-non-existent-domain-xyz123.com/broken.png', context: 'Fondo Roto', type: 'image' as const },
    ];

    const report = await downloadExternalAssetsForSession(deps);
    expect(report.totalAssets).toBe(2);
    expect(report.readyLocalCount).toBe(1);
    expect(report.missing.length).toBe(1);
    expect(report.missing[0].context).toBe('Fondo Roto');
    expect(report.canExportOfflineComplete).toBe(false);
  }, 15000);

  it('4. Checkpoints vinculados a Sesión y Restauración Segura como Copia', async () => {
    const session = await createGameSession(testCampaignId, 'Sesión Checkpoint');
    const mockState: any = {
      currentSceneId: 'sc-1',
      sceneName: 'Cueva',
      backgroundUrl: 'data:image/png;base64,cueva',
      ambientAudioUrl: '',
      ambientPlaying: false,
      ambientVolume: 1,
      weather: 'none',
      weatherIntensity: 0,
      lighting: 'normal',
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      locationBanner: { text: 'Cueva', visible: true },
      characters: [],
    };

    // Crear checkpoint vinculado a la sesión
    const cp = await createSessionCheckpoint(session.id, testCampaignId, 'Antes del Jefe', mockState);
    expect(cp.sessionId).toBe(session.id);

    const checkpoints = await getSessionCheckpoints(session.id);
    expect(checkpoints.length).toBe(1);
    expect(checkpoints[0].name).toBe('Antes del Jefe');

    // Restaurar como nueva preparación por defecto (sin pisar la original)
    const restored = await restoreCheckpointAsNewSession(cp.id, 'Copia Restaurada de Seguridad');
    expect(restored.id).not.toBe(session.id);
    expect(restored.name).toBe('Copia Restaurada de Seguridad');
    expect(restored.stagedState?.sceneName).toBe('Cueva');

    // La sesión original permanece inmutable
    const originalStillExists = await getGameSession(session.id);
    expect(originalStillExists).toBeDefined();
  });

  it('5. Papelera de Reciclaje (Soft-Delete): Oculta, lista, restaura y vacía definitivamente', async () => {
    const s1 = await createGameSession(testCampaignId, 'Sesión Conservar');
    const s2 = await createGameSession(testCampaignId, 'Sesión a la Papelera');

    // Inicialmente ambas están activas
    let activeList = await getSessionsByCampaign(testCampaignId, false);
    expect(activeList.map((s) => s.id)).toContain(s2.id);

    // Enviar s2 a la papelera
    await trashGameSession(s2.id);

    // Ya no figura en la lista activa
    activeList = await getSessionsByCampaign(testCampaignId, false);
    expect(activeList.map((s) => s.id)).not.toContain(s2.id);
    expect(activeList.map((s) => s.id)).toContain(s1.id);

    // Figura en la papelera
    let trashed = await getTrashedSessions(testCampaignId);
    expect(trashed.length).toBe(1);
    expect(trashed[0].id).toBe(s2.id);

    // Restaurar desde la papelera
    await restoreGameSessionFromTrash(s2.id);
    activeList = await getSessionsByCampaign(testCampaignId, false);
    expect(activeList.map((s) => s.id)).toContain(s2.id);

    // Volver a enviar a papelera y vaciar definitivamente
    await trashGameSession(s2.id);
    const emptiedCount = await emptyTrash(testCampaignId);
    expect(emptiedCount).toBe(1);

    trashed = await getTrashedSessions(testCampaignId);
    expect(trashed.length).toBe(0);
    const s2Deleted = await getGameSession(s2.id);
    expect(s2Deleted).toBeUndefined();
  });

  it('6. Duplicación con conservación selectiva de daño en NPCs', async () => {
    const session = await createGameSession(testCampaignId, 'Sesión Combate');
    const stateWithCombat: any = {
      currentSceneId: 'sc-1',
      sceneName: 'Cueva',
      backgroundUrl: '',
      ambientAudioUrl: '',
      ambientPlaying: false,
      ambientVolume: 1,
      weather: 'none',
      weatherIntensity: 0,
      lighting: 'normal',
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      locationBanner: { text: '', visible: false },
      characters: [],
      combatState: {
        isActive: true,
        round: 3,
        currentTurnIndex: 1,
        combatants: [
          {
            id: 'c-hero',
            characterId: 'char-1',
            name: 'Valeros',
            avatarUrl: '',
            initiative: 18,
            currentHp: 20,
            maxHp: 40,
            isMonster: false,
            showHpToPlayers: true,
            conditions: [],
            activeConditions: ['envenenado' as any],
          },
          {
            id: 'c-goblin',
            characterId: 'gob-1',
            name: 'Jefe Trasgo',
            avatarUrl: '',
            initiative: 12,
            currentHp: 8, // Dañado a 8/30
            maxHp: 30,
            isMonster: true,
            showHpToPlayers: false,
            conditions: [],
            activeConditions: ['aturdido' as any],
          },
        ],
      } as any,
    };

    await db.sessions.update(session.id, { stagedState: stateWithCombat });

    // Duplicar con restoreNpcHp = false (conserva daño en monstruos)
    const duplicate = await duplicateGameSession(session.id, {
      excludeCombatProgress: true,
      excludeConditions: true,
      restoreNpcHp: false,
      newName: 'Encuentro Continuado',
    });

    const combat = duplicate.stagedState?.combatState;
    expect(combat?.isActive).toBe(false);
    expect(combat?.round).toBe(0);

    const hero = combat?.combatants.find((c) => c.id === 'c-hero');
    const goblin = combat?.combatants.find((c) => c.id === 'c-goblin');

    // PJ se restaura a maxHp
    expect(hero?.currentHp).toBe(40);
    expect(hero?.activeConditions).toEqual([]);

    // NPC conserva su daño infligido (8 HP en lugar de restaurarse a 30)
    expect(goblin?.currentHp).toBe(8);
    expect(goblin?.activeConditions).toEqual([]);
  });

  it('7. Importación Segura con Remapeo: Crea copia independiente sin colisiones', async () => {
    const session = await createGameSession(testCampaignId, 'Sesión Exportable');
    await db.sessions.update(session.id, {
      stagedState: {
        currentSceneId: 'sc-1',
        sceneName: 'Cueva',
        backgroundUrl: 'data:image/png;base64,cueva_asset',
        ambientAudioUrl: '',
        ambientPlaying: false,
        ambientVolume: 1,
        weather: 'none',
        weatherIntensity: 0,
        lighting: 'normal',
        isBlackout: false,
        shakeTrigger: 0,
        lightningTrigger: 0,
        locationBanner: { text: '', visible: false },
        characters: [],
      } as any,
    });

    const pkg = await packSessionForExport(session.id);
    expect(pkg.session.id).toBe(session.id);

    // Importar como copia independiente
    const imported = await importSessionPackageWithRemap(pkg, true);
    expect(imported.session.id).not.toBe(session.id);
    expect(imported.session.name).toContain('(Copia Importada)');

    // Verificar que ambas existen en la base sin conflicto
    const original = await getGameSession(session.id);
    const copy = await getGameSession(imported.session.id);
    expect(original).toBeDefined();
    expect(copy).toBeDefined();
    expect(original?.id).not.toBe(copy?.id);
  });

  it('8. Prueba Final E2E: Preparar -> Cerrar y Recuperar -> Exportar -> Importar sin internet -> Reutilizar sin publicar', async () => {
    // 1. Preparar una sesión con borrador rico
    const session = await createGameSession(testCampaignId, 'Sesión Maestra');
    const complexDraft: any = {
      currentSceneId: 'sc-1',
      sceneName: 'Cueva de los Lamentos',
      backgroundUrl: 'data:image/png;base64,fondo_inmutable',
      ambientAudioUrl: 'data:audio/mp3;base64,audio_inmutable',
      ambientPlaying: false,
      ambientVolume: 0.8,
      weather: 'rain',
      weatherIntensity: 0.5,
      lighting: 'dim',
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      locationBanner: { text: 'Cueva Rúnica', visible: true },
      characters: [
        {
          id: 'char-inst-1',
          name: 'Valeros',
          avatarUrl: 'data:image/png;base64,avatar_valeros',
          position: 'center',
          normalizedX: 50,
          normalizedY: 50,
          scale: 1,
          zIndex: 1,
          visibleToPlayers: true,
          statusBadges: [],
        },
      ],
      lights: [{ id: 'light-1', name: 'Antorcha', x: 25, y: 30, radius: 100, intensity: 0.8, color: '#ffaa00' }],
    };
    await db.sessions.update(session.id, { stagedState: complexDraft, liveState: null });

    // 2. Simular cerrar y recuperar
    // Se recarga directamente de la base de datos (como al reiniciar la aplicación)
    const recoveredSession = (await getGameSession(session.id))!;
    expect(recoveredSession).toBeDefined();
    expect(recoveredSession.stagedState?.sceneName).toBe('Cueva de los Lamentos');
    expect(recoveredSession.stagedState?.lights?.length).toBe(1);
    expect(recoveredSession.liveState).toBeNull(); // NADA publicado a la Mesa

    // 3. Exportar paquete
    const pkg = await packSessionForExport(session.id, true);
    expect(pkg.isCompleteOfflinePackage).toBe(true);
    expect(pkg.assets.length).toBeGreaterThan(0);

    // 4. Simular segundo dispositivo sin internet (nueva base de datos limpia)
    await db.sessions.clear();
    await db.assets.clear();

    // Importar el paquete en el dispositivo nuevo
    const importResult = await importSessionPackageWithRemap(pkg, true);
    expect(importResult.session).toBeDefined();
    expect(importResult.session.id).not.toBe(session.id); // ID nuevo

    // 5. Reutilizarla sin publicar automáticamente a la Mesa
    const importedSession = (await getGameSession(importResult.session.id))!;
    expect(importedSession.liveState).toBeNull(); // Regla sagrada: liveState permanece null hasta acción explícita
    expect(importedSession.stagedState?.sceneName).toBe('Cueva de los Lamentos');
    expect(importedSession.stagedState?.characters.length).toBe(1);
    expect(importedSession.stagedState?.lights?.[0].name).toBe('Antorcha');

    // Modificar la preparación en el segundo dispositivo
    importedSession.stagedState!.sceneName = 'Cueva Modificada en Dispositivo 2';
    await db.sessions.put(importedSession);

    // Comprobar que la preparación modificada mantiene su estado seguro
    const updated = (await getGameSession(importedSession.id))!;
    expect(updated.stagedState?.sceneName).toBe('Cueva Modificada en Dispositivo 2');
    expect(updated.liveState).toBeNull(); // Sigue sin publicarse automáticamente
  });

  it('9. Concurrencia al cambiar de sesión durante guardado en borrador (debounce): Cero fuga de datos', async () => {
    const sA = await createGameSession(testCampaignId, 'Sesión A');
    const sB = await createGameSession(testCampaignId, 'Sesión B');

    // Inicializar servicio en sesión A
    await gameSessionService.switchSession(sA.id);
    expect(gameSessionService.getCurrentSessionId()).toBe(sA.id);

    // Disparar guardado en borrador con debounce en sesión A
    const draftA: any = {
      sceneName: 'Escena Exclusiva de A',
      backgroundUrl: '',
      characters: [],
      weather: 'none',
      weatherIntensity: 0,
      lighting: 'normal',
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      ambientAudioUrl: '',
      ambientPlaying: false,
      ambientVolume: 1,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      locationBanner: { text: '', visible: false },
    };
    gameSessionService.saveDraftDebounced(draftA);
    expect(gameSessionService.getDraftSaveState()).toBe('saving');

    // Inmediatamente (sin esperar el debounce de 400ms), cambiar a sesión B
    const switchedSession = await gameSessionService.switchSession(sB.id);
    expect(switchedSession.id).toBe(sB.id);
    expect(gameSessionService.getCurrentSessionId()).toBe(sB.id);

    // Verificar en la base de datos que:
    // 1. El borrador de A se guardó efectivamente en Sesión A
    const freshA = (await getGameSession(sA.id))!;
    expect(freshA.stagedState?.sceneName).toBe('Escena Exclusiva de A');

    // 2. Sesión B NO recibió nada del borrador de A (cero contaminación cruzada)
    const freshB = (await getGameSession(sB.id))!;
    expect(freshB.stagedState).toBeNull();
  });

  it('10. Exportación completa con conversaciones y handouts: Conserva referencias offline', async () => {
    // Agregar conversación y handout a la campaña
    const camp = (await db.campaigns.get(testCampaignId))!;
    camp.savedConversations = [
      {
        id: 'conv-1',
        title: 'Pacto con el Nigromante',
        sceneId: 'sc-1',
        createdAt: Date.now(),
        lines: [
          {
            id: 'line-1',
            speakerName: 'Nigromante',
            text: '¿Aceptáis el trato?',
            style: 'speech',
            choices: [
              { id: 'ch-1', label: 'Aceptar trato', targetLineId: 'line-2' },
              { id: 'ch-2', label: 'Rechazar', targetLineId: 'line-3' },
            ],
          },
        ],
      },
    ];
    camp.savedHandouts = [
      {
        id: 'ho-1',
        title: 'Carta Secreta',
        imageUrl: 'data:image/png;base64,carta_secreta',
        isFullyRevealed: false,
      },
    ];
    await db.campaigns.put(camp);

    const session = await createGameSession(testCampaignId, 'Sesión con Diálogos');
    const pkg = await packSessionForExport(session.id, true);

    expect(pkg.campaignSnippet.savedConversations?.length).toBe(1);
    expect(pkg.campaignSnippet.savedConversations?.[0].title).toBe('Pacto con el Nigromante');
    expect(pkg.campaignSnippet.savedHandouts?.length).toBe(1);
    expect(pkg.session.lastExportIsComplete).toBe(true);

    // Simular importación en una campaña distinta
    const targetCampaignId = 'camp-dialog-import';
    pkg.session.campaignId = targetCampaignId;
    pkg.campaignSnippet.id = targetCampaignId;

    const imported = await importSessionPackageWithRemap(pkg, true);
    expect(imported.session).toBeDefined();

    const importedCampaign = (await db.campaigns.get(targetCampaignId))!;
    expect(importedCampaign.savedConversations?.length).toBe(1);
    expect(importedCampaign.savedConversations?.[0].title).toBe('Pacto con el Nigromante');
    expect(importedCampaign.savedHandouts?.length).toBe(1);
  });

  it('11. Ciclo de vida y claridad de etiquetas de respaldo: Solo local -> Sin respaldar -> Respaldado', async () => {
    const session = await createGameSession(testCampaignId, 'Sesión Badges');

    // 1. Recién creada: nunca exportada -> Solo local
    expect(gameSessionService.getBackupStatus(session)).toBe('never_exported');

    // 2. Se exporta paquete
    await packSessionForExport(session.id, true);
    const exportedSession = (await getGameSession(session.id))!;
    expect(exportedSession.lastExportedAt).toBeDefined();
    expect(exportedSession.lastExportIsComplete).toBe(true);
    expect(gameSessionService.getBackupStatus(exportedSession)).toBe('synced');

    // 3. Se efectúa un cambio posterior en la preparación -> Sin respaldar
    await new Promise((resolve) => setTimeout(resolve, 10)); // garantizar timestamp mayor
    await db.sessions.update(session.id, {
      stagedState: { sceneName: 'Cambio posterior' } as any,
      updatedAt: Date.now() + 50,
    });
    const modifiedSession = (await getGameSession(session.id))!;
    expect(gameSessionService.getBackupStatus(modifiedSession)).toBe('dirty');
  });

  it('12. Biblioteca Unificada: Consulta entre múltiples campañas y reutilización de plantilla independiente', async () => {
    // 1. Crear Campaña B
    const campBId = 'camp-b-unified';
    await db.campaigns.put({
      id: campBId,
      title: 'Campaña de las Montañas',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [{ id: 'sc-b1', name: 'Cumbre Helada', backgroundUrl: 'data:image/png;base64,ice' }],
      characters: [],
    });

    // 2. Crear sesión en Campaña B y guardarla como plantilla
    const sessionB = await createGameSession(campBId, 'Sesión de Montaña');
    await db.sessions.update(sessionB.id, {
      stagedState: {
        sceneName: 'Cumbre Helada',
        backgroundUrl: 'data:image/png;base64,ice',
        weather: 'snow',
        lighting: 'normal',
        locationBanner: { text: 'Paso Nevado', visible: true },
        characters: [],
      } as any,
    });

    const templateB = await saveSessionAsTemplate(sessionB.id, 'Plantilla de la Cumbre', 'Plantilla de montaña');
    expect(templateB.campaignId).toBe(campBId);

    // 3. Crear sesiones con etiquetas en Campaña A
    const sessionA = await createGameSession(testCampaignId, 'Sesión Bosque Misterioso');
    await db.sessions.update(sessionA.id, {
      tags: ['bosque', 'elfos'],
      planNotes: 'Encuentro con druidas en el claro',
    });

    // 4. Probar consulta unificada (getAllSessions y getAllSessionTemplates)
    const allSessions = await getAllSessions(false);
    expect(allSessions.length).toBeGreaterThanOrEqual(2);
    expect(allSessions.some((s) => s.campaignId === testCampaignId)).toBe(true);
    expect(allSessions.some((s) => s.campaignId === campBId)).toBe(true);

    const allTemplates = await getAllSessionTemplates();
    expect(allTemplates.some((t) => t.id === templateB.id)).toBe(true);

    // 5. Instanciar la plantilla de Campaña B dentro de Campaña A como copia independiente
    const sessionFromTemplate = await createSessionFromTemplate(templateB.id, 'Paso Nevado en Campaña A');
    // Asignar explícitamente a Campaña A
    sessionFromTemplate.campaignId = testCampaignId;
    await db.sessions.put(sessionFromTemplate);

    const reloaded = (await getGameSession(sessionFromTemplate.id))!;
    expect(reloaded.campaignId).toBe(testCampaignId); // Asignada a Campaña A
    expect(reloaded.stagedState?.sceneName).toBe('Cumbre Helada');
    expect(reloaded.id).not.toBe(sessionB.id); // ID completamente nuevo
    expect(templateB.campaignId).toBe(campBId); // La plantilla original en Campaña B no se alteró
  });

  it('13. Aislamiento Total al Preparar: Conversaciones y Handouts congelados son inmunes a cambios posteriores en la campaña', async () => {
    // 1. Crear campaña con una conversación y un documento
    const campId = 'camp-dialogue-freeze';
    const conversationId = 'conv-taberna-misterio';
    await db.campaigns.put({
      id: campId,
      title: 'Campaña con Diálogos',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [],
      characters: [],
      savedConversations: [
        {
          id: conversationId,
          title: 'El Secreto del Tabernero',
          createdAt: Date.now(),
          lines: [{ id: 'l1', text: 'Bienvenido forastero', speakerName: 'Tabernero' }],
        },
      ],
      savedHandouts: [
        {
          id: 'doc-mapa',
          title: 'Mapa Rasgado',
          imageUrl: '',
        },
      ],
    });

    // 2. Crear sesión en esta campaña: debe congelar la conversación y el handout inmediatamente
    const session = await createGameSession(campId, 'Sesión con Misterio');
    expect(session.frozenConversations).toBeDefined();
    expect(session.frozenConversations?.length).toBe(1);
    expect(session.frozenConversations?.[0].title).toBe('El Secreto del Tabernero');
    expect(session.frozenHandouts?.length).toBe(1);

    // 3. Modificar y luego borrar la conversación de la campaña
    await db.campaigns.update(campId, {
      savedConversations: [
        {
          id: conversationId,
          title: 'CONVERSACIÓN MODIFICADA EN CAMPAÑA',
          createdAt: Date.now(),
          lines: [{ id: 'l1', text: 'Texto radicalmente alterado' }],
        },
      ],
      savedHandouts: [], // Handout borrado de la campaña
    });

    // 4. Comprobar que la preparación conserva íntegramente sus versiones originales congeladas
    const loadedSession = (await getGameSession(session.id))!;
    expect(loadedSession.frozenConversations?.[0].title).toBe('El Secreto del Tabernero');
    expect(loadedSession.frozenConversations?.[0].lines[0].text).toBe('Bienvenido forastero');
    expect(loadedSession.frozenHandouts?.[0].title).toBe('Mapa Rasgado');

    // 5. El helper de lectura activa del servicio prioriza la copia congelada de la sesión
    gameSessionService['currentSession'] = loadedSession;
    const activeConvs = gameSessionService.getActiveConversations([]);
    expect(activeConvs[0].title).toBe('El Secreto del Tabernero');
  });

  it('14. Preparar la Siguiente Sesión: Conserva mundo, consecuencias y daño de NPCs para el mismo grupo, iniciando con Mesa limpia', async () => {
    // 1. Crear sesión de combate en curso
    const session1 = await createGameSession(testCampaignId, 'Sesión 1 - El Asalto');
    session1.groupId = 'grp-heroes-del-valle';
    session1.groupName = 'Héroes del Valle';
    session1.sessionNumber = 1;
    session1.liveState = {
      sceneName: 'Puente Colgante',
      backgroundUrl: 'data:image/png;base64,bridge',
      characters: [],
      combatState: {
        isActive: true,
        round: 3,
        currentTurnIndex: 1,
        isTimerRunning: true,
        turnTimerEndsAt: Date.now() + 60000,
        combatants: [
          {
            id: 'npc-ogro',
            name: 'Ogro Furioso',
            avatarUrl: '',
            maxHp: 50,
            currentHp: 18, // 32 puntos de daño infligido
            isMonster: true,
            showHpToPlayers: true,
            initiativeType: 'fixed',
            conditions: ['envenenado' as any],
          },
        ],
      },
    } as any;
    await db.sessions.put(session1);

    // 2. Preparar siguiente sesión conservando daño y condiciones
    const session2 = await prepareNextGameSession(session1.id, {
      preserveCombatProgress: false,
      preserveNpcHpLoss: true,
      preserveConditions: true,
    });

    // Verificaciones:
    expect(session2.id).not.toBe(session1.id);
    expect(session2.sessionNumber).toBe(2);
    expect(session2.groupId).toBe('grp-heroes-del-valle');
    expect(session2.groupName).toBe('Héroes del Valle');
    expect(session2.liveState).toBeNull(); // Mesa en blanco para preparar
    expect(session2.status).toBe('preparing');

    // El borrador conserva el daño del ogro (18 HP) y la condición, pero resetea temporizadores activos
    const ogre = session2.stagedState?.combatState?.combatants[0];
    expect(ogre?.currentHp).toBe(18);
    expect(ogre?.conditions).toContain('envenenado');
    expect(session2.stagedState?.combatState?.isTimerRunning).toBe(false);
    expect(session2.stagedState?.combatState?.turnTimerEndsAt).toBeNull();

    // La sesión 1 anterior permanece intacta
    const reloaded1 = (await getGameSession(session1.id))!;
    expect(reloaded1.liveState).not.toBeNull();
  });

  it('15. Jugar con Otro Grupo: Bifurca una línea de partida independiente, reiniciando revelaciones a siluetas sin tocar la escenografía', async () => {
    // 1. Crear sesión de Grupo A con personajes revelados e identidades descubiertas
    const sessionA = await createGameSession(testCampaignId, 'Aventura Original');
    sessionA.groupId = 'grp-martes';
    sessionA.groupName = 'Grupo de los Martes';
    sessionA.stagedState = {
      sceneName: 'Santuario Olvidado',
      backgroundUrl: 'data:image/png;base64,shrine',
      props: [{ id: 'door-secret', name: 'Puerta Secreta', assetUrl: '', normalizedX: 20, normalizedY: 50, scale: 1, zIndex: 1 }],
      characters: [
        {
          instanceId: 'char-misterioso',
          name: 'Lord Malakar',
          avatarUrl: 'data:image/png;base64,lord',
          maxHp: 40,
          currentHp: 12,
          isMonster: true,
          showHpToPlayers: true,
          revelation: {
            isAppearanceRevealed: true, // Ya fue revelado ante Grupo A
            isIdentityRevealed: true,
            publicAlias: 'Figura Encapuchada',
          },
        },
      ],
      combatState: { isActive: true, round: 2, currentTurnIndex: 0, combatants: [] } as any,
    } as any;
    await db.sessions.put(sessionA);

    // 2. Crear preparación para un nuevo grupo (Grupo B)
    const sessionB = await createSessionForNewGroup(sessionA.id, {
      targetGroupName: 'Grupo de los Viernes',
      resetRevelations: true,
      resetNpcHp: true,
      resetCombat: true,
    });

    // Verificaciones de aislamiento entre grupos:
    expect(sessionB.id).not.toBe(sessionA.id);
    expect(sessionB.groupId).not.toBe(sessionA.groupId); // Nuevo identificador de grupo
    expect(sessionB.groupName).toBe('Grupo de los Viernes');
    expect(sessionB.sessionNumber).toBe(1);
    expect(sessionB.liveState).toBeNull();

    // La escenografía y props se conservan intactos
    expect(sessionB.stagedState?.sceneName).toBe('Santuario Olvidado');
    expect(sessionB.stagedState?.props?.length).toBe(1);

    // Las revelaciones se reinician a silueta/alias público para proteger el misterio
    const npcB = sessionB.stagedState?.characters[0];
    expect(npcB?.revelation?.isAppearanceRevealed).toBe(false);
    expect(npcB?.revelation?.isIdentityRevealed).toBe(false);
    expect(npcB?.revelation?.publicAlias).toBe('Figura Encapuchada');
    expect(sessionB.stagedState?.combatState?.isActive).toBe(false); // Combate limpio

    // Grupo A original conserva sus revelaciones sin alteración
    const reloadedA = (await getGameSession(sessionA.id))!;
    expect(reloadedA.stagedState?.characters[0].revelation?.isIdentityRevealed).toBe(true);
  });

  it('16. Preset de Escena Completa: Guardado e inserción segura con remapeo de identificadores y diálogo vinculado', async () => {
    // 1. Crear DisplayState completo con música, luces, props, personajes y conversación
    const sceneState: DisplayState = {
      sceneName: 'Taberna del Jabalí Cantor',
      backgroundUrl: 'data:image/png;base64,tavern',
      ambientAudioUrl: 'data:audio/mp3;base64,music',
      ambientVolume: 0.7,
      characters: [
        {
          id: 'npc-bardo-1',
          characterId: 'char-bardo',
          name: 'Bardo Elian',
          avatarUrl: 'data:image/png;base64,bard',
          position: 'center-left',
          normalizedX: 40,
          normalizedY: 70,
          scale: 1,
          zIndex: 2,
          isSpeaking: false,
        },
      ],
      props: [
        { id: 'prop-mesa-1', name: 'Mesa de Roble', assetUrl: 'data:image/png;base64,table', normalizedX: 50, normalizedY: 80, scale: 1, zIndex: 1 },
      ],
      lights: [
        { id: 'light-antorcha-1', name: 'Antorcha', preset: 'torch', color: '#ffaa33', intensity: 1.2, radiusPct: 25, normalizedX: 30, normalizedY: 40, flicker: true, visible: true },
      ],
      emitters: [
        { id: 'emit-humo-1', type: 'smoke', x: 30, y: 40, width: 10, height: 10, density: 5, speed: 2, opacity: 0.4, zIndex: 3, enabled: true },
      ],
      interactions: [],
      lighting: 'torch_flicker',
      weather: 'none',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    };

    const conversationData = {
      id: 'conv-bardo-canto',
      title: 'Canción de la Leyenda Perdida',
      createdAt: Date.now(),
      lines: [{ id: 'l1', text: 'Escuchad la historia de los Reyes Antiguos...', speakerName: 'Bardo Elian' }],
    };

    // 2. Guardar como preset
    const preset = await saveSceneAsCompositionPreset(testCampaignId, sceneState, 'Preset Taberna Completa', {
      description: 'Taberna bulliciosa con música y bardo',
      tags: ['taberna', 'social'],
      linkedConversation: conversationData,
    });

    expect(preset.id).toBeDefined();
    expect(preset.lights?.length).toBe(1);
    expect(preset.ambientAudioUrl).toBe('data:audio/mp3;base64,music');
    expect(preset.linkedConversation?.title).toBe('Canción de la Leyenda Perdida');

    // 3. Instanciar en una sesión limpia
    const targetSession = await createGameSession(testCampaignId, 'Sesión Receptora');
    expect(targetSession.stagedState).toBeNull();

    const updatedSession = await instantiateScenePresetIntoSession(targetSession.id, preset.id, 'append_scene');

    // 4. Verificaciones de inserción segura:
    expect(updatedSession.stagedState).not.toBeNull();
    expect(updatedSession.stagedState?.sceneName).toBe('Preset Taberna Completa');
    expect(updatedSession.stagedState?.ambientAudioUrl).toBe('data:audio/mp3;base64,music');
    expect(updatedSession.liveState).toBeNull(); // NUNCA emite a la Mesa automáticamente

    // Remapeo de IDs de props y luces para evitar colisiones
    expect(updatedSession.stagedState?.props?.[0].id).not.toBe('prop-mesa-1');
    expect(updatedSession.stagedState?.lights?.[0].id).not.toBe('light-antorcha-1');

    // Conversación vinculada incorporada a frozenConversations
    expect(updatedSession.frozenConversations?.some((c) => c.id === 'conv-bardo-canto')).toBe(true);

    // Escena añadida a frozenScenes
    expect(updatedSession.frozenScenes?.some((sc) => sc.name === 'Preset Taberna Completa')).toBe(true);
  });

  it('17. Análisis de Dependencias de Escena Reutilizable: Distingue elementos incluidos, disponibles y faltantes con resolución de campaña', async () => {
    // 1. Crear campaña con personaje "Elian" y registrar un asset en db.assets
    const targetCampId = 'camp-target-dep-test';
    await db.campaigns.put({
      id: targetCampId,
      title: 'Campaña Destino',
      createdAt: Date.now(),
      scenes: [],
      characters: [
        {
          id: 'char-target-elian',
          name: 'Elian el Bardo',
          roleOrTitle: 'Músico',
          defaultAvatarUrl: 'data:image/png;base64,target-elian',
        },
      ],
      savedConversations: [
        {
          id: 'conv-target-secreto',
          title: 'El Secreto de la Taberna',
          createdAt: Date.now(),
          lines: [{ id: 'l1', text: 'Shhh...', speakerName: 'Elian' }],
        },
      ],
    });

    await db.assets.put({
      id: 'asset-stored-table',
      name: 'Mesa de Taberna',
      type: 'image',
      dataUrl: 'data:image/png;base64,stored-table',
      originUrl: 'https://example.com/assets/table.png',
      createdAt: Date.now(),
    });

    // 2. Crear preset con 1 asset incrustado, 1 asset en db.assets, 1 URL remota faltante, y personajes/diálogos
    const preset = await saveSceneAsCompositionPreset(targetCampId, {
      sceneName: 'Pieza Reutilizable',
      backgroundUrl: 'data:image/png;base64,inline-bg', // Incrustado (dataUrl)
      characters: [
        {
          id: 'preset-c1',
          characterId: 'char-target-elian', // Coincidencia exacta por ID
          name: 'Elian el Bardo',
          avatarUrl: 'data:image/png;base64,inline-bard',
          position: 'center-left',
          isSpeaking: false,
        },
        {
          id: 'preset-c2',
          characterId: 'char-desconocido',
          name: 'Guarda Misterioso',
          avatarUrl: 'https://external-art.com/guard.png', // Remoto no cacheado => missing
          position: 'right',
          isSpeaking: false,
        },
      ],
      props: [
        {
          id: 'p-table',
          name: 'Mesa',
          assetUrl: 'https://example.com/assets/table.png', // Presente en db.assets por originUrl
          normalizedX: 50,
          normalizedY: 50,
          scale: 1,
          zIndex: 1,
        },
      ],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    }, 'Preset Taberna Analizado', {
      linkedConversation: {
        id: 'conv-target-secreto', // Coincidencia por ID en campaña de destino
        title: 'El Secreto de la Taberna',
        createdAt: Date.now(),
        lines: [],
      },
    });

    // 3. Ejecutar escáner de dependencias
    const report = await scanPresetDependencies(preset, targetCampId);

    // Verificaciones
    expect(report.totalAssets).toBe(4);
    expect(report.includedCount).toBe(2); // backgroundUrl y avatar Elian
    expect(report.alreadyAvailableCount).toBe(1); // mesa encontrada en db.assets
    expect(report.missing.length).toBe(1); // guarda misterioso
    expect(report.isFullySelfContained).toBe(false);

    // Verificación de resoluciones de personajes
    expect(report.characterResolutions.length).toBe(2);
    expect(report.characterResolutions[0].matchType).toBe('exact_id');
    expect(report.characterResolutions[0].matchedCampaignCharacterId).toBe('char-target-elian');
    expect(report.characterResolutions[1].matchType).toBe('none');

    // Verificación de diálogo
    expect(report.conversationResolution?.matchType).toBe('exact_id');
  });

  it('18. Instanciación con Resolución de Conflictos: Reutilizar existentes vs Crear copia independiente', async () => {
    // 1. Crear sesión en campaña que ya tiene personaje 'Elian'
    const campId = 'camp-conflict-test';
    await db.campaigns.put({
      id: campId,
      title: 'Campaña Con Conflicto',
      createdAt: Date.now(),
      scenes: [],
      characters: [
        {
          id: 'char-camp-elian',
          name: 'Elian',
          roleOrTitle: 'Bardo de la corte',
          defaultAvatarUrl: 'data:image/png;base64,camp-elian',
        },
      ],
      savedConversations: [
        {
          id: 'conv-camp-pacto',
          title: 'El Pacto Secreto',
          createdAt: Date.now(),
          lines: [{ id: 'l1', text: 'Diálogo camp' }],
        },
      ],
    });

    const preset = await saveSceneAsCompositionPreset(campId, {
      sceneName: 'Escena para Resolución',
      backgroundUrl: 'data:image/png;base64,bg',
      characters: [
        {
          id: 'c1',
          characterId: 'char-other-id',
          name: 'Elian', // Coincide por nombre
          avatarUrl: 'data:image/png;base64,preset-elian',
          position: 'center-left',
          isSpeaking: false,
        },
      ],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    }, 'Preset Para Resolución', {
      linkedConversation: {
        id: 'conv-other-id',
        title: 'El Pacto Secreto', // Coincide por título
        createdAt: Date.now(),
        lines: [{ id: 'l2', text: 'Diálogo preset' }],
      },
    });

    // Caso A: Reutilizar personaje existente
    const sessionA = await createGameSession(campId, 'Sesión Reutilizando');
    const updatedA = await instantiateScenePresetIntoSession(sessionA.id, preset.id, {
      characterResolution: 'reuse_existing',
      conversationResolution: 'reuse_existing',
    });

    expect(updatedA.stagedState?.characters[0].characterId).toBe('char-camp-elian'); // Enlazado al existente
    expect(updatedA.frozenConversations?.length).toBe(1); // Reutiliza el existente sin duplicar en la sesión

    // Caso B: Crear copia independiente
    const sessionB = await createGameSession(campId, 'Sesión Copiando');
    const updatedB = await instantiateScenePresetIntoSession(sessionB.id, preset.id, {
      characterResolution: 'create_copy',
      conversationResolution: 'create_copy',
    });

    expect(updatedB.stagedState?.characters[0].characterId).toBe('char-other-id'); // Conserva ID propio
    expect(updatedB.frozenConversations?.length).toBe(2); // Conserva el original y añade copia independiente
    expect(updatedB.frozenConversations?.some((c) => c.title === 'El Pacto Secreto (Copia)')).toBe(true);
  });

  it('19. Actualización Diferencial desde Plantilla: Aplica mejoras sin perder progreso jugado y con checkpoint previo', async () => {
    // 1. Crear sesión de juego que ya acumuló 2 rondas de combate y daño
    const session = await createGameSession(testCampaignId, 'Aventura en Progreso');
    session.stagedState = {
      sceneName: 'Entrada a las Ruinas',
      backgroundUrl: 'data:image/png;base64,ruins',
      characters: [
        {
          id: 'char-jugado',
          name: 'Heroe Herido',
          avatarUrl: 'data:image/png;base64,hero',
          position: 'center-left',
          isSpeaking: false,
        },
      ],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: {
        isActive: true,
        round: 2,
        currentTurnIndex: 0,
        combatants: [{ id: 'hero-c', name: 'Heroe', currentHp: 14, maxHp: 30, avatarUrl: '', initiative: 12, showHpToPlayers: true, conditions: [], isMonster: false }],
      },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    session.frozenScenes = [
      { id: 'sc-old', name: 'Entrada a las Ruinas', backgroundUrl: 'data:image/png;base64,ruins' },
    ];
    await db.sessions.put(session);

    // 2. Crear plantilla con 1 escena adicional ("Cámara Oculta") y una conversación nueva
    const template = await saveSessionAsTemplate(session.id, 'Plantilla con Mejoras');
    template.frozenScenes = [
      { id: 'sc-old', name: 'Entrada a las Ruinas', backgroundUrl: 'data:image/png;base64,ruins' },
      { id: 'sc-new', name: 'Cámara Oculta', backgroundUrl: 'data:image/png;base64,hidden' },
    ];
    template.frozenConversations = [
      { id: 'conv-pista', title: 'Pista de la Esfinge', createdAt: Date.now(), lines: [] },
    ];
    await db.sessionTemplates.put(template);

    // 3. Sincronizar diferencialmente la sesión desde la plantilla
    const result = await updateSessionFromTemplate(session.id, template.id);

    // Verificaciones
    expect(result.checkpoint).toBeDefined(); // Se creó punto de control automático previo
    expect(result.checkpoint.sessionId).toBe(session.id);

    // Se incorporó la escena nueva sin duplicar la existente
    expect(result.session.frozenScenes?.length).toBe(2);
    expect(result.session.frozenScenes?.some((s) => s.name === 'Cámara Oculta')).toBe(true);

    // Se incorporó la conversación nueva
    expect(result.session.frozenConversations?.some((c) => c.title === 'Pista de la Esfinge')).toBe(true);

    // El combate jugado y daño acumulado NO se borraron
    expect(result.session.stagedState?.combatState.isActive).toBe(true);
    expect(result.session.stagedState?.combatState.combatants[0].currentHp).toBe(14);
  });

  it('20. Detección de Conflictos de Versión: Previene sobrescritura silenciosa en transporte PC ↔ móvil', () => {
    const localSession: GameSession = {
      id: 'sess-sync-1',
      campaignId: 'camp-1',
      name: 'Sesión Local',
      status: 'preparing',
      schemaVersion: 1,
      planNotes: '',
      stagedState: null,
      liveState: null,
      revision: 8,
      updatedAt: 1000000000000 + 50000, // Más reciente
      createdAt: 1000000000000,
    };

    const olderPkg: any = {
      session: {
        id: 'sess-sync-1',
        revision: 5,
        updatedAt: 1000000000000,
      },
      exportedAt: 1000000000000,
    };

    // Caso A: Copia local es más reciente => conflicto local_newer, sugerir duplicar
    const conflictA = detectImportVersionConflict(olderPkg, localSession);
    expect(conflictA.hasConflict).toBe(true);
    expect(conflictA.conflictType).toBe('local_newer');
    expect(conflictA.recommendation).toBe('duplicate');

    // Caso B: Archivo remoto es más reciente => remote_newer, sugerir overwrite
    const newerPkg: any = {
      session: {
        id: 'sess-sync-1',
        revision: 12,
        updatedAt: 1000000000000 + 100000,
      },
      exportedAt: 1000000000000 + 100000,
    };
    const conflictB = detectImportVersionConflict(newerPkg, localSession);
    expect(conflictB.hasConflict).toBe(true);
    expect(conflictB.conflictType).toBe('remote_newer');
    expect(conflictB.recommendation).toBe('overwrite');

    // Caso C: Nueva sesión que no existía localmente => sin conflicto
    const conflictC = detectImportVersionConflict(newerPkg, undefined);
    expect(conflictC.hasConflict).toBe(false);
    expect(conflictC.conflictType).toBe('none');
  });

  it('21. Chequeo Pre-Partida («Lista para Jugar»): Diagnóstico integral de escenas, archivos offline y referencias', async () => {
    // 1. Crear sesión 100% lista para jugar
    const readySession = await createGameSession(testCampaignId, 'Sesión Impecable');
    readySession.stagedState = {
      sceneName: 'Valle Soleado',
      backgroundUrl: 'data:image/png;base64,valley', // Offline
      characters: [
        {
          id: 'c1',
          name: 'Guerrero',
          avatarUrl: 'data:image/png;base64,warrior', // Avatar válido
          position: 'center-left',
          isSpeaking: false,
        },
      ],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    await db.sessions.put(readySession);

    const readiness1 = await checkSessionReadiness(readySession.id);
    expect(readiness1.isReady).toBe(true);
    expect(readiness1.canPlayOffline).toBe(true);
    expect(readiness1.score).toBe(100);
    expect(readiness1.checks.every((c) => c.status === 'pass')).toBe(true);

    // 2. Crear sesión incompleta (sin escena y con personaje sin avatar)
    const emptySession = await createGameSession(testCampaignId, 'Sesión Vacía');
    const readiness2 = await checkSessionReadiness(emptySession.id);
    expect(readiness2.isReady).toBe(false);
    expect(readiness2.canPlayOffline).toBe(false);
    expect(readiness2.checks.some((c) => c.id === 'scene_prepared' && c.status === 'fail')).toBe(true);
  });

  it('22. Jugar con Otro Grupo con Configuración Inicial Fiel: Preserva personajes conocidos, daño preparado y puertas cerradas', async () => {
    // 1. Preparar la aventura con la escena inicial
    const session = await createGameSession(testCampaignId, 'Aventura en la Taberna');
    const preparedState: DisplayState = {
      sceneName: 'Taberna del Jabalí Herido',
      backgroundUrl: 'data:image/png;base64,tavern',
      characters: [
        {
          id: 'char-innkeeper',
          name: 'Garrick el Tabernero',
          avatarUrl: 'data:image/png;base64,garrick',
          position: 'center-left',
          isSpeaking: false,
          revelation: {
            isAppearanceRevealed: true, // Inicialmente conocido
            isIdentityRevealed: true,   // Inicialmente conocido
          },
        },
        {
          id: 'char-villain',
          name: 'Encapuchado Misterioso',
          avatarUrl: 'data:image/png;base64,villain',
          position: 'right',
          isSpeaking: false,
          revelation: {
            isAppearanceRevealed: false, // Inicialmente misterioso
            isIdentityRevealed: false,
            publicAlias: 'Figura entre las sombras',
          },
        },
      ],
      props: [],
      interactions: [
        {
          id: 'door-cellar',
          targetInstanceId: 'door-prop',
          name: 'Puerta del Sótano',
          scope: 'scene',
          currentState: 'closed', // Inicialmente cerrada
          transitions: [],
        },
      ],
      combatState: {
        isActive: false,
        round: 0,
        currentTurnIndex: 0,
        combatants: [
          {
            id: 'npc-guard-wounded',
            name: 'Guardia Patrullero Herido',
            avatarUrl: 'data:image/png;base64,guard',
            currentHp: 12, // Inicialmente herido (12 de 25)
            maxHp: 25,
            initiative: 10,
            showHpToPlayers: true,
            conditions: [],
            isMonster: false,
          },
        ],
      },
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      shakeTrigger: 0,
      lightningTrigger: 0,
    };

    // Guardar borrador y fijar explícitamente como línea base inicial
    session.stagedState = preparedState;
    await db.sessions.put(session);
    const sessionWithBaseline = await saveSessionInitialBaseline(session.id, preparedState, 'Línea Base Preparada');

    // 2. Simular la partida del Grupo 1:
    // - El grupo descubre la identidad del villano (se revela)
    // - El guardia recibe 8 de daño en combate (pasa a 4 HP)
    // - Abren la puerta del sótano (pasa a 'open')
    // - Se anotan notas exclusivas del Grupo 1
    sessionWithBaseline.stagedState!.characters[1].revelation!.isAppearanceRevealed = true;
    sessionWithBaseline.stagedState!.characters[1].revelation!.isIdentityRevealed = true;
    sessionWithBaseline.stagedState!.combatState.combatants[0].currentHp = 4;
    sessionWithBaseline.stagedState!.interactions![0].currentState = 'open';
    sessionWithBaseline.planNotes = 'Grupo 1 decidió quemar el establo y huir hacia el norte.';
    sessionWithBaseline.liveState = JSON.parse(JSON.stringify(sessionWithBaseline.stagedState));
    await db.sessions.put(sessionWithBaseline);

    // 3. Crear sesión para un nuevo grupo usando la configuración inicial
    const newGroupSession = await createSessionForNewGroup(session.id, {
      targetGroupName: 'Grupo de los Jueves',
      newName: 'Aventura Taberna - Grupo Jueves',
      resetCombat: true,
      resetInteractions: true,
    });

    // 4. Verificaciones de fidelidad de la configuración inicial:
    expect(newGroupSession.groupId).not.toBe(session.groupId);
    expect(newGroupSession.liveState).toBeNull(); // NUNCA emite a la Mesa
    expect(newGroupSession.status).toBe('preparing');
    expect(newGroupSession.planNotes).toBe(''); // Excluye notas privadas del grupo 1

    const newState = newGroupSession.stagedState!;
    expect(newState).toBeDefined();

    // El tabernero sigue conocido
    const innkeeper = newState.characters.find((c) => c.id === 'char-innkeeper')!;
    expect(innkeeper.revelation?.isAppearanceRevealed).toBe(true);
    expect(innkeeper.revelation?.isIdentityRevealed).toBe(true);

    // El villano vuelve a ser misterioso (silueta)
    const villain = newState.characters.find((c) => c.id === 'char-villain')!;
    expect(villain.revelation?.isAppearanceRevealed).toBe(false);
    expect(villain.revelation?.isIdentityRevealed).toBe(false);

    // El guardia conserva su HP preparado intencionalmente (12 HP, no 4 ni 25)
    expect(newState.combatState.combatants[0].currentHp).toBe(12);

    // La puerta vuelve a estar cerrada
    expect(newState.interactions![0].currentState).toBe('closed');
  });

  it('23. Protección de Mesa Conectada: Cargar en Staging nunca modifica el liveState en pantalla ni emite por red', () => {
    // Estado inicial en la Mesa (pantalla proyectada a los jugadores)
    const tableLiveState: DisplayState = {
      sceneName: 'Pantalla de Bienvenida en Mesa',
      backgroundUrl: 'data:image/png;base64,welcome',
      characters: [],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: 'Bienvenidos', visible: true },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };

    let sessionState = {
      ...initialSessionState,
      liveState: tableLiveState,
      operationMode: 'live' as 'live' | 'staging',
    };

    // El DM carga una sesión en preparación (Staging)
    const preparedSessionStaged: DisplayState = {
      sceneName: 'Cueva de los Secretos (Borrador)',
      backgroundUrl: 'data:image/png;base64,secret-cave',
      characters: [{ id: 'boss', name: 'Jefe Secreto', avatarUrl: '', position: 'center-left', isSpeaking: false }],
      props: [],
      weather: 'none',
      lighting: 'torch_flicker',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };

    sessionState = sessionReducer(sessionState, {
      type: 'SET_STAGED_STATE_ONLY',
      payload: preparedSessionStaged,
    });

    // Verificación crítica: La pantalla de los jugadores (liveState) permanece 100% INTACTA
    expect(sessionState.liveState.sceneName).toBe('Pantalla de Bienvenida en Mesa');
    expect(sessionState.liveState.backgroundUrl).toBe('data:image/png;base64,welcome');
    expect(sessionState.liveState.characters.length).toBe(0);

    // El DM ahora tiene el borrador listo en modo preparación
    expect(sessionState.operationMode).toBe('staging');
    expect(sessionState.stagedState.sceneName).toBe('Cueva de los Secretos (Borrador)');
    expect(sessionState.stagedState.characters.length).toBe(1);
  });

  it('24. Flujo Completo de Preset de Escena en Interfaz: Guardar, escanear dependencias y reemplazar con checkpoint', async () => {
    // 1. Guardar preset desde una escena de taberna
    const campId = 'camp-preset-flow';
    await db.campaigns.put({
      id: campId,
      title: 'Campaña Preset Flow',
      createdAt: Date.now(),
      scenes: [],
      characters: [{ id: 'ch-guard', name: 'Guardia Real', defaultAvatarUrl: 'data:image/png;base64,guard', roleOrTitle: 'Guardia' }],
      savedConversations: [],
    });

    const tavernScene: DisplayState = {
      sceneName: 'Taberna El Dragón Durmiente',
      backgroundUrl: 'data:image/png;base64,tavern-bg',
      characters: [{ id: 'p1', characterId: 'ch-guard', name: 'Guardia Real', avatarUrl: 'data:image/png;base64,guard', position: 'center-left', isSpeaking: false }],
      props: [{ id: 'pr-1', name: 'Barrica', assetUrl: 'data:image/png;base64,barrel', normalizedX: 10, normalizedY: 20, scale: 1, zIndex: 1 }],
      lights: [{ id: 'l-1', name: 'Antorcha', preset: 'torch', color: '#ff8800', intensity: 1, radiusPct: 20, normalizedX: 50, normalizedY: 50, flicker: true, visible: true }],
      weather: 'none',
      lighting: 'torch_flicker',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: 'data:audio/mp3;base64,lute',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };

    const preset = await saveSceneAsCompositionPreset(campId, tavernScene, 'Preset Dragón Durmiente', {
      description: 'Taberna con guardia y música de laúd',
      tags: ['taberna', 'musica'],
    });

    expect(preset.id).toBeDefined();

    // 2. Escaneo de dependencias
    const depReport = await scanPresetDependencies(preset, campId);
    expect(depReport.isFullySelfContained).toBe(true);
    expect(depReport.characterResolutions[0].matchType).toBe('exact_id');

    // 3. Crear sesión destino con borrador previo
    const targetSession = await createGameSession(campId, 'Sesión Receptora Flow');
    targetSession.stagedState = {
      sceneName: 'Borrador Anterior',
      backgroundUrl: 'data:image/png;base64,old',
      characters: [],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    await db.sessions.put(targetSession);

    // 4. Instanciar en sesión reemplazando borrador con resolución
    const updated = await instantiateScenePresetIntoSession(targetSession.id, preset.id, {
      mode: 'replace_staged',
      characterResolution: 'reuse_existing',
    });

    expect(updated.stagedState?.sceneName).toBe('Preset Dragón Durmiente');
    expect(updated.stagedState?.ambientAudioUrl).toBe('data:audio/mp3;base64,lute');
    expect(updated.stagedState?.characters[0].characterId).toBe('ch-guard');
    expect(updated.liveState).toBeNull(); // NUNCA emite a la Mesa
  });

  it('25. (Pregunta 2) Actualización Granular desde Plantilla: Detecta diferencias y permite incorporar selectivamente con checkpoint', async () => {
    const campId = 'camp-tmpl-diff';
    const baseSession = await createGameSession(campId, 'Sesión Base para Sincronizar');
    baseSession.frozenScenes = [
      { id: 'sc-1', name: 'Escena Común', backgroundUrl: 'data:image/png;base64,scene1' },
      { id: 'sc-custom', name: 'Mi Ajuste Propio', backgroundUrl: 'data:image/png;base64,custom' },
    ];
    baseSession.frozenConversations = [
      { id: 'cv-1', title: 'Diálogo Común', lines: [{ id: 'l1', speakerName: 'c1', text: 'Hola' }], createdAt: Date.now() },
    ];
    baseSession.stagedState = {
      sceneName: 'Borrador Base',
      backgroundUrl: '',
      characters: [],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    await db.sessions.put(baseSession);

    // Crear plantilla con una escena idéntica, una escena nueva, una escena común modificada y un diálogo nuevo
    const template = await saveSessionAsTemplate(baseSession.id, 'Plantilla Maestra V2', 'one_shot');
    template.frozenScenes = [
      { id: 'sc-1', name: 'Escena Común', backgroundUrl: 'data:image/png;base64,scene1-MEJORADA', lights: [{ id: 'l1', name: 'Luz', preset: 'torch', color: '#fff', intensity: 1, radiusPct: 20, normalizedX: 50, normalizedY: 50, flicker: true, visible: true }] },
      { id: 'sc-new', name: 'Escena Nueva Secreta', backgroundUrl: 'data:image/png;base64,secret' },
    ];
    template.frozenConversations = [
      { id: 'cv-1', title: 'Diálogo Común', lines: [{ id: 'l1', speakerName: 'c1', text: 'Hola' }], createdAt: Date.now() },
      { id: 'cv-new', title: 'Diálogo con Bardo', lines: [{ id: 'lb1', speakerName: 'bardo', text: 'Canción' }], createdAt: Date.now() },
    ];
    await db.sessionTemplates.put(template);

    // 1. Obtener informe de diferencias granulares
    const diff = await getTemplateUpdateDiff(baseSession.id, template.id);
    expect(diff.hasModifications).toBe(true);

    const sceneNew = diff.items.find((i) => i.id === 'sc-new');
    expect(sceneNew?.changeType).toBe('new');

    const sceneMod = diff.items.find((i) => i.id === 'sc-1');
    expect(sceneMod?.changeType).toBe('modified');

    const convNew = diff.items.find((i) => i.id === 'cv-new');
    expect(convNew?.changeType).toBe('new');

    // 2. Aplicar actualización granular:
    // Incorporar escena nueva y diálogo nuevo, pero mantener la versión local de 'Escena Común' (keep_session)
    const result = await applyGranularTemplateUpdate(baseSession.id, template.id, {
      selectedItemIds: ['sc-new', 'sc-1', 'cv-new'],
      modifiedResolution: {
        'sc-1': 'keep_session',
      },
    });

    expect(result.checkpoint).toBeDefined(); // Verificación de punto de control automático previo
    expect(result.session.frozenScenes?.some((s) => s.id === 'sc-new')).toBe(true);
    expect(result.session.frozenScenes?.find((s) => s.id === 'sc-1')?.backgroundUrl).toBe('data:image/png;base64,scene1'); // Conservó la versión local
    expect(result.session.frozenConversations?.some((c) => c.id === 'cv-new')).toBe(true);
  });

  it('26. (Pregunta 3) Lista para Jugar: Diagnostica problemas y ofrece acciones de solución procesables', async () => {
    // Sesión incompleta: sin escena inicial y con un personaje sin avatar
    const incompleteSession = await createGameSession(testCampaignId, 'Sesión Incompleta Diagnóstico');
    incompleteSession.stagedState = {
      sceneName: '',
      backgroundUrl: '',
      characters: [
        { id: 'c-no-avatar', name: 'Personaje Sin Cara', avatarUrl: '', position: 'center-left', isSpeaking: false },
      ],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: 'https://example.com/remote-missing-audio.mp3', // Audio remoto no cacheado
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    await db.sessions.put(incompleteSession);

    const report = await checkSessionReadiness(incompleteSession.id);
    expect(report.isReady).toBe(false);

    // Verificación de acciones procesables asociadas a cada problema:
    const sceneCheck = report.checks.find((c) => c.id === 'scene_prepared');
    expect(sceneCheck?.status).toBe('fail');
    expect(sceneCheck?.action?.type).toBe('select_starting_scene');

    const assetCheck = report.checks.find((c) => c.id === 'offline_assets');
    expect(assetCheck?.status).toBe('warn');
    expect(assetCheck?.action?.type).toBe('download_missing_assets');
    expect(assetCheck?.actionPayload?.missingUrls).toContain('https://example.com/remote-missing-audio.mp3');

    const charCheck = report.checks.find((c) => c.id === 'characters_valid');
    expect(charCheck?.status).toBe('warn');
    expect(charCheck?.action?.type).toBe('fix_character_avatar');
    expect(charCheck?.actionPayload?.characterIds).toContain('c-no-avatar');
  });

  it('27. (Pregunta 6) Migración Explícita de Preparaciones Antiguas: Identifica el origen y fecha sin falsear versión original', async () => {
    // Sesión antigua sin snapshots inmutables ni línea base
    const legacySession = await createGameSession(testCampaignId, 'Sesión Antigua Sin Snapshots');
    legacySession.frozenScenes = undefined;
    legacySession.frozenCharacters = undefined;
    legacySession.frozenConversations = undefined;
    legacySession.initialBaselineConfig = undefined;
    await db.sessions.put(legacySession);

    const migrated = await migrateLegacySession(legacySession.id);

    expect(migrated.isMigratedFromLegacy).toBe(true);
    expect(migrated.legacyMigrationNote).toBeDefined();
    expect(migrated.legacyMigrationNote).toContain('Sesión migrada desde formato antiguo');
    expect(migrated.frozenScenes).toBeDefined();
    expect(migrated.initialBaselineConfig).toBeDefined();
  });

  it('28. (Pregunta 7) Reproductores y Editores Usan Copias de Sesión: Aislamiento frente a modificaciones en la Campaña', async () => {
    const camp = await db.campaigns.get(testCampaignId);
    camp!.savedConversations = [{ id: 'conv-camp', title: 'Diálogo Original Campaña', lines: [], createdAt: Date.now() }];
    camp!.macros = [{ id: 'macro-camp', name: 'Momento Campaña', description: '', icon: 'sparkles', steps: [] }];
    await db.campaigns.put(camp!);

    const session = await createGameSession(testCampaignId, 'Sesión con Copias Propias');
    session.frozenConversations = [{ id: 'conv-frozen', title: 'Diálogo Congelado de la Sesión', lines: [], createdAt: Date.now() }];
    session.frozenMacros = [{ id: 'macro-frozen', name: 'Momento Congelado de la Sesión', description: '', icon: 'sparkles', steps: [] }];
    await db.sessions.put(session);

    gameSessionService.setCurrentSession(session);

    // Verificación: getActiveConversations y getActiveMacros consumen prioritariamente las copias congeladas
    const activeConvs = gameSessionService.getActiveConversations(camp!.savedConversations);
    expect(activeConvs[0].id).toBe('conv-frozen');
    expect(activeConvs[0].title).toBe('Diálogo Congelado de la Sesión');

    const activeMacros = gameSessionService.getActiveMacros(camp!.macros);
    expect(activeMacros[0].id).toBe('macro-frozen');

    // Modificar la campaña no afecta al reproductor
    camp!.savedConversations![0].title = 'Diálogo Mutado en Campaña';
    await db.campaigns.put(camp!);

    const activeConvsAfter = gameSessionService.getActiveConversations(camp!.savedConversations);
    expect(activeConvsAfter[0].title).toBe('Diálogo Congelado de la Sesión');
  });

  it('29. (Pregunta 8) Detección de Versiones Divergentes en Dispositivos Separados con Igual Número de Revisión', () => {
    const localSession: GameSession = {
      id: 'sess-sync-race',
      campaignId: 'camp-1',
      name: 'Aventura Viernes',
      groupId: 'g-1',
      status: 'preparing',
      revision: 4, // Misma revisión
      planNotes: '',
      stagedState: null,
      liveState: null,
      updatedAt: 1700000000000,
      createdAt: 1700000000000,
      schemaVersion: 1,
      frozenScenes: [{ id: 'sc-a', name: 'Bosque Local', backgroundUrl: '' }],
    };

    const pkgFromOtherDevice = {
      schemaVersion: 1,
      exportedAt: 1700000050000, // Hora ligeramente distinta
      type: 'game_session_package' as const,
      session: {
        ...localSession,
        revision: 4, // Misma revisión
        updatedAt: 1700000050000,
        frozenScenes: [{ id: 'sc-b', name: 'Cueva en Otro Dispositivo', backgroundUrl: '' }],
      },
      assets: [],
      campaignSnippet: {
        id: 'camp-1',
        title: 'Campaña',
        scenes: [{ id: 'sc-b', name: 'Cueva en Otro Dispositivo', backgroundUrl: '' }],
        characters: [],
        savedConversations: [],
      },
    };

    const conflict = detectImportVersionConflict(pkgFromOtherDevice as any, localSession);
    // Verificación crítica: No decide únicamente por el reloj; detecta la bifurcación y recomienda copia paralela
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.conflictType).toBe('diverged_concurrent_branch');
    expect(conflict.recommendation).toBe('duplicate');
  });

  it('30. (Pregunta 9) Exportación Limpia sin blob Efímeros: Convierte URLs temporales a DataURLs persistentes', async () => {
    const session = await createGameSession(testCampaignId, 'Sesión con Blob');
    // Simular un activo con URL blob: local
    session.stagedState = {
      sceneName: 'Escena con Blob',
      backgroundUrl: 'data:image/png;base64,bg',
      characters: [{ id: 'c1', name: 'Héroe', avatarUrl: 'blob:http://localhost:5173/fake-uuid', position: 'center-left', isSpeaking: false }],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    await db.sessions.put(session);

    const pkg = await packSessionForExport(session.id, false);
    // Verificación: Ningún activo empaquetado debe tener URL blob efímera
    const hasBlob = pkg.assets.some((a) => a.dataUrl.startsWith('blob:'));
    expect(hasBlob).toBe(false);
  });

  it('31. (Pregunta 10) Transaccionalidad Atómica en Importación: Revierte por completo si el paquete es inválido', async () => {
    const sessionsBefore = await db.sessions.count();
    const assetsBefore = await db.assets.count();

    const corruptedPkg: any = {
      schemaVersion: 999, // Versión no soportada
      type: 'invalid_package',
      session: { id: 'sess-fail' },
      assets: [{ id: 'a1', name: 'asset', dataUrl: 'data:...' }],
    };

    await expect(importSessionPackageWithRemap(corruptedPkg, true)).rejects.toThrow();

    // Verificación: Estado de base de datos permanece 100% intacto sin restos parciales
    expect(await db.sessions.count()).toBe(sessionsBefore);
    expect(await db.assets.count()).toBe(assetsBefore);
  });

  it('32. (Pregunta 11) Medidor de Espacio y Depuración Segura de Archivos Huérfanos', async () => {
    // 1. Registrar activos: uno en uso por una campaña y otro huérfano sin referencias
    const activeAsset = await registerImmutableAsset('Fondo Taberna', 'image', 'data:image/png;base64,tavern-in-use', 'https://example.com/tavern.png');
    const orphanAsset = await registerImmutableAsset('Audio Desechado', 'audio', 'data:audio/mp3;base64,orphan-music', 'https://example.com/orphan.mp3');

    // Vincular activo activo a una campaña
    const camp = (await db.campaigns.get(testCampaignId))!;
    camp.scenes = [{ id: 'sc-audit', name: 'Escena Auditoría', backgroundUrl: activeAsset.dataUrl }];
    await db.campaigns.put(camp);

    // 2. Calcular auditoría de almacenamiento
    const audit = await calculateStorageAudit();
    expect(audit.totalAssets).toBeGreaterThan(0);
    expect(audit.orphanAssetIds).toContain(orphanAsset.id);
    expect(audit.orphanAssetIds).not.toContain(activeAsset.id);

    // 3. Purgar huérfanos
    const purgeResult = await purgeOrphanAssets();
    expect(purgeResult.purgedCount).toBeGreaterThan(0);

    // Verificación: El activo huérfano se eliminó y el activo en uso se conservó
    const reloadedActive = await db.assets.get(activeAsset.id);
    expect(reloadedActive).toBeDefined();
    const reloadedOrphan = await db.assets.get(orphanAsset.id);
    expect(reloadedOrphan).toBeUndefined();
  });

  it('33. (Pregunta 12) Restauración de Comprobación de Respaldo Aislada sin Tocar la Mesa ni la Campaña Activa', async () => {
    const session = await createGameSession(testCampaignId, 'Aventura a Auditar');
    session.stagedState = {
      sceneName: 'Templo del Juicio',
      backgroundUrl: 'data:image/png;base64,temple',
      characters: [],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    await db.sessions.put(session);

    const pkg = await packSessionForExport(session.id, false);

    // Importar como copia de comprobación
    const auditReport = await importSessionAsAuditCopy(pkg);

    expect(auditReport.isSuccess).toBe(true);
    expect(auditReport.isolatedFromLiveTable).toBe(true);

    const auditSession = (await db.sessions.get(auditReport.auditSessionId))!;
    expect(auditSession.name).toContain('[Comprobación]');
    expect(auditSession.isAuditCopy).toBe(true);
    expect(auditSession.liveState).toBeNull(); // Verificación: Mesa 100% aislada
  });
});
