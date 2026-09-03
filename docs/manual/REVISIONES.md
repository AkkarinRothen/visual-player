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
