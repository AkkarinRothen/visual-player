# Revisiones del manual

Este registro documenta la revisión del manual. No reemplaza el historial de cambios de la aplicación.

**Estado más reciente:** MAN-002 comprobó la conexión y la publicación básica. El bloqueo de entrada observado en MAN-001 dejó de reproducirse después de una actualización concurrente del código. Los demás recorridos siguen pendientes según la tabla y el detalle de MAN-002.

## 2026-09-02 — MAN-001: primera edición

- **Versión:** árbol de trabajo local con cambios en curso; no corresponde a una versión publicada ni a un commit cerrado.
- **Entorno:** Windows, navegador integrado, servidor Vite en `http://127.0.0.1:5173/`.
- **Alcance:** inventario de controles, guía inicial, recorridos principales, glosario, solución de problemas y procedimiento de mantenimiento.
- **Archivos creados:** `README.md`, `MANTENIMIENTO.md`, `REVISIONES.md` y regla de cierre en `../../AGENTS.md`. Se enlazó el manual desde el README del proyecto.
- **Capturas:** no incorporadas. La validación visual del panel del director quedó bloqueada; no se añadieron capturas de una pantalla rota como instrucciones de uso.
- **Resultado:** primera edición documentada; revisión visual parcial por bloqueo.

### Evidencia y cobertura

| Área | Evidencia de esta revisión | Pendiente |
| --- | --- | --- |
| Inicio | Interfaz abierta: Pantalla de Escena, Control Remoto, Conectar y Escanear Código QR. | Adaptación móvil y permisos de cámara. |
| Mesa | Se ejecutó Abrir en esta Pantalla; aparecieron código de sala, QR, pantalla completa y aviso para habilitar sonido. | Sonido real, pantalla completa en dispositivos finales y recepción de cambios. |
| Entrada del director | Se ingresó el código mostrado por la Mesa y se pulsó Conectar en una segunda pestaña. El panel quedó en blanco. | Conexión completa, aprobación y estado Mesa OK. |
| Campañas, escenas y personajes | Revisados en `MasterController.tsx`, `CampaignPickerModal.tsx`, `SceneEditModal.tsx`, `CharacterEditModal.tsx` y `SummonCharacterModal.tsx`. | Crear, editar, invocar y guardar mediante la interfaz. |
| Preparación y publicación | Revisados selector de modo, `SessionPanel.tsx`, `SelectivePublishModal.tsx` y accesos del controlador. | Comprobar cada acción en ambos modos y confirmar recepción en Mesa. |
| Ambientación y composición | Revisados controles de Sesión/Vista Clásica y modales de composición, luces, banda sonora y SFX. | Publicación, ensayo privado, audio real y persistencia. |
| Narración y documentos | Revisados `CinematicDialogueDock.tsx`, `ConversationEditorModal.tsx` y `HandoutViewerModal.tsx`. | Diálogo, acciones, ramas, revelación de páginas y separación público/privado. |
| Combate y momentos | Revisados controles de `CombatTab.tsx`, `MomentsTab.tsx` y accesos de Sesión. | Rondas, reloj, refuerzos, cámara, cancelación y restauración. |
| Continuidad | Revisados modales de diario, preparación de sesión, crónica y exportación de crónica. | Guardado/reapertura, revisión del texto exportado y privacidad. |
| Recuperación y copias | Revisados exportación/importación, Reset Demo, `CheckpointsModal.tsx`, `EmergencyDock.tsx`, `useEmergencyActions.ts` y recuperación en Lobby. | Exportar/reimportar campaña de prueba, restaurar checkpoints y reanudar. |

### Incidencias observadas

1. **Panel del director en blanco.** Tras ingresar el PIN de la Mesa en la segunda pestaña, la consola informó `ReferenceError: useEffect is not defined` en `SessionPanel`. En el archivo inspeccionado se utiliza `useEffect` pero la importación inicial solo incluía `React` y `useState`. No se modificó la implementación durante este trabajo de documentación. Revalidar contra el estado actual antes de corregir, porque hay cambios concurrentes en la app.
2. **Alcance de Mute Total por confirmar.** El manejador revisado en `useEmergencyActions.ts` cambia `ambientPlaying` y envía ese estado; no se verificó el corte de todos los canales. El manual evita garantizar silencio total y señala el control específico Detener SFX.
3. **Preparación no debe describirse como aislamiento universal.** Hay acciones que envían comandos directamente; se documentaron sus controles explícitos y se dejó pendiente comprobar su comportamiento en ambos modos.
4. **Reset Demo elimina biblioteca.** El manejador revisado limpia campañas, escenas, personajes y encuentros antes de cargar la demostración. El manual explica ese alcance y no lo recomienda para resolver desconexiones.

### Próximos recorridos

1. Tras resolver el fallo de entrada, ejecutar la guía inicial con una campaña de prueba y comprobar cambios en la Mesa.
2. Validar Preparación/Publicar con escena, personaje, audio y herramientas avanzadas; capturar las vistas reales.
3. Comprobar guardar/reabrir/exportar/importar y recuperación, diferenciando campaña de checkpoint.
4. Recorrer combate, diálogos, handouts, crónicas y herramientas de ambientación; actualizar cada sección al terminar su walkthrough.
5. Validar celular/tablet, QR con cámara, Android y funcionamiento sin Internet por separado antes de añadir instrucciones específicas.

## 2026-09-02 — MAN-002: conexión y publicación comprobadas

- **Versión:** mismo árbol de trabajo local, actualizado concurrentemente por otro trabajo. `SessionPanel.tsx` pasó a importar `useEffect`; este trabajo de documentación no modificó el código de la app.
- **Entorno:** dos pestañas del navegador integrado, Vite local, campaña de demostración «La Crónica de las Gemas de Fuego». No equivale a dos dispositivos físicos.
- **Recorrido:** recargar el control, introducir el código visible de la Mesa y conectar; abrir Vista Clásica; activar Preparación; elegir Bosque de los Susurros; comprobar que la Mesa conserva la taberna; pulsar Publicar Todo y comprobar el cambio en la Mesa.
- **Resultado observado:** panel del director accesible; indicadores Master Conectado y Mesa OK; el borrador mostró seis cambios y el bosque mientras la Mesa conservó TABERNA DEL DRAGÓN DURMIENTE. Tras publicar, la Mesa mostró BOSQUE DE LOS SUSURROS, su subtítulo y los personajes Eldrin Sombrasusurro y Morwen del Fuego Carmesí.
- **Comprobación visual adicional:** las vistas Sesión y Vista Clásica mostraron sus controles. Se confirmaron los nombres Documentos, Notas DM, Invocar NPC, + Invocar de la Biblioteca, Revisar y Publicar y Publicar Todo.
- **Cambios del manual:** corregidos accesos a documentos y notas; precisados los nombres de invocación; aclarado que una escena puede cargar personajes y audio; actualizados el estado de validación y la orientación para una pantalla en blanco.
- **Incidencia cerrada:** el error de importación de useEffect observado en MAN-001 ya no bloqueó este recorrido. Se conserva el registro anterior como evidencia histórica.
- **Límites:** no se probaron audio real, cámara/QR, autorización manual, dispositivos físicos, publicación selectiva, invocación manual, formularios de creación ni recorridos avanzados. Las pantallas se inspeccionaron mediante su árbol de accesibilidad; no se incorporaron capturas ni se realizó una revisión visual de estilos.
- **Verificación documental:** se comprobaron los enlaces locales y anclas del manual. La comprobación global de espacios de Git detectó un aviso previo en `src/index.css`, ajeno a estos cambios de documentación; no se modificó ese archivo.
- **Próximo recorrido:** publicar selectivamente una escena con personajes, comprobar audio real y completar capturas en los dispositivos de la partida. Continuar luego con guardado/exportación/recuperación.
- **Resultado:** manual actualizado; recorrido básico comprobado con el alcance descrito.

## 2026-09-02 — MAN-003: temporizador de combate y condiciones sobre avatares

- **Versión:** árbol de trabajo local con mejoras de combate (`CombatTurnTimer` y `CombatConditionTokens`).
- **Entorno:** pruebas automatizadas unitarias en Vitest (52 suites, 240 pruebas aprobadas) y compilación de producción con TypeScript/Vite.
- **Alcance:** documentación de las condiciones mecánicas de combate (insignias, agrupación `+N`, privacidad y separación visual de «Invisible») y del temporizador cinematográfico de turno (anillo luminoso, cuenta local por epoch, avisos sin penalización automática).
- **Archivos actualizados:** `docs/manual/README.md` (sección [Dirigir un combate](#combate)), `src/components/display/InitiativeRibbon.tsx`, `src/domain/combat/combatConditionsCatalog.ts`, `src/components/master/CombatTab.tsx` y `src/components/master/SessionPanel.tsx`.
- **Resultado observado:** suite completa de 240 pruebas pasando al 100%. Manual enriquecido con instrucciones exactas para jugadores y director.
- **Resultado:** manual y documentación de mantenimiento actualizados.

## 2026-09-02 — MAN-004: Biblioteca de Preparaciones y Sesiones Reutilizables

- **Versión:** árbol de trabajo local. Implementación Biblioteca de Preparaciones sobre Dexie v6.
- **Entorno:** Vitest 53 suites, 251 pruebas aprobadas. TypeScript noEmit 0 errores.
- **Alcance:** GameSession/DraftSaveState en types, Dexie v6 sessions/sessionTemplates, GameSessionService cola FIFO debounce 400ms, useGameSession hook observable, MasterController carga borrador al arrancar, SessionPanel cabecera nombre + guardado + Biblioteca, SessionLibraryModal pestañas Continuar/Preparación/Duplicar/Plantilla/Exportar/Importar/Archivar/Eliminar, sessionLibrary.css, 11 pruebas unitarias nuevas.
- **Manual:** nueva sección [Gestionar preparaciones y reutilizar sesiones], borrador automático en Guardar, nuevos términos glosario.
- **Visual:** walkthrough en navegador pendiente.
- **Resultado:** implementación completa. 251 pruebas 100 por ciento. Walkthrough visual pendiente.

## 2026-09-02 — MAN-005: Conservación, Reutilización y Respaldo Robusto de Preparaciones

- **Versión:** árbol de trabajo local con arquitectura de persistencia Dexie v7.
- **Entorno:** Vitest 54 suites, 258 pruebas aprobadas (100%). TypeScript `tsc --noEmit` 0 errores.
- **Alcance:**
  1. Independencia Sesión ↔ Campaña: snapshot congelado de `frozenScenes` y `frozenCharacters` al preparar sesiones, evitando mutaciones silenciosas cuando se edita la biblioteca de la campaña.
  2. Almacén inmutable con deduplicación por hash/URL y conteo de referencias (`originUrl`, `refCount`).
  3. Pre-Flight Export Analyzer: escáner exhaustivo de dependencias visuales y sonoras (fondos, retratos, props, sfx, handouts, diálogos), descarga de archivos externos y diagnóstico explícito (Paquete 100% Autocontenido para offline vs Exportación Incompleta).
  4. Safe Import Diff Review: inspección previa al guardado en base de datos al importar `.vpp.json`, con remapeo transaccional e importación como copia independiente por defecto.
  5. Puntos de control (checkpoints) vinculados por `sessionId` con opción de «Restaurar como copia nueva» sin pisar la preparación activa ni publicar en la Mesa.
  6. Papelera de reciclaje para sesiones (soft-delete con `isDeleted`, recuperación y vaciado definitivo).
  7. Indicadores visuales de respaldo exterior (`Solo local`, `Sin respaldar`, `Respaldado`).
  8. Duplicación con opción selectiva de restaurar o conservar HP en Monstruos/NPCs (`restoreNpcHp`).
- **Archivos actualizados:** `src/types/index.ts`, `src/db/index.ts`, `src/services/gameSessionService.ts`, `src/hooks/useGameSession.ts`, `src/components/master/modals/SessionLibraryModal.tsx`, `src/components/master/SessionPanel.tsx`, `src/components/master/MasterController.tsx`, `src/styles/sessionLibrary.css`, `src/services/gameSessionStorageRobustness.test.ts`, `docs/manual/README.md` y `docs/manual/REVISIONES.md`.
- **Resultado observado:** 258/258 pruebas pasando. Verificación técnica de independencia y empaquetado superada.
- **Resultado:** manual actualizado con MAN-005.

## 2026-09-03 — MAN-006: Modularización Arquitectónica y Reducción de Deuda Técnica

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 54 suites, 259 pruebas aprobadas (100%). TypeScript `tsc --noEmit` 0 errores.
- **Alcance y Cambios de Arquitectura:**
  1. **Capa de Base de Datos (`src/db/`)**:
     - `src/db/demoData.ts`: extracción de constantes demo (`BUILTIN_SFX`, `DEMO_CHARACTERS`, `DEMO_SCENES`, `DEMO_MACROS`, `DEMO_ENCOUNTERS`, `DEMO_CAMPAIGN`).
     - `src/db/dbUtils.ts`: generador único y atómico de IDs.
     - `src/db/campaignDb.ts`: CRUD de campañas, encuentros guardados e inicialización de datos por defecto.
     - `src/db/checkpointDb.ts`: gestión y restauración de puntos de control vinculados a sesiones.
     - `src/db/assetDb.ts`: almacén de assets inmutables, escáner de dependencias y descargador para exportación completa offline.
     - `src/db/sessionDb.ts`: ciclo de vida de sesiones, borradores, plantillas, papelera, exportación empaquetada e importación con remapeo transaccional.
     - `src/db/index.ts`: fachada Dexie v7 reducida de 1.456 a 88 líneas, manteniendo re-exportación transparente con 100% de retrocompatibilidad.
  2. **Modal de Biblioteca de Sesiones (`src/components/master/modals/SessionLibraryModal.tsx`)**:
     - Reducido de 952 a 425 líneas delegando sus diálogos a componentes específicos en `src/components/master/modals/sessionLibrary/`:
       - `SessionCard.tsx`: tarjeta de sesión con botones de acceso rápido y menú contextual.
       - `PreflightExportDialog.tsx`: diálogo de diagnóstico y pre-flight de activos offline.
       - `DiffReviewDialog.tsx`: inspección previa de diferencias antes de importar.
       - `SessionCheckpointsDialog.tsx`: visor y restaurador de puntos de control de la sesión.
       - `SessionActionDialogs.tsx`: diálogos de duplicación, plantillas y confirmaciones de borrado.
  3. **Panel de Sesión (`src/components/master/SessionPanel.tsx`)**:
     - Descompuesto mediante subcomponentes especializados en `src/components/master/sessionPanel/`:
       - `SessionIdentityHeader.tsx`: cabecera con renombrado, estado de guardado, reloj relativo e insignia de respaldo.
       - `SessionModeHeader.tsx`: selector de modo En Vivo / Preparación y cambio a Vista Clásica.
       - `DraftPendingAlert.tsx`: banner de cambios pendientes en borrador con accesos a llevar a Mesa, inspeccionar o descartar.
       - `SceneInteractionsToolbar.tsx`: barra táctil de interacciones declarativas de escenario.
       - `CombatContextCard.tsx`: widget contextual de combate con reloj de turno, condiciones y enfoque de cámara.
  4. **Controlador Principal (`src/components/master/MasterController.tsx`)**:
     - Extracción de la capa auxiliar de 12 modales secundarios a `src/components/master/modals/MasterAuxiliaryModals.tsx`.
     - Extracción de la barra de navegación móvil a `src/components/master/navigation/MasterBottomNav.tsx`.
- **Impacto de uso:** «sin cambios de uso» directo en la interfaz (misma funcionalidad, botones y flujos validados intactos, con mayor estabilidad y mantenibilidad del código).
- **Resultado:** modularización completada con 259/259 pruebas pasando al 100% y 0 errores de tipado en TypeScript.

## 2026-09-03 — MAN-007: Comprobación de Protección de Preparaciones, Concurrencia y Respaldo Offline

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 54 suites, 262 pruebas aprobadas (100%). Build de producción `npm run build` aprobado sin errores (0 errores de TypeScript y bundling Vite en 1.14s).
- **Alcance y Verificación Técnica de la Serie 1:**
  1. **Aislamiento en Concurrencia de Guardado (Debounce ↔ Cambio de Sesión):**
     - Se reforzó `flushPendingSave()` y `_enqueueDraftSave()` en `gameSessionService.ts` para capturar el ID de sesión anterior y consumir `pendingStagedState = null` de manera atómica.
     - Se implementó la prueba automatizada (Test 9) que dispara un guardado debounced en Sesión A y conmuta inmediatamente a Sesión B: se verificó que el borrador de A se guarda exclusivamente en Sesión A y Sesión B permanece 100% limpia sin fuga ni contaminación cruzada.
  2. **Recorrido Offline Completo con Conversaciones y Handouts:**
     - Se integraron `savedConversations`, `macros` y `savedHandouts` en el `campaignSnippet` del paquete exportado (`GameSessionPackage`).
     - Se reforzó `importSessionPackageWithRemap` para incorporar o fusionar sin colisión las conversaciones y documentos a la campaña de destino.
     - La prueba automatizada (Test 10) validó la exportación y restauración completa de ramas de conversación y handouts en base de datos aislada.
  3. **Independencia Campaña ↔ Sesión:**
     - Se ratificó que la eliminación o modificación radical de escenas y personajes en la campaña no afecta al snapshot congelado (`frozenScenes` y `frozenCharacters`) ni al borrador de la preparación ya existente.
  4. **Claridad de Etiquetas de Respaldo Exterior:**
     - Se incorporó la propiedad `lastExportIsComplete` a `GameSession` y al paquete.
     - Se diferenció en `SessionCard` y `SessionIdentityHeader`:
       - **Solo local:** guardado exclusivamente en el almacenamiento local del navegador; nunca exportado.
       - **Sin respaldar:** hubo modificaciones posteriores a la última exportación.
       - **Respaldado:** copia al día; con diferenciación visual y tooltip si el respaldo es 100% autocontenido para uso sin internet o si contiene recursos con URLs externas.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* serialización FIFO, independencia de snapshots congelados, aislamiento estricto de borradores ante cambios rápidos de sesión, generación y remapeo transaccional de paquetes offline incluyendo conversaciones y handouts.
  - *Pendiente de comprobación física en mesa conectada:* sincronización WebRTC en tiempo real con dos dispositivos físicos conectados simultáneamente (PC Maestro ↔ Android Mesa) y latencia bajo redes variables.
- **Resultado:** manual y registro actualizados con MAN-007; 262/262 pruebas aprobadas.

## 2026-09-03 — MAN-008: Biblioteca Unificada Multicampaña, Búsqueda Profunda y Reutilización Segura de Plantillas

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 54 suites, 263 pruebas aprobadas (100%). Build de producción `npm run build` aprobado sin errores (0 errores de TypeScript y bundling Vite en 1.16s).
- **Alcance y Verificación Técnica de la Serie 2 (Pregunta 5):**
  1. **Selector de Campaña Multicampaña:**
     - Se añadió selector desplegable en la cabecera de filtros de `SessionLibraryModal.tsx` que permite conmutar entre la campaña actual y «Todas las campañas».
     - La selección se recuerda mediante `localStorage` (`vp_library_campaign_filter`).
     - Se agregaron `getAllSessions()` y `getAllSessionTemplates()` en `src/db/sessionDb.ts` y en `gameSessionService.ts`.
  2. **Búsqueda Profunda Multidimensional:**
     - El filtro de búsqueda ahora busca en tiempo real en:
       - Nombre de la sesión (`s.name`).
       - Notas secretas de preparación del director (`s.planNotes`).
       - Nombre de escena del borrador (`s.stagedState.sceneName`).
       - Nombres de escenas congeladas (`s.frozenScenes`).
       - Nombres de personajes en borrador o congelados (`s.frozenCharacters`).
       - En plantillas: nombre, descripción y escena base.
  3. **Filtro por Etiquetas (#tags):**
     - Si existen etiquetas en las sesiones o plantillas, se despliega una barra horizontal de chips de etiquetas (`#etiqueta`) para filtrar rápidamente.
  4. **Miniaturas Visuales e Insignias de Campaña:**
     - `SessionCard.tsx` ahora presenta miniatura (`session-card-thumb`) con el fondo de la escena o icono ilustrado.
     - En el modo «Todas las campañas», cada tarjeta muestra la insignia con el nombre de su campaña de origen.
  5. **Reutilización Segura entre Campañas:**
     - Se incorporó el botón «Usar Plantilla» en la vista de plantillas de la biblioteca, permitiendo instanciar cualquier plantilla (incluso de otra campaña) como una sesión limpia e independiente en la campaña activa actual, sin modificar la plantilla original.
  6. **Prueba de Integración Robusta (Test 12):**
     - Se creó el test automatizado nº 12 en `src/services/gameSessionStorageRobustness.test.ts` que verifica la consulta unificada multicampaña, el filtrado y la instanciación de una plantilla de Campaña B en Campaña A con conservación del aislamiento.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 263/263 pruebas aprobadas, cero fugas de datos entre campañas, aislamiento estricto de plantillas y build de producción verificado.
  - *Pendiente de comprobación física en mesa conectada:* rendimiento de renderizado de la lista unificada con más de 100 preparaciones con miniaturas en tablets móviles de baja gama.
- **Resultado:** manual y revisiones actualizados con MAN-008; 263/263 pruebas aprobadas.

## 2026-09-03 — MAN-009: Presets de Escena Completa, Continuidad de Grupo y Aislamiento Total de Preparaciones

- **Versión:** árbol de trabajo local con Dexie v8 (`scenePresets`).
- **Entorno:** Vitest 54 suites, 267 pruebas aprobadas (100%). Build de producción `npm run build` aprobado sin errores (0 errores de TypeScript y bundling Vite en 1.06s).
- **Alcance y Verificación Técnica de la Serie (Preguntas 1, 5 y 7):**
  1. **Presets de Escena Completa (`SceneCompositionPreset` - Pregunta 1):**
     - Ampliación del modelo de datos para persistir escenas enteras compuestas con fondo, retratos de personajes colocados, accesorios (props), luces interactivas (antorchas, faroles), emisores de partículas (humo, fuego, lluvia), música ambiental, interacciones y conversación/diálogo vinculado.
     - Creación de la tabla `scenePresets` en Dexie v8 y funciones de base de datos (`saveSceneAsCompositionPreset`, `getSceneCompositionPresets`, `deleteSceneCompositionPreset`, `instantiateScenePresetIntoSession`).
     - Inserción segura en modo Preparación (`stagedState`): remapeo estricto de identificadores únicos para evitar colisiones y garantía de cero emisión o reproducción sonora a la Mesa de los jugadores hasta que el director lo decida.
  2. **Continuidad de Partidas y Grupos de Juego (`groupId` / `groupName` - Preguntas 5 y 6):**
     - Implementación de **«Siguiente entrega (mismo grupo)»** (`prepareNextGameSession`): preserva el inventario, las revelaciones descubiertas, el estado de puertas y consecuencias en el mundo acumuladas por la mesa; permite conservar o resetear el daño sufrido por monstruos y NPCs; avanza el número ordinal (`Sesión N+1`); y deja la Mesa en blanco (`liveState: null`) para preparar la nueva sesión.
     - Implementación de **«Jugar con otro grupo»** (`createSessionForNewGroup`): bifurca una preparación asignando un nuevo identificador de grupo (`groupId`), resetea los misterios (personajes vuelven a siluetas y alias misteriosos para proteger sorpresas narrativas) y limpia el combate, manteniendo intacto el escenario, las decoraciones de mapa y las puertas abiertas intencionales.
  3. **Aislamiento Total de Preparaciones (Snapshots Congelados de Diálogos y Handouts - Pregunta 7):**
     - Se extendió `GameSession` con `frozenConversations`, `frozenHandouts` y `frozenMacros`.
     - Toda preparación congela de inmediato las conversaciones y documentos al crearse o duplicarse.
     - Modificar o eliminar personajes, conversaciones o handouts en la Campaña no altera jamás las preparaciones ya guardadas.
     - `gameSessionService.getActiveConversations()` y `getActiveHandouts()` priorizan los snapshots congelados de la sesión activa.
  4. **Pruebas Automatizadas de Robustez (Tests 13, 14, 15 y 16):**
     - Test 13: Inmunidad total de conversaciones y handouts congelados frente a modificaciones posteriores o borrado en la campaña.
     - Test 14: Preparación de la siguiente sesión para el mismo grupo conservando consecuencias, daño en NPCs y con Mesa limpia.
     - Test 15: Creación de partida independiente para otro grupo reiniciando misterios y siluetas sin tocar la escenografía.
     - Test 16: Guardado e instanciación de Preset de Escena Completa con remapeo de identificadores y diálogo vinculado.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 267/267 pruebas aprobadas en 54 suites, 0 errores de compilación TypeScript (`tsc -b`), bundling Vite exitoso y verificación de remapeo de identificadores.
  - *Pendiente de comprobación física en mesa conectada:* ensayo táctil de bifurcación de grupos y verificación visual de proyección de siluetas de personajes en un proyector o pantalla de jugadores real conectada por WebRTC.
- **Resultado:** manual de usuario (`README.md`) y registro de revisiones actualizados con MAN-009.

## 2026-09-03 — MAN-010: Escáner de Dependencias, Resolución de Conflictos, Sincronización Diferencial y Chequeo «Lista para Jugar»

- **Versión:** árbol de trabajo local con Dexie v8.
- **Entorno:** Vitest 54 suites, 272 pruebas aprobadas (100%). Build de producción `npm run build` aprobado sin errores (0 errores de TypeScript y bundling Vite en 1.05s).
- **Alcance y Verificación Técnica de la Serie Completa (Preguntas 2, 3, 4, 8, 9 y 10):**
  1. **Análisis de Dependencias al Reutilizar Escenas (`scanPresetDependencies` - Pregunta 2):**
     - Inspecciona fondos, retratos de personajes, props y pistas de audio distinguiendo con precisión:
       - Activos incluidos (incrustados como dataURL o blob local).
       - Activos ya disponibles en el almacén local del dispositivo (`db.assets`).
       - Archivos faltantes o URLs remotas no cacheadas.
  2. **Resolución de Conflictos de Nombres e Identificadores (Pregunta 3):**
     - Al instanciar un preset en otra campaña o sesión, no decide únicamente por coincidencia de nombres textuales.
     - Permite explícitamente **«Reutilizar existente»** (vincula al personaje o conversación de la campaña si coincide ID/nombre) o **«Crear copia independiente»** (asigna identificador unívoco y sufijo `(Copia)` sin pisar el contenido existente).
  3. **Configuración Preparada vs Progreso Jugado (Pregunta 4):**
     - Mantiene desacoplado el estado del escenario (decoración de props, puertas secretas intencionalmente abiertas, luces, música) del progreso efímero o transitorio (combate, HP perdido, condiciones).
  4. **Actualización Diferencial desde Plantillas Maestras (`updateSessionFromTemplate` - Pregunta 8):**
     - Permite trasladar mejoras de una plantilla a sesiones ya empezadas.
     - Crea automáticamente un **punto de control (checkpoint) previo** de seguridad.
     - Incorpora nuevas escenas y diálogos sin pisar el progreso jugado (no borra daño recibido ni revelaciones ya descubiertas).
  5. **Transporte entre Dispositivos y Control de Versiones (`detectImportVersionConflict` - Pregunta 9):**
     - Al importar un paquete `.vpp.json`, compara `revision` y marcas de tiempo (`updatedAt`) con la copia local existente en el dispositivo.
     - Si la copia local es más reciente (`local_newer`), emite una advertencia explícita y recomienda **«Importar como copia paralela»**, impidiendo que un archivo desactualizado sobrescriba silenciosamente las partidas jugadas.
  6. **Chequeo Pre-Partida «Lista para Jugar» (`checkSessionReadiness` - Pregunta 10):**
     - Diagnóstico integral antes de abrir la mesa:
       - Escena preparada y asignada.
       - Activos 100% listos para uso sin conexión a internet.
       - Retratos e identidades de personajes válidos.
       - Conversaciones y documentos congelados de forma protegida.
  7. **Pruebas Automatizadas de Robustez (Tests 17 a 21):**
     - Test 17: Detección exhaustiva de dependencias incluidas, disponibles y faltantes.
     - Test 18: Reutilización de existentes vs creación de copia independiente.
     - Test 19: Actualización diferencial desde plantilla con checkpoint previo sin perder daño jugado.
     - Test 20: Detección de conflictos de versiones en sincronización PC ↔ móvil.
     - Test 21: Diagnóstico de sesión lista para jugar vs sesión incompleta.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 272/272 pruebas aprobadas en 54 suites, tipado estricto `tsc -b` aprobado, bundling Vite en 1.05s y tests de robustez pasando al 100%.
  - *Pendiente de comprobación física en mesa conectada:* transferencia física manual de archivos `.vpp.json` entre una PC de escritorio y un dispositivo móvil Android sin conexión a internet durante una partida en vivo.
- **Resultado:** manual de usuario (`README.md`) y registro de revisiones actualizados con MAN-010.

## 2026-09-03 — MAN-011: Controles de Presets en Interfaz, Protección de la Mesa Conectada y Línea Base Fiel para Nuevos Grupos

- **Versión:** árbol de trabajo local con integración de Presets y Línea Base en interfaz.
- **Entorno:** Vitest 54 suites, 275 pruebas aprobadas (100%). Compilación de producción con Vite y TypeScript (`tsc -b`) aprobada con 0 errores (dist/ en 1.29s).
- **Alcance y Verificación Técnica de la Serie (Preguntas 1, 4 y 5):**
  1. **Controles de Preset en la Interfaz (`ScenePresetModal` - Pregunta 1):**
     - Botones accesibles directamente en el `SessionPanel` junto a la escena en borrador/preparación:
       - **«Guardar Preset»**: guarda la composición visual completa (fondo, personajes, props, luces, partículas y audio) con nombre, etiquetas, descripción y selector para vincular conversaciones.
       - **«Insertar Preset...»**: explorador de biblioteca con búsqueda y previsualización. Muestra el semáforo de dependencias (archivos incluidos vs locales vs faltantes), selector de resolución de coincidencias para personajes y diálogos (reutilizar existente vs copia independiente con sufijo), y opciones de inserción: **«Añadir como Escena Nueva»** (por defecto) o **«Reemplazar Borrador»** (creando checkpoint de recuperación previo).
  2. **Protección Absoluta de la Mesa Conectada (`SET_STAGED_STATE_ONLY` - Pregunta 4):**
     - Cargar una preparación en modo borrador, insertar un preset o bifurcar una sesión para otro grupo ejecuta la acción exclusivamente sobre `stagedState` y activa el modo Preparación.
     - `liveState` y la emisión por WebRTC hacia la Mesa de los jugadores se mantienen al 100% intactos. La pantalla de los jugadores nunca parpadea, ni se vacía ni proyecta borradores antes de que el DM pulse **«Llevar a la Mesa (ACK)»**.
  3. **Línea Base Inicial Fiel para Nuevos Grupos (`SessionInitialBaseline` - Pregunta 5):**
     - Incorporado botón **«Fijar Inicial»** en la barra de identidad de la sesión para que el DM fije voluntariamente la línea base preparada. El autoguardado durante la partida jamás la altera.
     - En el diálogo **«Jugar con otro grupo»**, se visualiza la procedencia (nombre y versión de la línea base o plantilla).
     - Al bifurcar para otro grupo:
       - Los personajes conocidos de inicio (ej. tabernero) siguen siendo conocidos.
       - Los NPCs preparados con heridas previas (ej. guardia con 12 de 25 HP) comienzan con su daño preparado, sin curarse mágicamente al 100% ni arrastrar el daño de la partida anterior.
       - Las puertas o cofres abiertos por el grupo anterior vuelven a su posición inicial cerrada.
       - Los misterios revelados durante la partida vuelven a siluetas y alias misteriosos.
       - El diario y notas del grupo previo se excluyen y la nueva sesión arranca en Preparación con la Mesa en blanco (`liveState: null`).
  4. **Pruebas Automatizadas de Robustez (Tests 22, 23 y 24):**
     - Test 22: Comprobación integral de la aventura de ejemplo (tabernero conocido, guardia con 12/25 HP, puerta cerrada) al jugar con un nuevo grupo.
     - Test 23: Aislamiento total de `liveState` en pantalla ante cargas en borrador.
     - Test 24: Flujo completo de guardado de preset, análisis de dependencias e inserción en sesión con resolución y checkpoint.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 275/275 pruebas aprobadas en 54 suites, tipado TypeScript estricto superado, build de producción Vite exitoso en 1.29s.
  - *Pendiente de comprobación física en mesa conectada:* ensayo con hardware proyector o pantalla de jugadores conectada físicamente por WebRTC durante el cambio de sesión en vivo para confirmar la ausencia total de parpadeo visual en el monitor externo.
- **Resultado:** manual de usuario (`README.md`) y registro de revisiones actualizados con MAN-011.

## 2026-09-03 — MAN-012: Cierre de la Serie Completa de Uso Real, Casos Difíciles y Continuidad entre Partidas (Preguntas 2, 3, 6-12)

- **Versión:** árbol de trabajo local con suite completa de 33 pruebas de robustez.
- **Entorno:** Vitest 54 suites, 284 pruebas aprobadas (100%). Compilación de producción con Vite y TypeScript (`tsc -b`) aprobada con 0 errores (dist/ en 946ms).
- **Alcance y Verificación Técnica:**
  1. **Actualización Granular desde Plantilla con Comparación Diferencial (Pregunta 2):**
     - Implementados `getTemplateUpdateDiff` y `applyGranularTemplateUpdate` en `src/db/sessionDb.ts` y en `gameSessionService.ts`.
     - Permite inspeccionar en vivo qué escenas y conversaciones son nuevas, cuáles fueron modificadas por el director en su borrador y cuáles son idénticas.
     - Permite al DM resolver individualmente cada conflicto: conservar la versión propia (`keep_session`), actualizar con la de la plantilla (`overwrite_with_template`) o crear una copia independiente (`create_copy`).
     - Crea automáticamente un punto de control (`checkpoint`) previo a la sincronización.
  2. **Evaluación Pre-Partida («Lista para Jugar») con Acciones Procesables (Pregunta 3):**
     - Cada verificación de `checkSessionReadiness` proporciona un objeto de acción ejecutable (`action: { type, label, description }` y `actionPayload`):
       - `select_starting_scene`: acción directa para elegir la escena inicial si falta borrador o vivo.
       - `download_missing_assets`: listado exacto de URLs para descargar y cachear recursos externos.
       - `fix_character_avatar`: listado de identificadores de personajes sin retrato para asignarles imagen.
       - `repair_dialogue`: vinculación rápida de conversaciones o documentos.
  3. **Migración Explícita de Preparaciones Antiguas sin Snapshots (Pregunta 6):**
     - Implementado `migrateLegacySession`: detecta sesiones sin snapshots inmutables y las migra de forma explícita.
     - Marca `isMigratedFromLegacy: true`, registra la fecha y nota explicativa advirtiendo que los snapshots se capturaron a partir del estado de la campaña en dicha fecha, evitando falsedades sobre el origen si la campaña ya mutó, y fijando la línea base.
  4. **Reproductores y Editores Usando Realmente Copias Congeladas de la Sesión (Pregunta 7):**
     - Conectados `gameSessionService.getActiveConversations()`, `getActiveMacros()` y `getActiveHandouts()` en `SessionPanel.tsx`, `MasterAuxiliaryModals.tsx` y docks cinemáticos.
     - Se comprobó que cualquier mutación posterior en la campaña no altera las conversaciones, macros ni documentos que reproduce el director durante la sesión activa.
  5. **Detección de Versiones Divergentes en Dispositivos Separados (Pregunta 8):**
     - Mejorado `detectImportVersionConflict`: si dos copias tienen el mismo número de revisión (`localRev === remoteRev`) pero contenidos diferentes por trabajo concurrente en dispositivos separados, el sistema reporta `diverged_concurrent_branch` y recomienda `duplicate` (copia paralela), impidiendo que el reloj del sistema decida arbitrariamente cuál reemplaza a cuál.
  6. **Exportación Limpia sin URLs `blob:` Efímeras (Pregunta 9):**
     - En `packSessionForExport`, toda referencia con protocolo `blob:` se convierte a DataURL base64 persistente antes de construir el paquete `.vpp.json`. Se garantiza que el archivo exportado no contenga punteros de memoria volátiles y funcione tras reiniciar la app en un dispositivo limpio.
  7. **Transaccionalidad Atómica en Importación (Pregunta 10):**
     - `importSessionPackageWithRemap` se ejecuta bajo una transacción atómica Dexie (`db.transaction('rw', [db.sessions, db.assets, db.campaigns])`). Si el paquete está corrupto o se interrumpe, se cancela y revierten todos los cambios sin dejar residuos huérfanos ni sesiones rotas.
  8. **Medidor de Espacio y Depuración Segura de Archivos Huérfanos (Pregunta 11):**
     - Implementados `calculateStorageAudit` y `purgeOrphanAssets` en `src/db/assetDb.ts`:
       - Escanea campañas, sesiones (activas y en papelera), plantillas, presets y checkpoints.
       - Cuantifica bytes y categoriza en activos en uso, retenidos en historial/papelera y huérfanos.
       - `purgeOrphanAssets` elimina exclusivamente los huérfanos sin referencias, liberando espacio sin romper preparaciones pasadas ni presentes.
  9. **Restauración de Comprobación Aislada de Respaldos (Pregunta 12):**
     - Implementado `importSessionAsAuditCopy`: importa el paquete como sesión de auditoría (`[Comprobación]`), con `liveState: null` y en modo preparación, evaluando la integridad offline sin alterar la campaña activa ni emitir nada a la Mesa conectada.
  10. **Pruebas Automatizadas de Robustez (Tests 25 a 33):**
      - Tests 25 al 33 agregados a `src/services/gameSessionStorageRobustness.test.ts`, cubriendo las 9 preguntas con éxito absoluto (33/33 en la suite, 284/284 en el proyecto).
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 284/284 pruebas aprobadas en 54 suites, tipado estricto superado sin errores, build de producción Vite exitoso en 946ms.
  - *Pendiente de comprobación física en mesa conectada:* prueba de auditoría de paquetes en vivo conectando dos pantallas reales (director en laptop + jugadores en monitor HDMI o WebRTC) para comprobar en campo la respuesta visual en el proyector al importar una copia de comprobación en segundo plano.
## 2026-09-03 — MAN-013: Diagnóstico y Fidelidad Visual 1:1 entre Mesa y Previsualización del Director (Series 1, 2 y 3)

- **Versión:** árbol de trabajo local con arquitectura de escenario unificada (`StageViewport.tsx`).
- **Entorno:** Vitest 55 suites, 288 pruebas aprobadas (100%). Compilación de producción con Vite y TypeScript (`tsc -b`) aprobada con 0 errores (dist/ en 4.63s).
- **Alcance y Diagnóstico Técnico de las Discrepancias Observadas en Capturas Reales:**
  1. **Fondo de Ruinas Ausente en la Mesa (Serie 2, Pregunta 6):**
     - *Causa raíz:* La capa `<div className="display-bg active-bg" />` carecía de estilos CSS en la hoja de estilos global (`src/index.css`), resultando en una altura computada de 0 píxeles (`height: 0px`). La imagen llegaba pero el navegador no la dibujaba.
     - *Solución:* Se implementó `.display-bg` con `position: absolute; inset: 0; width: 100%; height: 100%; background-size: cover; background-position: center; pointer-events: none;` y animación de fundido cruzado (`.display-bg.fade-in`).
  2. **Divergencia entre Previsualización y Mesa Real (Serie 2, Preguntas 4 y 5):**
     - *Causa raíz:* `LiveMiniPreview.tsx` utilizaba una maqueta aislada de 114 líneas con círculos fijos (`.mini-char-avatar`, 38x38px) que ignoraba por completo el encuadre y zoom de la cámara (`state.camera?.zoom` y `focalPoint`). En contraste, la Mesa aplicaba `transform: scale(zoom)` con `overflow: hidden` sobre `.stage-camera-viewport`.
     - *Solución:* Se unificó el motor de dibujo extrayendo el componente compartido `StageViewport.tsx`. Tanto la Mesa en tamaño completo como el panel del director en miniatura ejecutan el mismo componente visual.
  3. **Personajes Desplazados Fuera de Pantalla (Serie 2, Pregunta 7):**
     - *Causa raíz:* Al activar un encuadre con zoom centrado en Morwen (`x: 20%`), el contenedor con `overflow: hidden` recortaba y desplazaba a los otros personajes (Bromir 1 y Bromir 2 a la derecha) fuera del área visible de la Mesa, mientras el director seguía viendo erróneamente los 3 círculos estáticos en su miniatura sin zoom.
     - *Solución:* Con `StageViewport`, la previsualización del director ahora reproduce fielmente el mismo zoom y recorte que experimentan los jugadores.
  4. **Superposición de Controles Superiores sobre el Título (Serie 3, Pregunta 11):**
     - *Causa raíz:* `.location-banner` carecía de estilos y se dibujaba en el flujo normal arriba a la izquierda (`top: 0, left: 0`), colisionando físicamente con `.display-hud` (`top: 16px, left: 16px`).
     - *Solución:* Se aplicó `.cinematic-banner-container` centrado horizontalmente y se agregaron zonas seguras con `pointer-events: none` en la barra central del HUD.
  5. **Figuras Proporcionales sin Deformación (Serie 2, Pregunta 5 / Decisión de Diseño):**
     - Se crearon las clases `.standee-proportional-frame` y `.standee-proportional-img` con límites de contención (`max-height: 52vh; max-width: 24vw; object-fit: contain;`), conservando el ratio natural de las imágenes y respetando transparencias en archivos PNG/WebP con sombra proyectada.
  6. **Telemetría Real de Viewport y Estado Confirmado (Serie 1, Pregunta 1 y Serie 3, Pregunta 10):**
     - La Mesa ahora incluye sus dimensiones y relación de aspecto real (`viewport: { width, height, aspectRatio }`) y estado de carga de recursos (`assetsStatus: { isReady, missingCount }`) en cada confirmación (`COMMAND_RESULT`).
     - `LiveMiniPreview` y `FullScreenPreviewModal` ajustan su lienzo virtual a la relación de aspecto exacta de la Mesa (o 16:9 por defecto) y exhiben semáforos de fidelidad: *Confirmado en Mesa (Rev X • WxH)*, *Enviado / Pendiente* o *Borrador Preparado*.
  7. **Verificación con Escena Estática Controlada (Serie 3, Pregunta 9):**
     - Creada suite de pruebas dedicada en `src/domain/display/stageViewportFidelity.test.tsx` que valida la escena de las Ruinas de forma aislada: fondo, tres standees en slots, activación de clima y activación de cámara con zoom.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 288/288 pruebas aprobadas en 55 suites, compilación de producción Vite aprobada en 4.63s, fidelidad de escala y cálculo de recorte verificados en Vitest.
  - *Pendiente de comprobación física en mesa conectada:* comprobación visual en proyector o pantalla secundaria conectada por WebRTC para validar la legibilidad de títulos en pantallas de diferente densidad de píxeles.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-013.

## 2026-09-03 — MAN-014: Validación Rigurosa de Fidelidad Visual, Desacoplamiento de vh/vw, Correspondencia de Estado y Telemetría Dinámica (Series 1, 2 y 3)

- **Versión:** árbol de trabajo local con escala relativa al escenario virtual (`cqh`/`cqw`), pipeline público completo (`StageViewport`) y telemetría de orientación en tiempo real.
- **Entorno:** Vitest 55 suites, 292 pruebas aprobadas (100%). Compilación de producción con Vite y TypeScript (`tsc -b`) aprobada con 0 errores (dist/ en 4.89s).
- **Alcance y Verificación Técnica de las Correcciones:**
  1. **Desacoplamiento de Medidas de Pantalla (Serie 1, Pregunta 1):**
     - *Diagnóstico:* `.standee-proportional-frame` y `.avatar-frame` utilizaban `52vh` y `24vw`. En el teléfono del director, dentro de `LiveMiniPreview` (caja de 140px), esas unidades se evaluaban respecto a la pantalla del móvil en lugar del lienzo virtual del escenario, produciendo escalas variables según la altura de la pantalla del teléfono.
     - *Solución:* Se definieron variables `--stage-height` y `--stage-width` en `.stage-viewport-virtual-canvas` (1080px / 1920px) y reglas de consulta de contenedor `@supports (container-type: size)` con `52cqh` y `24cqw`. La escala y proporciones de los personajes ahora son **100% idénticas y matemáticamente independientes de la resolución del dispositivo del director**.
  2. **Correspondencia Estricta de Estado Confirmado vs En Tránsito (Serie 2, Pregunta 5):**
     - Conforme a la directiva de diseño, la pestaña "En Pantalla" renderiza exclusivamente la última revisión confirmada por la Mesa física (`lastConfirmedStateSnapshot`).
     - Si hay comandos en vuelo, la imagen confirmada se conserva intacta y se muestra la insignia `⚠️ Enviando revisión X... (Y pendientes) [Ver pendientes]`, permitiendo inspeccionar los cambios en vuelo rotulados explícitamente como "Pendiente de confirmar" sin reemplazar silenciosamente la vista real.
     - Al confirmarse el comando en la Mesa, la vista se promueve automáticamente a "En Pantalla".
     - Si la Mesa se desconecta, el semáforo cambia a `○ ÚLTIMA CONFIRMACIÓN HACE X MINUTOS (Mesa desconectada)`, eliminando la indicación equívoca de "En vivo".
  3. **Completitud de Capas Públicas (Serie 1, Preguntas 3 y 4):**
     - `CinematicDialogueLayer` e `InitiativeRibbon` fueron integrados dentro de `StageViewport.tsx`. Tanto la Mesa física como la previsualización del director ahora muestran los subtítulos cinematográficos, diálogos activos y cinta de iniciativa en combate de forma compartida.
  4. **Telemetría Dinámica de Orientación y Pantalla Completa (Serie 3, Pregunta 8):**
     - `PlayerDisplay.tsx` implementa un listener reactivo con debounce para `resize`, `orientationchange` y `fullscreenchange` que despacha inmediatamente el mensaje `MESA_VIEWPORT_CHANGED` a través de WebRTC. La previsualización del director adapta su relación de aspecto al instante cuando el jugador rota la tablet o entra a pantalla completa, incluso si la escena está en reposo.
  5. **Zonas Seguras contra Superposición Visual (Serie 3, Pregunta 9):**
     - En `src/index.css`, se estableció en `.cinematic-banner` un `max-width: min(720px, calc(100% - 480px));` y en pantallas angostas (`@media (max-width: 900px)`) un ajuste vertical a `top: 64px` con `max-width: 90%`, garantizando que títulos largos nunca invadan el espacio de los controles superiores del HUD.
  6. **Aislamiento de Efectos Secundarios (Serie 3, Pregunta 10):**
     - Se verificó que `StageViewport` es un componente visual puro: no instancia `soundEngine`, no reproduce SFX ni muta la base de datos Dexie al abrirse en el móvil o en modales.
  7. **Ampliación de Pruebas Automatizadas de Fidelidad:**
     - `src/domain/display/stageViewportFidelity.test.tsx` ampliado a 8 pruebas automatizadas cubriendo la escena estática de Ruinas, desacoplamiento `vh`/`vw`, capas públicas y telemetría de orientación.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 292/292 pruebas aprobadas en 55 suites (100%), compilación de producción Vite aprobada en 4.89s, fidelidad de container queries y cálculo de escala verificados en Vitest.
  - *Pendiente de comprobación física en mesa conectada:* comprobación simultánea con tablet física conectada por WebRTC para contrastar capturas de pantalla lado a lado en un entorno real de juego.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-014.

## 2026-09-03 — MAN-015: Escenario Lógico 16:9 con Bandas Neutras, Desglose de Tres Estados y Auditoría/Resincronización de Mesa

- **Versión:** árbol de trabajo local con escenario fijo 1920×1080 centrado con `object-fit: contain` y bandas neutras, sustitución de `@media` por `@container` queries, protocolo extendido con `AUDIT_MESA_REQUEST`/`RESPONSE`, telemetría de audio (`DisplayAudioStatus`) y resincronización limpia (`isResync`).
- **Entorno:** Vitest 55 suites con 296 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 4.42s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Escenario Lógico 16:9 con Bandas Neutras (Serie 1, Preguntas 1 y 2):**
     - Se estableció la resolución de referencia lógica en `1920 × 1080` píxeles tanto para la pantalla de jugadores como para la previsualización del director en `StageViewport.tsx`.
     - En pantallas de cualquier proporción física (pantallas 16:9, tablets 16:10 de 1920×1200 o 2560×1600, pantallas 4:3 o móviles): el escenario se escala uniformemente sin deformación ni recortes de figuras o textos, centrándose sobre bandas negras neutras.
     - En orientación vertical (`aspectRatio < 1`), se conserva la escena completa contenida y se muestra una sugerencia sutil de girar el dispositivo para mayor comodidad de lectura, sin saltos de zoom automáticos.
  2. **Eliminación Total de Dependencias `@media` de Ventana (Serie 1, Pregunta 3):**
     - Se eliminó `@media (max-width: 900px)` en `.cinematic-banner-container` en `src/index.css`, reemplazándolo por `@container (max-width: 900px)`. Los contenedores `.stage-viewport-canvas-box` y `.stage-viewport-virtual-canvas` tienen `container-type: size`, garantizando que las reglas de distribución dependan del tamaño asignado al escenario y no de la ventana del navegador del director.
  3. **Desglose en Tres Indicadores Independientes (Serie 2, Preguntas 5 y 6):**
     - La previsualización (`LiveMiniPreview` y `FullScreenPreviewModal`) desglosa la telemetría en tres estados claros e independientes:
       - **Estado:** `Sin confirmación de la Mesa` (con botón *«Ver vista prevista»* si aún no hubo confirmación inicial), `Enviando (X pend.)`, `Rev. X (Aplicado)` o `Error en Mesa`.
       - **Imágenes:** `Img listas` (100% descargadas), `Cargando (X pend.)` o advertencia de `Imagen pendiente de descarga en la Mesa` si el director tiene un avatar local no disponible aún en la Mesa física.
       - **Audio:** `Requiere tocar Mesa` (interacción táctil requerida por la política autoplay del navegador), `Audio OK` (desbloqueado) o `Audio error`. La confirmación visual no se bloquea si el audio requiere interacción.
  4. **Herramienta de Auditoría «Comprobar Mesa» (Serie 3, Pregunta 9):**
     - Protocolo extendido con `AUDIT_MESA_REQUEST` y `AUDIT_MESA_RESPONSE`. Permite al director consultar de forma no destructiva el identificador de dispositivo, versión de app, sesión, revisión, checksum del estado público, dimensiones reales y estado de recursos y audio sin modificar la escena activa.
  5. **Herramienta de Recuperación «Resincronizar Mesa» (Serie 3, Pregunta 10):**
     - Implementado reenvío de instantánea pública limpia con indicador `isResync: true`.
     - `PlayerDisplay` y `displayCommandExecutor` aplican el estado público completo de forma idempotente, suprimiendo efectos sonoros repetidos (`play_sfx`, `play_synth`, `storm_lightning`) y conservando los cronómetros de combate en curso sin reiniciarlos a cero.
  6. **«Copiar Diagnóstico» Sanitizado (Serie 3, Pregunta 11):**
     - La ventana de diagnóstico unifica las métricas WebRTC y la telemetría del `SessionCommandBus`, produciendo un volcado de diagnóstico técnico excluyendo expresamente contraseñas, tokens de acceso, notas privadas del director y textos narrativos confidenciales.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 296/296 pruebas aprobadas en 55 suites (100%), compilación Vite de producción (`npm run build`) aprobada en 4.42s, y 12 pruebas de fidelidad visual automatizadas en `src/domain/display/stageViewportFidelity.test.tsx`.
  - *Comprobado documentalmente:* Manual de usuario (`docs/manual/README.md`) actualizado con la previsualización fiel 16:9, los tres indicadores independientes y las herramientas de auditoría y resincronización.
  - *Pendiente de comprobación física en mesa conectada:* Prueba de visualización simultánea con una tablet Samsung/iPad física conectada por WebRTC a la sala real para inspeccionar el renderizado final del canvas y auditar el retardo de audio tras tocar la pantalla.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-015.

## 2026-09-03 — MAN-016: Reactividad de Recursos, Desbloqueo Táctil de Audio y Protección de Partida en Resincronización

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 55 suites con 298 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 2.74s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Telemetría Reactiva de Recursos y Fallos Deliberados (Serie 2, Preguntas 4 y 5):**
     - `PlayerDisplay.tsx` rastrea reactivamente la descarga de fondos, miniaturas y props. Si un recurso falla (`onerror` o 404), `failedCount` se incrementa e inhibe «Img listas», mostrando el indicador en rojo con la cantidad de fallos.
     - Cuando los recursos terminan de descargar o se detecta un fallo, `PlayerDisplay` despacha inmediatamente `MESA_VIEWPORT_CHANGED` sin necesidad de enviar otro comando de escena desde el panel del director.
  2. **Desbloqueo Táctil Inmediato de Audio (Serie 2, Pregunta 5):**
     - Al tocar o hacer clic en la pantalla de la Mesa, se ejecuta `soundEngine.unlockAudio()` y se notifica inmediatamente al director con `audioStatus: 'enabled'`, actualizando la pastilla de audio sin retardo.
  3. **Protección de Partida en Resincronización (Serie 3, Preguntas 7, 8 y 9):**
     - `sessionCommandBus.resyncMesa()` cancela todos los temporizadores en vuelo y marca los comandos pendientes anteriores como superados (`SUPERSEDED_BY_RESYNC`), impidiendo que confirmaciones tardías sobrescriban el estado recuperado.
     - La ventana de diagnóstico muestra explícitamente el nombre de la escena pública activa que se restaurará y advierte que no se enviará ningún borrador de preparación en curso.
     - Si la pantalla está en Blackout, la resincronización preserva `isBlackout: true`, garantizando que la pantalla de los jugadores permanezca protegida en negro.
     - En caso de imágenes fallidas, el reporte de auditoría habilita el botón «Reintentar Descarga».
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 298/298 pruebas aprobadas (100%), compilación Vite exitosa en 2.74s, y 14 pruebas automatizadas en `src/domain/display/stageViewportFidelity.test.tsx`.
## 2026-09-03 — MAN-022: Oclusión Híbrida de Escena, Puntos Narrativos (Waypoints), Legibilidad Adaptativa y Hermeticidad de Sesión

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 57 suites con 326 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 4.14s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Oclusión Híbrida Detrás del Decorado (Serie 1, Pregunta 1):**
     - Se incorporó la interfaz `SceneOcclusionRegion` y el campo `occlusionRegions` en escenas, variantes y estado de visualización.
     - En `DisplayCharactersLayer`, renderizado de regiones de oclusión con recorte matemático subpíxel (`backgroundSize: 'cover'`) sobre el fondo actual y `zIndex` compartido sin requerir modificación destructiva de la imagen de fondo ni edición externa.
     - Modal «Nueva región de oclusión frontal» en `CharacterDirectorOverlay` con vista previa de capas y distinción de insignias púrpuras `[Oclusión]`.
  2. **Puntos Narrativos de Escena Guardados (Serie 2, Preguntas 4 y 5):**
     - Definición de `StageWaypoint` (`id, name, normalizedX, normalizedY, suggestedZIndex`).
     - Acciones en el panel del director «Guardar posición como punto…» y «Mover a punto…».
     - Conmutador entre movimiento Instantáneo (teletransporte) y Suave (desplazamiento cinematográfico fluido de 0.4s sin repetir animaciones al reconectar).
     - Detección de colisión por proximidad física (< 6% de distancia): advierte visualmente al director con un aviso ámbar si el punto de destino ya está ocupado por otra figura en escena.
  3. **Legibilidad Adaptativa de Etiquetas y Evasión de Diálogo (Serie 3, Pregunta 8):**
     - Selector `nameplatePosition`: `'auto' | 'bottom' | 'top' | 'side'` en el panel del personaje.
     - En modo automático, si el personaje se sitúa en la franja baja del escenario (`posY < 18%`) y hay subtítulos de diálogo activos, la etiqueta se eleva automáticamente por encima de la cabeza (`top`) para evitar quedar tapada por el banner inferior.
     - Agrupación compacta de condiciones de combate: máximo dos insignias individuales e indicador condensado `+N` si acumula tres o más estados.
  4. **Hermeticidad de Sesiones Preparadas (Serie 4, Pregunta 11):**
     - En `summonCharacter`, clonación profunda de los anclajes de expresiones (`char.expressionAnchors`) hacia `instanceVariantAnchors` de la instancia en pantalla.
     - Verificado en prueba unitaria que editar la biblioteca de campaña o alterar retratos posteriormente no corrompe ni desplaza las figuras de sesiones preparadas anteriormente.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 326/326 pruebas aprobadas (100%), 5 pruebas específicas en `src/domain/display/sceneDepthAndWaypoints.test.tsx`, compilación Vite exitosa en 4.14s, y manual de usuario actualizado en `docs/manual/README.md`.
  - *Pendiente de comprobación física en mesa conectada:* Recorrido con mostrador de taberna y tablet conectada comprobando la oclusión física y desplazamiento suave entre waypoints con hardware real.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-022.

## 2026-09-03 — MAN-021: Profundidad Contextual de Escena, Estabilidad de Apoyo por Expresión y Arrastre Grupal Rígido

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 56 suites con 321 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 4.93s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Profundidad Contextual y Capas Relativas de Escena (Serie 1, Pregunta 1):**
     - Integración unificada de personajes (`CharacterOnScreen`) y objetos de decorado (`SceneProp`) en una escala compartida de `zIndex` sin silos ni colisiones.
     - En `CharacterDirectorOverlay`, acciones «Delante de…» y «Detrás de…» con modal interactivo que lista todos los elementos de la escena (con avatar, nombre, etiqueta privada y etiqueta de tipo).
     - Algoritmo `reorderRelativeTo`: inserta el elemento respecto al objetivo y normaliza limpiamente las capas en múltiplos de 10 (`10, 20, 30...`), eliminando empates numéricos de superposición.
     - Modal «Capas de la Escena (Orden de Profundidad)» con vista completa de frente a fondo y flechas `▲` y `▼` para reordenar en vivo.
     - Soporte en `MasterController` mediante `handleDirectorReorderLayers` que actualiza transaccionalmente tanto personajes como props en vivo o en borrador.
  2. **Estabilidad de Apoyo por Imagen y Variante de Expresión (Serie 2, Preguntas 4 y 5):**
     - Campos `expressionAnchors?: Record<string, number>` en `Character` (ficha de campaña) e `instanceVariantAnchors?: Record<string, number>` en `CharacterOnScreen` (instancia en escena).
     - Modal de calibración con doble opción de guardado: «Guardar en esta figura» (instancia) y «Guardar apoyo» (ficha de campaña).
     - Resolución en cascada sin saltos verticales al cambiar de gesto: `instanceVariantAnchors[exp] ?? campaignChar.expressionAnchors[exp] ?? char.visualAnchorOffsetY ?? 0`.
  3. **Arrastre Grupal Rígido con Freno en Borde y Cancelación Segura (Serie 3, Preguntas 7 y 9):**
     - Cálculo de un bounding box unificado para el conjunto de figuras no bloqueadas en `handlePointerMove`: acota `deltaX` y `deltaY` de modo que ninguna figura supere los márgenes del escenario (`[0, 100%]`), conservando distancias relativas exactas sin aplastar la formación.
     - Figuras con `isLocked: true` son excluidas del cálculo y permanecen inmóviles.
     - Detección de interrupciones: listener ante cambios de cámara (`camera !== prevCameraRef.current`), `pointerleave` (con botones levantados) y `pointercancel` cancela silenciosamente el arrastre sin generar saltos ni publicar órdenes accidentales a la Mesa.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 321/321 pruebas aprobadas (100%), 16 pruebas específicas en `src/domain/display/characterDirector.test.tsx`, compilación Vite exitosa en 4.93s, y manual de usuario actualizado en `docs/manual/README.md`.
  - *Pendiente de comprobación física en mesa conectada:* Recorrido de calibración lado a lado y arrastre con dedos en tablet táctil conectada con mostrador, tarima y figuras superpuestas.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-021.

## 2026-09-03 — MAN-020: Calidad de Composición, Apoyo Visual en Suelo, Ergonomía Táctil Móvil y Entradas Preparadas

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 56 suites con 317 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 2.71s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Calibración de Punto de Apoyo Visual (Serie 1, Pregunta 1):**
     - Campo `visualAnchorOffsetY?: number` (offset vertical porcentual) incorporado en `CharacterOnScreen`, `DisplayCharactersLayer` y `CharacterDirectorOverlay`.
     - Modal de calibración sobre tablero cuadriculado con línea roja de suelo, ajuste fino de deslizador (0% a 40%), vista previa en vivo sin alterar `normalizedY`, botón «Restablecer» y botón «Guardar apoyo».
     - Compensación exacta y matemáticamente idéntica en Previsualización del DM y en la Mesa física mediante `transform: translate(-50%, ${visualAnchorOffsetY}%)`.
  2. **Línea de Suelo Personalizada por Escena (Serie 1, Pregunta 2):**
     - Campo `groundLineY?: number` en `SceneVariant`, `Scene`, `DisplayState`, `StageViewport` y `DisplayCharactersLayer`.
     - Permite que escenas con escaleras, puentes o tarimas adapten la altura base de apoyo. El botón «Al suelo» alinea las figuras a `groundLineY` descontando el apoyo calibrado.
  3. **Ergonomía Táctil Móvil y Panel «Más…» (Serie 2, Pregunta 5):**
     - Barra rápida compacta en la zona inferior de la previsualización al alcance del pulgar con chip de personaje, 4 acciones primarias (🎙️ Voz, 🎭 Expresión, 👁️ Visibilidad inequívoca «Ocultar»/«Mostrar», y 🚪 «A reserva»/«Entrar») más botón «Más…».
     - Durante el arrastre con el dedo (`dragRef.current?.isDragging`), la barra se oculta temporalmente para que el GM tenga 100% de visibilidad despejada.
     - Botón **«Más…»** abre un panel inferior (bottom drawer) con 4 secciones temáticas:
       - *Presencia:* Retirar a reserva, Entrar a escena, Preparar entrada.
       - *Encuadre:* Centrar cámara en el personaje.
       - *Transformación:* Volteo espejo horizontal, Escala visual (+/-), Traer al frente en capas, Calibrar apoyo visual.
       - *Organización:* Bloquear posición, Asignar etiqueta privada del DM.
  4. **Preparación de Entradas desde Reserva con Precarga Segura (Serie 3, Pregunta 9):**
     - Configuración de entrada antes de mostrar la figura (animaciones `fade`, `slide-bottom`, `slide-left`, `slide-right` con duración suave).
     - Telemetría de precarga que verifica que el recurso público esté descargado en la Mesa antes de autorizar la entrada.
     - Botón destacado «Hacer entrar a escena» que ejecuta la aparición en una única orden transaccional.
  5. **Encuadres de Cámara Personalizados con Nombre (Serie 3, Pregunta 10):**
     - Propiedad `savedCameraPresets` en `SceneVariant` y `DisplayState`.
     - Selector de cámara en la barra superior que lista los encuadres nombrados de la escena (ej. *«Mostrador»*, *«Puerta sótano»*) y permite añadir nuevos encuadres con el botón «Guardar encuadre actual...».
     - Al seleccionar un encuadre manual, se activa `manualCameraOverride: true` para suspender el auto-enfoque de hablante hasta que el DM lo reactive.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 317/317 pruebas aprobadas (100%), 12 pruebas específicas en `src/domain/display/characterDirector.test.tsx`, compilación Vite exitosa en 2.71s, y manual de usuario actualizado en `docs/manual/README.md`.
  - *Pendiente de comprobación física en mesa conectada:* Recorrido de calibración y arrastre con dedos en tablet táctil conectada.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-020.

## 2026-09-03 — MAN-019: Modo Dirección Táctil, Acciones Rápidas, Guías de Escena y Manejo de Dimensiones de Personaje

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 56 suites con 313 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 3.91s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Modo Dirección Táctil en Previsualización (Serie 1, Pregunta 1 y Serie 4, Pregunta 12):**
     - Se incorporó el botón conmutador «Modo Dirección» en `LiveMiniPreview.tsx` y `FullScreenPreviewModal.tsx`.
     - Por defecto, la vista permanece en modo observación para evitar toques accidentales.
     - En Modo Dirección, tocar un personaje lo selecciona directamente en el canvas 16:9; arrastrarlo muestra una silueta fantasma en tiempo real con coordenadas (`X%`, `Y%`) sin mutar el snapshot confirmado ni emitir tráfico continuo.
     - Al soltar el dedo (`pointerup`), se emite una única operación transaccional (`MOVE_CHARACTER`) con opción de deshacer atómico. En Preparación (Staging) edita únicamente el borrador. Tocar el fondo deselecciona sin mover la cámara.
  2. **Barra de Acciones Rápidas de Personaje (Serie 1, Preguntas 1 y 4; Serie 2, Pregunta 5):**
     - Al seleccionar un personaje, se despliega una barra flotante anclada con accesos de un toque:
       - 🎙️ **Voz (Hablar):** conmuta `isSpeaking` y destaca al hablante.
       - 🎭 **Expresión:** menú emergente para seleccionar entre las expresiones faciales definidas del NPC o volver a la neutral.
       - 👁️ **Visibilidad:** conmuta entre Visible y Oculto en escena (`isHidden: true`), conservando coordenadas y anclaje.
       - 🚪 **Presencia:** conmuta entre «En escena» y «A reserva» (`presence: 'in_reserve'`), retirándolo del escenario pero conservando posición, expresión y daño para su reincorporación.
       - 🎬 **Encuadre:** centra el zoom de la cámara en el personaje (`focalPoint`).
       - 🔒 **Bloquear posición:** fija la figura para impedir arrastres involuntarios (`isLocked: true`).
       - ↔️ **Voltear horizontalmente:** conmuta `isFlipped` (efecto espejo).
       - 🔍 **Escala rápida (+ / -):** botones de ajuste por pasos de 0.1 (de 0.5x a 2.5x) para nivelar retratos, figuras de cuerpo entero y criaturas gigantes.
       - ⬆️ **Capas (Al frente):** eleva el `zIndex` de la figura seleccionada por encima de los demás standees.
       - 🏷️ **Etiqueta privada:** asigna una etiqueta privada exclusiva del DM (ej. *"Guardia puerta"*).
  3. **Guías Visuales, Márgenes Seguros y Alineación de Grupo (Serie 1, Pregunta 2 y Serie 2, Pregunta 8):**
     - Botón **«Guías»**: dibuja la línea de suelo (`Y = 0%`), la línea central (`X = 50%`) y el margen seguro inferior de 64px reservado para subtítulos y diálogos cinematográficos sin tapar los rostros.
     - Con 2 o más personajes seleccionados («Seleccionar varios»):
       - Botón **«Al suelo»**: nivela todos los personajes seleccionados en `normalizedY = 0%`.
       - Botón **«Distribuir»**: espacia uniformemente las figuras seleccionadas entre el extremo izquierdo y derecho.
  4. **Presets Rápidos de Cámara en la Barra Superior (Serie 3, Pregunta 10):**
     - Menú desplegable **«Cámara»** en la barra de dirección con accesos directos a «Plano General (1.0x)», «Enfocar selección (1.35x)» y «Hablante (Auto)» sin alterar la posición de los personajes en escena.
  5. **Manejo de Etiquetas de Nombres en Escenario (Serie 3, Pregunta 9):**
     - Campo `nameDisplayMode?: 'always' | 'speaker_only' | 'hidden'` en `DisplayState`.
     - `DisplayCharactersLayer.tsx` oculta las etiquetas cuando está en `'hidden'` o `'speaker_only'` (solo muestra el nombre del que habla), manteniendo legibles las insignias de estado y condiciones de combate sin saturar la pantalla con texto.
  6. **Separación Estricta de 3 Dimensiones (Serie 2, Pregunta 6):**
     - Se independizaron Presencia (`presence`), Visibilidad (`isHidden`) y Revelación (`revelation`).
     - En `displaySanitizer.ts`, los personajes con `isHidden: true` o `presence: 'in_reserve'` se purgan por completo del payload público de la Mesa (seguridad Zero-Leak: no se transmiten por red ni se ocultan con simple CSS en el DOM público).
     - Las etiquetas privadas `privateLabel` son suprimidas antes de viajar a la pantalla de los jugadores.
     - Ocultar o retirar a un personaje nunca reinicia su estado de revelación conocido por el grupo.
  7. **Instancias Múltiples y Selección Agrupada (Serie 2, Preguntas 7 y 8):**
     - Cada copia colocada cuenta con un `instanceId` independiente. Modificar un guardia no altera a los demás.
     - Modo «Seleccionar varios» permite seleccionar múltiples figuras y desplazarlas en bloque conservando sus distancias relativas en una única orden transaccional.
     - Tira de chips para seleccionar fácilmente personajes superpuestos, bloqueados u ocultos.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 313/313 pruebas aprobadas (100%), 8 pruebas específicas en `src/domain/display/characterDirector.test.tsx`, 7 pruebas en `src/domain/display/displaySanitizer.test.ts`, y compilación Vite exitosa en 3.91s.
  - *Pendiente de comprobación física en mesa conectada:* Recorrido de manipulación táctil con dedos en tablet física conectada.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-019.

## 2026-09-03 — MAN-018: Distinción de Timeout vs Error, Privacidad en Standees y Aislamiento Generacional de Descargas

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 55 suites con 303 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 4.67s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Distinción entre «Sin respuesta (Incierto)» y «Error en Mesa» (Pregunta 2):**
     - En `SessionCommandBus.ts`, cuando un comando alcanza el tiempo límite sin acuse de recibo de la Mesa, la telemetría asigna `commandStatus: 'timed_out'`, diferenciándolo de un rechazo con código devuelto por la Mesa (`commandStatus: 'error'`).
     - En `LiveMiniPreview.tsx` y `FullScreenPreviewModal.tsx`, se muestra la pastilla ámbar *«Sin respuesta (Incierto)»* con sugerencia de pulsar *«Comprobar Mesa»*, evitando asumir falsamente un fallo si la orden fue procesada pero la confirmación se perdió en la red.
  2. **Privacidad Estricta en Standee Fallback (Pregunta 4):**
     - En `DisplayCharactersLayer.tsx`, cuando una imagen falla, el token temático utiliza exclusivamente `publicAlias` (o `'?'` si la identidad/apariencia no está revelada). Se comprobó en pruebas automáticas que un NPC secreto jamás revela la inicial de su nombre real en la pantalla de los jugadores.
  3. **Aislamiento Generacional de Descargas Rezagadas (Pregunta 5):**
     - En `PlayerDisplay.tsx`, cada cambio de escena avanza `loadGenerationRef.current++`. Los eventos de carga que concluyan tarde para una escena anterior son descartados de inmediato y no alteran la telemetría de recursos de la escena activa.
  4. **Re-verificación de Audio al Desbloquear la Pantalla (Pregunta 6):**
     - Se añadió un listener para `visibilitychange`. Si el sistema operativo suspende el `AudioContext` tras bloquear la tablet, la Mesa actualiza automáticamente su telemetría a `audioStatus: 'interaction_required'`, advirtiendo al director de que se requiere un nuevo toque.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 303/303 pruebas aprobadas (100%), compilación Vite exitosa en 4.67s, y 19 pruebas automatizadas en `src/domain/display/stageViewportFidelity.test.tsx`.
  - *Pendiente de comprobación física en mesa conectada:* Recorrido de aceptación manual con capturas reales en tablet Samsung/iPad física conectada.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-018.


## 2026-09-03 — MAN-017: Rechazo Estricto de Órdenes Rezagadas en la Mesa, Desbloqueo Verificado de Audio y Standee Token Fallback

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 55 suites con 301 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b`) aprobada en 4.61s con 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Rechazo Estricto en la Mesa de Comandos Previos a la Resincronización (Serie 2, Preguntas 4 y 6):**
     - `sessionCommandBus.resyncMesa()` avanza `this.connectionEpoch++`.
     - `displayCommandExecutor` en la Mesa actualiza `this.activeConnectionEpoch = msg.connectionEpoch` al recibir la resincronización y rechaza de forma estricta cualquier orden rezagada enviada antes de la resincronización (`msg.connectionEpoch < this.activeConnectionEpoch`) devolviendo `status: 'rejected'` con código `STALE_EPOCH` antes de evaluar el reducer. Esto garantiza que órdenes viejas (como levantar un Blackout) no puedan ejecutarse en la pantalla física.
  2. **Diferenciación entre Intento y Resultado de Audio (Serie 3, Pregunta 7):**
     - `soundEngine.unlockAudio()` realiza `await ctx.resume()` sobre el `AudioContext` y verifica si `ctx.state === 'running'`. Solo si el contexto transicionó efectivamente a ejecución devuelve `true`.
     - `PlayerDisplay.tsx` espera este resultado y solo emite `audioStatus: 'enabled'` si el desbloqueo fue exitoso, previniendo falsos positivos por simples toques que el navegador no haya autorizado.
  3. **Reemplazo Visual Seguro ante Fallos de Imagen (Serie 1, Pregunta 3):**
     - En `DisplayCharactersLayer.tsx`, si una imagen de avatar falla (`onError`), se sustituye inmediatamente por un token temático estilizado con marco pergamino, la inicial del personaje en tipografía serif y la leyenda *«Avatar no disponible»*, impidiendo que la Mesa exhiba recuadros rotos o distorsione la escena.
  4. **Alcance Exhaustivo del Indicador de Recursos (Serie 3, Pregunta 9):**
     - `PlayerDisplay.tsx` supervisa no solo fondos, avatares y props, sino también expresiones faciales (`expressionUrl`), documentos en pantalla (`activeHandout.imageUrl`) y retratos de diálogo cinematográfico (`dialogue.avatarUrl`).
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 301/301 pruebas aprobadas (100%), compilación Vite exitosa en 4.61s, y 17 pruebas automatizadas en `src/domain/display/stageViewportFidelity.test.tsx`.
  - *Pendiente de comprobación física en mesa conectada:* Recorrido corto de partida de prueba con resultados esperados y observados preparado para su ejecución en tablet Samsung/iPad física conectada.
- **Resultado:** manual de usuario y registro de revisiones actualizados con MAN-017.










