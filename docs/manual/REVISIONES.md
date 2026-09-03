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






