# Revisiones del manual

Este registro documenta la revisión del manual. No reemplaza el historial de cambios de la aplicación.

## 2026-09-04 — MAN-047: Soporte de Fondos de Video con Optimización y Sincronización Resiliente

- **Problema y requerimiento:** necesidad de admitir fondos animados de video (ej. cascadas, lluvia, fuego, ambientaciones cinemáticas en bucle) en el Escenario de Visual Player, asegurando que se adapten a la pantalla 16:9 sin pérdida de calidad y sin congelar ni mostrar pantallas negras en la Mesa de los jugadores.
- **Implementación y arquitectura:**
  1. **Pipeline de validación y extracción de póster (`videoOptimizer.ts`):** validación de contenedores (MP4/H.264, WebM), duración recomendada de loops (5 a 30s), cálculo de hash SHA-256 e instantánea del primer fotograma en un `<canvas>` oculto para crear el póster de respaldo inmediato.
  2. **Persistencia local offline (`assetDb.ts` y `sessionDb.ts`):** soporte del tipo `'video'` en la base IndexedDB local (`db.assets`), permitiendo el uso de fondos de video sin conexión a internet y en paquetes de sesión.
  3. **Transferencia resiliente por WebRTC (`videoChunkSyncService.ts`):** protocolo de transmisión de videos en fragmentos de 64 KB (`VIDEO_CHUNK_TRANSFER`) con consulta previa de disponibilidad (`VIDEO_AVAILABILITY_QUERY`), verificación de integridad SHA-256 al ensamblar e inserción automática en la base de datos de la Mesa.
  4. **Renderizado en Mesa con cero pantallas negras (`StageViewport.tsx`):** renderizado en doble capa; la capa de póster estático permanece visible bajo el video y se funde suavemente al arrancar la reproducción. Integración con `fitMode` (cover/contain) y pausa automática al activar el modo de emergencia *Blackout*.
  5. **Compositor y Selector Visual (`AssetPickerModal.tsx`, `ComposerViewport.tsx`, `SceneCanvasComposer.tsx`):** selector unificado con filtro por pestañas (*Todos*, *Fotos*, *Videos*), etiquetas de duración de video y previsualización en vivo en el lienzo del director.
- **Evidencia técnica:** compilación TypeScript limpia (`npx tsc -b`), 67 suites de pruebas pasando al 100% (387 de 387 pruebas aprobadas en Vitest, incluyendo pruebas de renderizado de video, sincronización por fragmentos y reductor de comandos) y build de producción (`npm run build`) en 3.79s.
- **Comprobación de uso:**
  - *Revisión de código y pruebas unitarias:* 100% completas y aprobadas.
  - *Comprobación visual:* validado el flujo de carga, badges de duración y previsualización en el navegador.
  - *Límites y próxima comprobación:* queda pendiente una prueba de estrés de transmisión WebRTC con múltiples dispositivos físicos en una red local con latencia real.
- **Manual:** se actualizó `docs/manual/README.md` incorporando la subsección «Elegir imágenes y fondos de video (Selector Visual)».

## 2026-09-04 — Plantillas de composición visual

- **Walkthrough y entorno:** revisión de código del compositor y pruebas unitarias locales; no se realizó recorrido visual ni una prueba con Mesa conectada.
- **Funciones afectadas:** el Compositor Táctil incorpora **JRPG**, **Diálogo** y **Mapa** debajo de la vista previa. Reorganizan las figuras existentes como punto de partida: bandos laterales, dos interlocutores destacados o miniaturas compactas para un mapa elegido como fondo. Cada figura puede tener equipo **Aliados**, **Enemigos** o **Neutral**; JRPG respeta esa asignación. Mapa habilita una cuadrícula proyectable, cuadrada o hexagonal.
- **Manual:** se agregó la sección «Plantillas de composición: JRPG, diálogo y mapa táctico» a `README.md`.
- **Evidencia:** `sceneLayoutTemplates.test.ts` pasó 2/2 pruebas. La compilación completa quedó bloqueada por un error TypeScript preexistente: variable `container` sin uso en `src/domain/display/stageViewportVideo.test.tsx:87`.
- **Límites y próxima comprobación:** pendiente abrir el compositor en móvil y escritorio, comprobar publicación hacia una Mesa conectada y validar la legibilidad de tokens sobre mapas reales. Resultado: revisión parcial por bloqueo.

## 2026-09-04 — MAN-046: Modularización de MasterController en hooks y subcomponentes (`controller/`)

- **Problema de mantenimiento:** `src/components/master/MasterController.tsx` concentraba 1,337 líneas como controlador maestro de la aplicación, albergando la gestión del botón nativo «Atrás» de Android con cascada de modales, el menú flotante del Modo Partida (mesa/inmersivo), el despacho de acciones de atmósfera/SFX y la persistencia de checkpoints automáticos y manuales.
- **Corrección:**
  1. **Desacoplamiento en subcomponentes y custom hooks especializados:**
     - `PartyModeControl.tsx`: menú flotante del Modo Partida y sincronización de ciclo de vida de pantalla activa (`setKeepAwake`) y pantalla completa inmersiva (`setImmersive`) mediante el puente nativo de Android.
     - `useMasterBackButton.ts`: gestión LIFO del botón «Atrás» físico con cierre jerárquico de más de 20 modales y repliegue seguro de pestañas a `'live'`.
     - `useMasterAtmosphereActions.ts`: acciones de clima, intensidad, iluminación, blackout, relámpagos, temblores de pantalla, cartel de escena y pistas ambientales/SFX.
     - `useCheckpointManagement.ts`: estado de puntos de restauración, autocheckpoints con descripción, guardado manual y eliminación.
     - `useVersionTelemetry.ts`: receptor de telemetría WebRTC y evaluador de compatibilidad de protocolos entre Maestro y Mesa.
  2. **Orquestador limpio:** `MasterController.tsx` se refactorizó integrando estos módulos, preservando 100% la interfaz `MasterControllerProps` y garantizando total compatibilidad con `App.tsx`.
- **Evidencia técnica:** compilación TypeScript limpia (`npx tsc -b`), 63/63 suites de pruebas pasando al 100% (370/370 pruebas aprobadas en Vitest, incluyendo `SessionPanel.test.tsx` y `backButtonStack.test.ts`) y compilación para producción (`npm run build`) en 1.11s.
- **Comprobación de uso:** sin cambios para el usuario final; se preservan todas las operaciones del Master Controller, el Modo Partida y los atajos de teclado y táctiles.

## 2026-09-04 — MAN-045: Modularización de SceneCanvasComposer en subcomponentes (`composer/`)

- **Problema de mantenimiento:** `src/components/master/composer/SceneCanvasComposer.tsx` era el componente más extenso del proyecto (2,203 líneas), acumulando cabecera de guardado, barra de modos táctiles, viewport con gestos 16:9, bandeja de edición de figura seleccionada con D-Pad, pestañas inferiores (fondo, personajes, capas, ambiente) y cuatro modales independientes.
- **Corrección:**
  1. **Tipos y utilidades compartidas:** se creó `composerTypes.ts` con `TouchMode`, `DpadPreset`, `ComposerBottomTab` y la función `getDpadDeltas(preset)`.
  2. **Desacoplamiento en subcomponentes:**
     - `ComposerHeader.tsx`: cabecera táctil, título editable de escena, autoguardado y menú contextual.
     - `ComposerTouchModeBar.tsx`: barra de alternancia entre modos táctiles (Mover figuras, Panorámica, Ajustar fondo).
     - `ComposerViewport.tsx`: lienzo 16:9 con soporte multitáctil/ratón, micro-arrastre relativo, encuadre y zoom flotante.
     - `ComposerSelectedCharPanel.tsx`: panel inferior de figura con escalado porcentual (+/-), espejo horizontal, orden de capas y cruceta micro-D-pad (Fino 1px, Normal 5px, Amplio 20px).
     - `ComposerBottomTabs.tsx`: pestañas inferiores para selector de fondo, galería rápida de personajes, orden de capas y efectos FX (clima e iluminación).
     - `ComposerModals.tsx`: contenedor de modales para selector de recursos (fondo/token), alta rápida de personajes, traslado a preparación y recuperación de borradores resiliente de Android.
  3. **Orquestador limpio:** `SceneCanvasComposer.tsx` se redujo de 2,203 líneas a ~700 líneas, preservando intacta la interfaz `SceneCanvasComposerProps`, el autoguardado atómico debounced y la resiliencia ante interrupciones.
- **Evidencia técnica:** compilación TypeScript limpia (`npx tsc -b`), 63/63 suites de pruebas pasando al 100% (370/370 pruebas aprobadas en Vitest, incluyendo `sceneCanvasComposer.test.ts`), y compilación para producción (`npm run build`) completada con éxito.
- **Comprobación de uso:** sin cambios para el usuario final; se mantiene la compatibilidad operativa total del compositor de escenas tanto en escritorio como en dispositivos móviles.

## 2026-09-04 — MAN-044: Modularización de DirectorModals en subcomponentes (`director/modals/`)

- **Problema de mantenimiento:** `src/components/master/director/DirectorModals.tsx` concentraba 1,018 líneas albergando 9 modales tácticos y visuales distintos en un único archivo, incrementando la complejidad cognitiva y el riesgo al editar funcionalidades específicas del visor táctil.
- **Corrección:**
  1. **Desacoplamiento en subcomponentes aislados:** se crearon 9 componentes en `src/components/master/director/modals/`:
     - `CalibrateAnchorModal.tsx`: calibración de apoyo al suelo y compensación de transparencias.
     - `PrepareEntryModal.tsx`: animaciones de entrada desde reserva con precarga.
     - `SaveCameraPresetModal.tsx`: guardado de encuadres y zoom.
     - `RelativeLayerModal.tsx`: ordenamiento relativo «Delante de / Detrás de».
     - `ViewLayersModal.tsx`: gestor jerárquico unificado de capas Z-Index.
     - `SaveWaypointModal.tsx`: registro de coordenadas de puntos narrativos.
     - `MoveToWaypointModal.tsx`: selector de destinos narrativos con desplazamiento suave o instantáneo.
     - `CreateOcclusionModal.tsx`: creación y edición de máscaras de oclusión frontal.
     - `SaveFormationModal.tsx`: guardado de formaciones tácticas grupales personalizadas.
  2. **Orquestador limpio:** `DirectorModals.tsx` se redujo de 1,018 a ~150 líneas, conservando la interfaz `DirectorModalsProps` sin alterar las llamadas de `CharacterDirectorOverlay.tsx`.
- **Evidencia técnica:** compilación TypeScript limpia (`npx tsc -b`), 63 suites de pruebas pasando al 100% (370 de 370 pruebas aprobadas en Vitest, incluyendo las pruebas de regresión de `characterDirector.test.tsx`) y build de producción (`npm run build`) en 742ms.
- **Comprobación de uso:** sin cambios para el usuario final; se preservan todas las funcionalidades, modales y atajos tácticos del Modo Dirección.

## 2026-09-04 — MAN-043: Modularización de estilos CSS por dominio (`src/styles/`)

- **Problema de mantenimiento:** `src/index.css` contenía un monolito de 7,861 líneas mezclando resets, Lobby, Display, Master Controller, Combate, Modales y optimizaciones móviles de Android, ralentizando el desarrollo y dificultando el mantenimiento de estilos aislados.
- **Corrección:**
  1. **Desacoplamiento temático en `src/styles/`:** se extrajeron 8 módulos de estilos independientes preservando la cascada y especificidad original:
     - `src/styles/base.css`: variables `:root`, importación tipográfica y resets base.
     - `src/styles/lobby.css`: interfaz de entrada, tarjetas de rol, banner de recuperación y responsive.
     - `src/styles/display.css`: viewport de escenario, fondo, iluminación, HUD y diálogo cinemático.
     - `src/styles/master.css`: controlador del DM, barra de herramientas y selector de escenas.
     - `src/styles/combat.css`: pestaña de combate, iniciativa y temporizadores de turno.
     - `src/styles/modals.css`: modales de clima, presets, checkpoints, macros, publicación selectiva y diagnóstico.
     - `src/styles/mobile.css`: navegación inferior a una mano y hardening móvil Android.
     - `src/styles/sessionPanel.css`: dock de emergencia permanente, tarjetas contextuales y favoritos.
  2. **Orquestación en `src/index.css`:** se redujo a 10 líneas de `@import` respetando el orden estricto de precedencia.
- **Evidencia técnica:** compilación TypeScript limpia (`npx tsc -b`), 63 suites pasando (370 de 370 pruebas aprobadas al 100% en Vitest) y empaquetado de producción (`npm run build`) completado en 771ms sin advertencias nuevas.
- **Comprobación de uso:** sin cambios en la experiencia de usuario ni en las clases CSS consumidas por la interfaz; se mantiene la paridad de estilos y comportamiento previa.

## 2026-09-04 — MAN-042: Ajuste de Safe Areas y visibilidad en Android (Lobby y Modo Dirección)

- **Problema observado:** en teléfonos Android con muesca (notch), barra de estado del sistema o barra de navegación gestual inferior, el Lobby cortaba la cabecera superior («Visual Player») debido a un desbordamiento vertical negativo por centrado flexbox y a la falta de insets seguros (`env(safe-area-inset-*)`). El banner de sesión interrumpida y el pie de página quedaban solapados por la barra de estado y la píldora gestual.
- **Corrección:**
  1. **Lobby desbordamiento seguro:** se cambió la alineación de `.lobby-root` a `justify-content: flex-start` con `margin: auto 0` en `.lobby-content` para permitir scroll completo sin pérdida de la cabecera y con padding dinámico en base a `--sat` y `--sab`.
  2. **Banner de recuperación adaptable:** extracción de estilos inline a clases `.recovery-banner*`, con distribución adaptable (columna en pantallas estrechas) y botones táctiles accesibles.
  3. **Ajuste de insets en Modo Dirección:** aplicación de `var(--sat)` y `var(--sab)` a la barra superior (`DirectorTopBar`), base flotante (`DirectorBottomBar`), selector de expresiones/etiqueta privada, zonas de soltado rápido y pastilla de deshacer en `CharacterDirectorOverlay`.
  4. **Optimización móvil:** márgenes, rellenos y títulos reducidos bajo `@media (max-width: 640px)` para facilitar la visualización sin scrolls innecesarios.
- **Evidencia técnica:** 63 suites pasando (370 de 370 pruebas aprobadas), compilación TypeScript limpia (`npx tsc -b`) y empaquetado de producción (`npm run build`) verificado.
- **Comprobación de uso:** validación de renderizado y lógica en entorno DOM local; la comprobación ergonómica y visual final en dispositivos Android físicos con mesa conectada queda pendiente de validación en mano.

## 2026-09-04 — MAN-040: Limpieza de warnings de Gradle Android

- **Alcance técnico:** se eliminaron los repositorios locales `flatDir` vacíos de los módulos Android de la app y de plugins Cordova.
- **Motivo:** Gradle advertía que `flatDir` no soporta metadatos de dependencias; el proyecto no contiene AAR/JAR locales que requieran esos repositorios.
- **Evidencia:** `npm run android:build` completado correctamente y `:app:assembleDevDebug --warning-mode all` completado correctamente; `rg` no encuentra declaraciones `flatDir` en los Gradle Android.
- **Comprobación de uso:** sin cambios en la interfaz ni en el flujo de la app; no corresponde presentar esta limpieza como prueba visual o como mesa conectada validada.

## 2026-09-04 — MAN-041: Acceso visible al movimiento de personajes

- **Problema observado:** el flujo clásico de **En Vivo** mostraba posiciones rápidas, pero no dejaba visible el acceso al editor táctil para arrastrar NPCs.
- **Corrección:** se agregó **Editar escena en vivo** con el botón **Mover personajes** en la parte superior del control clásico.
- **Alcance:** el editor permite arrastrar personajes, cambiar el fondo y ajustar el encuadre; en celulares el botón ocupa todo el ancho para facilitar el uso táctil.
- **Evidencia:** `npm run android:build` y `npm run build` completados correctamente. La comprobación visual en Android físico y el recorrido con Mesa conectada siguen pendientes.

## 2026-09-04 — MAN-042: Compositor táctil sin recorte en Android

- **Problema observado:** al abrir el editor para mover personajes, la cabecera de control quedaba visible por encima y el escenario podía desplazarse o recortarse lateralmente.
- **Corrección:** el compositor ahora se monta sobre el `body` como superficie independiente y ocupa el viewport completo del teléfono, respetando las áreas seguras y el scroll interno de sus controles.
- **Evidencia:** `npm run android:build` completado correctamente. Vite mantiene únicamente sus avisos no bloqueantes de bundle grande/importaciones dinámicas.
- **Comprobación visual:** pendiente repetir el recorrido en Android físico con arrastre de NPCs, cambio de fondo y publicación a Mesa.

## 2026-09-04 — MAN-043: Drawer global de herramientas de mesa

- **Problema observado:** varias funciones importantes quedaban repartidas entre la cabecera, la vista alternativa de Sesión y la versión de escritorio.
- **Corrección:** **Más** ahora abre **Herramientas de mesa**, disponible también con el modo clásico activo.
- **Alcance:** incluye publicación, En vivo/Preparación, editor de escena, preview completo, iluminación, audio, recursos, combate, momentos, diálogos, preparación, recap, historial, checkpoints, presets, diagnóstico, biblioteca de sesiones, campaña y Modo Partida.
- **Evidencia:** `npm run android:build` completado correctamente. Vite mantiene avisos no bloqueantes de bundle grande/importaciones dinámicas.
- **Comprobación visual:** pendiente en Android físico; debe verificarse el scroll del drawer, la apertura de cada modal y el uso con Mesa conectada.

## 2026-09-04 — MAN-044: Verificación de sincronización Web/Android

- **Corrección:** `android:build` ahora valida que `dist/index.html` y los assets copiados a Android sean idénticos y que cada JS/CSS referenciado exista dentro del proyecto Android.
- **Uso técnico:** `npm run android:verify` comprueba una sincronización existente; `npm run android:build` compila, sincroniza, normaliza Gradle y verifica todo en un solo recorrido.
- **Resultado esperado:** si Android tiene una versión vieja o falta un asset, el comando falla antes de abrir Android Studio.

## 2026-09-04 — MAN-045: Herramientas centralizadas y compositor móvil estable

- **Funciones:** el drawer **Herramientas de mesa** reúne publicación, escena, combate, recursos, historial, presets, diagnóstico, campaña y Modo Partida.
- **Compositor:** en teléfonos el editor ahora usa fondo opaco, viewport completo y una distribución estable de encabezado, lienzo limitado y controles con scroll interno.
- **Evidencia:** `npm run android:build` y `npm run android:verify` completados correctamente; la validación visual en Android físico sigue pendiente.

## 2026-09-04 — MAN-046: Estilos independientes para el compositor Android

- **Problema observado:** en el celular algunos estilos utilitarios no se aplicaban al compositor: botones blancos del navegador, capas fuera del lienzo y escenario sobredimensionado.
- **Corrección:** se añadieron estilos propios para el modal, lienzo, capas, controles, botones y pie de acciones; el escenario queda recortado dentro de su viewport y los controles usan scroll.
- **Alcance técnico:** también se corrigió una ruta de tipos que impedía completar el build de la APK.
- **Evidencia:** `npm run android:build` y `npm run android:verify` completados correctamente. La comprobación visual en Android físico queda pendiente.

## 2026-09-04 — MAN-047: Hardening de composición y Modo Dirección

- **Áreas revisadas:** editor alternativo de escenas y overlay de **Modo Dirección** dentro de la previsualización.
- **Corrección:** se añadieron estilos de respaldo para contener el lienzo, mantener las barras dentro del viewport, dar tamaño táctil a los botones y evitar desbordes de menús.
- **Evidencia:** `npm run android:build` y `npm run android:verify` completados correctamente. Vite mantiene avisos no bloqueantes de bundle grande/importaciones dinámicas.
- **Comprobación visual:** pendiente repetir en Android físico los recorridos de zoom, ajuste de fondo, arrastre, selección múltiple, capas y waypoints.

## 2026-09-04 — MAN-048: Acceso directo al espacio Escena

- **Cambio de flujo:** la barra inferior móvil incorpora **Escena** como acceso de primer nivel, junto a **En Vivo**, **Combate**, **Momentos** y **Más**.
- **Uso:** **Escena** abre directamente el compositor táctil para mover personajes, cambiar fondos y ajustar la composición sin atravesar drawers secundarios.
- **Evidencia:** `npm run android:build` y `npm run android:verify` completados correctamente; la validación visual en Android físico queda pendiente.

## 2026-09-04 — MAN-049: Añadir NPC desde el editor táctil

- **Cambio de flujo:** el compositor táctil incorpora **Añadir NPC** con personajes de la campaña disponibles en una tira desplazable.
- **Uso:** tocar un personaje lo agrega al escenario, lo selecciona y lo deja listo para arrastrarlo; conserva deshacer y publicación junto con el resto de la composición.
- **Evidencia:** `npm run android:build` y `npm run android:verify` completados correctamente. La comprobación visual en Android físico queda pendiente.

## 2026-09-04 — MAN-050: Cambiar fondo desde el compositor táctil

- **Cambio de flujo:** el editor táctil incorpora **Cambiar Fondo** junto a las acciones rápidas del escenario.
- **Uso:** abre el selector de assets existente para elegir recursos guardados, importar una imagen o usar una URL; el fondo seleccionado se conserva al guardar la composición en En Vivo o Preparación.
- **Evidencia:** `npm run android:build` y `npm run android:verify` completados correctamente; la validación visual en Android físico queda pendiente.

## 2026-09-04 — MAN-031: Modo Partida Android con controles ocultables

- **Versión:** árbol de trabajo local con modo operativo para partidas largas en celulares y tablets Android.
- **Alcance de uso:** el botón flotante **Modo mesa** abre las opciones de **Modo Partida**. Incluye **Pantalla activa**, **Pantalla completa**, **Ocultar controles** y **Salir del Modo Partida**.
- **Comportamiento:** al ocultar controles, la escena queda despejada y el botón flotante permanece visible para restaurar la consola. Las opciones de pantalla utilizan el puente nativo Android y sus equivalentes web.
- **Evidencia:** compilación de producción `npm run build` completada correctamente. Vite informa advertencias no bloqueantes sobre tamaño de bundle y módulos dinámicos.
- **Comprobación visual:** pendiente en celulares y tablets Android físicos; no se presenta esta implementación como validada en mesa conectada.
- **Resultado:** modo operativo integrado y reversible; quedan pendientes las pruebas de orientación, bloqueo/desbloqueo, segundo plano y ergonomía con hardware real.

## 2026-09-04 — MAN-032: Acceso directo a edición táctil durante la partida

- **Alcance:** la consola rápida de **Sesión** incluye **Editar escena** y el drawer **Fondo y personajes**.
- **Uso:** abre el editor táctil existente para arrastrar personajes en **Modo Dirección** y ajustar/cambiar el fondo desde el compositor.
- **Evidencia:** compilación de producción `npm run build` completada correctamente; validación visual en Android físico y recorrido con Mesa conectada pendientes.

## 2026-09-04 — MAN-033: Escenas recientes y corrección rápida de acciones

- **Alcance:** la vista **Sesión** muestra hasta cinco escenas usadas recientemente con miniaturas y acceso de un toque.
- **Corrección rápida:** las acciones de la consola rápida muestran la última acción ejecutada y el botón **Deshacer** cuando hay historial disponible.
- **Evidencia:** compilación de producción `npm run build` completada correctamente; validación visual en Android físico y recorrido con Mesa conectada pendientes.

## 2026-09-04 — MAN-034: Panel Ahora / Después para control de sesión

- **Alcance:** la vista **Sesión** incorpora un resumen compacto de la escena actual en Mesa y del siguiente estado preparado.
- **Acciones:** cuando hay cambios pendientes, el panel ofrece **Publicar** y **Descartar** sin abrir otra tarjeta o modal.
- **Responsive:** en celulares se apilan las acciones en una fila inferior; en tablets permanecen integradas en la misma línea del resumen.
- **Evidencia:** compilación de producción `npm run build` completada correctamente; validación visual en Android físico y recorrido con Mesa conectada pendientes.

## 2026-09-04 — MAN-035: Controles contextuales para exploración y combate

- **Alcance:** la vista **Sesión** incorpora el bloque **Contexto actual**, que adapta sus acciones al estado de la partida.
- **Combate:** muestra ronda, combatiente activo, **Anterior**, **Siguiente turno** y acceso a **Ver combate**.
- **Exploración:** muestra la próxima escena sugerida y permite **Preparar siguiente** o **Buscar escena**.
- **Evidencia:** compilación de producción `npm run build` completada correctamente; validación visual en Android físico y recorrido con Mesa conectada pendientes.

## 2026-09-04 — MAN-036: Centro de Partida con línea temporal de acciones

- **Alcance:** la vista **Sesión** incorpora las cuatro últimas acciones del director con modo (**En Vivo** o **Borrador**), escena y hora.
- **Navegación:** el botón **Ver historial completo** abre el historial existente para restaurar estados anteriores.
- **Responsive:** en celulares las acciones se muestran en dos columnas; en tablets se distribuyen en cuatro bloques compactos.
- **Evidencia:** compilación de producción `npm run build` completada correctamente; validación visual en Android físico y recorrido con Mesa conectada pendientes.

## 2026-09-04 — MAN-037: Ajuste de viewport y modales para teléfonos Android

- **Problema observado:** la captura de uso mostró cabecera duplicada, navegación superior desbordada, preview demasiado alto y ventanas que podían superar el viewport del teléfono.
- **Corrección:** en teléfonos se ocultan los controles duplicados de la cabecera, se compacta la previsualización táctil, se limita el ancho del contenido y los modales usan la altura disponible (`100dvh`) con scroll interno.
- **Evidencia:** compilación de producción `npm run build` completada correctamente.
- **Comprobación visual:** pendiente repetir la captura en un teléfono Android y probar modales, arrastre de NPCs, teclado, rotación y navegación inferior.

## 2026-09-04 — MAN-038: Editor clásico En Vivo como flujo principal

- **Cambio de flujo:** `En Vivo` inicia directamente el editor clásico de edición.
- **Simplificación:** se eliminó del recorrido visible el banner para volver a la vista alternativa de Sesión, evitando dos superficies de control superpuestas en Android.
- **Responsive:** el editor clásico usa tarjetas de ancho completo, grids compactos y scroll interno para listas largas en teléfonos.
- **Evidencia:** compilación de producción `npm run build` completada correctamente.
- **Comprobación visual:** pendiente repetir la captura en Android físico para validar que el flujo clásico no presente desbordamientos en modales ni controles.

## 2026-09-04 — MAN-039: Editor táctil de escena a pantalla completa

- **Alcance:** `SceneCompositorModal` se adapta en teléfonos Android a una superficie de pantalla completa, sin ventana desplazable.
- **Distribución:** lienzo superior con relación 16:9, lista de capas/controles con scroll interno y pie de acciones fijo dentro del viewport.
- **Edición:** se conserva el arrastre táctil de personajes y props, junto con el cambio de fondo y la publicación según el modo En Vivo/Borrador.
- **Evidencia:** compilación de producción `npm run build` completada correctamente.
- **Comprobación visual:** pendiente en Android físico, incluyendo arrastre, teclado, fondo, rotación y publicación con Mesa conectada.

## 2026-09-04 — MAN-030: Consola compacta de acciones rápidas para Android

- **Versión:** árbol de trabajo local con consola de control para cambios durante la partida.
- **Alcance de uso:** en **Sesión**, se agregó una barra **Acciones rápidas** con **Relámpago**, **Sacudir**, **Cartel**, **Ambiente**, **Sonidos** y **Más**. **Más** abre un drawer inferior con iluminación, cámara/escena, recursos y música ambiental.
- **Diseño táctil:** botones de al menos 56 px, cuadrícula compacta en celulares pequeños, panel inferior con área segura de Android y cierre al tocar fuera.
- **Manual actualizado:** se incorporó el recorrido de acciones rápidas en `docs/manual/README.md`.
- **Evidencia:** compilación de producción `npm run build` completada correctamente. Vite informa advertencias no bloqueantes sobre tamaño de bundle y módulos dinámicos.
- **Comprobación visual:** pendiente en celulares y tablets Android físicos; no se presenta esta implementación como validada en mesa conectada.
- **Resultado:** consola compacta integrada reutilizando los callbacks existentes; queda pendiente validar ergonomía y legibilidad con hardware real.

**Estado más reciente:** MAN-029 incorpora formaciones tácticas en escena (Fila horizontal, Semicírculo, Flancos, Racimo y Personalizadas) con compresión elástica de límites, botón «Seleccionar todos» en multiselección, y guías magnéticas inteligentes («Imán») con atracción a suelo, ejes, tercios y waypoints, acompañadas de líneas guía luminosas y retroalimentación háptica (10 ms). 370 pruebas unitarias aprobadas (100%), chequeo de tipos estricto y compilación de producción Vite sin errores. Comprobación visual bloqueada por el entorno; pendiente recorrido en dispositivos físicos.

## 2026-09-04 — MAN-029: Tácticas y formaciones en escena, guías magnéticas con retroalimentación háptica y selección total

- **Versión:** árbol de trabajo local con cambios concurrentes preservados.
- **Alcance de uso:** controles grupales, alineación y composición táctica en **Modo Dirección**.
- **Cambios implementados:**
  1. **Formaciones tácticas de escena:** Menú desplegable **Formación ▾** al seleccionar 2 o más figuras. Permite aplicar disposiciones preconfiguradas: *Fila horizontal*, *Semicírculo*, *Flancos (Alas)* y *Racimo (2 filas)*. Todas las posiciones se anclan respecto a la figura principal activa.
  2. **Compresión elástica de bordes:** Algoritmo pure math que detecta si alguna figura de la formación rebasaría los márgenes seguros (`5%` a `95%` en X, `0%` a `70%` en Y) y escala el espaciado elásticamente en lugar de truncar posiciones o provocar apiñamientos.
  3. **Formaciones personalizadas guardables:** Opción **Guardar formación actual...** que registra las distancias relativas de las figuras seleccionadas con un nombre definido por el usuario para reutilizarla con cualquier grupo futuro.
  4. **Seleccionar todos:** Botón de un toque cuando el modo **Seleccionar varios** está activo, marcando al instante a todas las figuras presentes en escena (excluyendo reservas) para facilitar maniobras de pelotón o traslados masivos.
  5. **Guías magnéticas e imán inteligente:** Botón conmutador **Imán** en la barra superior. Durante el arrastre libre, evalúa atracción magnética (umbral ~2.2%) hacia la línea de suelo (`0%`), eje central (`50%`), tercios (`33.3%` y `66.7%`) y puntos narrativos guardados. Muestra una línea guía punteada luminosa de color rosa con el nombre de la referencia y activa una suave vibración háptica (`navigator.vibrate(10)`) en el dispositivo al enganchar.
  6. **Deshacer inmediato:** Toda aplicación de formación táctica genera una confirmación temporal de 4,5 segundos con botón **Deshacer** directo.
- **Manual actualizado:** sección **Tácticas y formaciones en escena**, **Guías magnéticas e imán inteligente** y herramientas de Modo Dirección en `docs/manual/README.md`.
- **Evidencia de código e integración local:** 63 suites y 370 pruebas unitarias aprobadas (100%). Pruebas específicas añadidas para matemáticas de formaciones y compresión elástica, evaluación de atracción magnética por umbrales, selección total, aplicación y guardado de formaciones personalizadas, y activación de retroalimentación háptica. `npx tsc -b` y `npm run build` completados con éxito y 0 errores.
- **Comprobación visual:** no repetida por la indisponibilidad del controlador de UI en el entorno. No se atribuye validación visual a las pruebas DOM.
- **Pendiente de prueba completa:** validar la ergonomía de arrastre magnético en pantallas táctiles reales y el comportamiento de la vibración háptica en diferentes fabricantes de dispositivos móviles.
- **Resultado:** implementación y manual actualizados; prueba visual y recorrido físico pendientes.

## 2026-09-04 — MAN-028: Movimiento en vivo en Mesa, puntos narrativos interactivos y duplicación rápida

- **Versión:** árbol de trabajo local con cambios concurrentes preservados.
- **Alcance de uso:** controles avanzados y de seguridad en **Modo Dirección**.
- **Cambios implementados:**
  1. **Seguir en Mesa:** Nuevo botón conmutador en la barra superior (modo En Vivo). Permite que la pantalla de los jugadores siga el desplazamiento de la figura durante el arrastre con limitación (*throttling* a 60 ms) para no saturar WebRTC ni crear entradas intermedias innecesarias en el historial. Al soltar se confirma la posición definitiva con instantánea transaccional.
  2. **Puntos narrativos en escenario:** Conmutador **Puntos** en la barra superior que despliega pines discretos con el nombre de los puntos guardados (*«Puerta»*, *«Mostrador»*, *«Altar»*). Al tocar un marcador con una figura seleccionada, esta se traslada de inmediato a esas coordenadas con aviso temporal y botón **Deshacer**. Si no hay selección, enfoca la cámara en el punto.
  3. **Duplicación rápida:** Botón directo **Duplicar** en la barra inferior rápida y en el cajón *Más…*. Crea una copia de la figura activa con separación horizontal (+6%) para evitar solapamientos. La app detecta el nombre o etiqueta base y numera automáticamente en etiquetas privadas (ej. *«Guardia 1»* y *«Guardia 2»*) sin alterar la ficha base de la campaña, ofreciendo confirmación con **Deshacer**.
- **Manual actualizado:** secciones de herramientas y recorrido de **Modo Dirección Táctil y Composición de Escenas** en `docs/manual/README.md`.
- **Evidencia de código e integración local:** 63 suites y 358 pruebas unitarias aprobadas (100%). Pruebas específicas añadidas para duplicación y numeración secuencial (test 21), traslado a puntos narrativos visibles (test 22) y movimiento en vivo con envíos agrupados (test 23). `npx tsc -b` completado con 0 errores.
- **Comprobación visual:** no repetida por la indisponibilidad del controlador de UI en el entorno. No se atribuye validación visual a las pruebas DOM.
- **Pendiente de prueba completa:** validar la fluidez del seguimiento en vivo en una red Wi-Fi real con dos dispositivos (control y Mesa) y la ergonomía de pulsación de waypoints en pantallas pequeñas.
- **Resultado:** implementación y manual actualizados; prueba visual y recorrido físico pendientes.

## 2026-09-04 — MAN-027: Gestos rápidos de entrada, salida y corrección

- **Versión:** árbol de trabajo local con cambios concurrentes preservados.
- **Alcance de uso:** gestión de figuras dentro de **Modo Dirección**.
- **Cambios implementados:**
  1. Una ficha en reserva puede arrastrarse desde la tira superior hasta cualquier punto válido del escenario. El gesto comparte la tolerancia de 10 px, muestra una copia semitransparente y entra revelado en las coordenadas elegidas.
  2. Al mover una figura activa aparece un carril lateral dividido en **Reserva**, **Ocultar** y **Quitar**. La zona apuntada aumenta de tamaño y se resalta antes de soltar.
  3. **Quitar** elimina una o varias instancias del estado de la escena mediante una sola actualización; no elimina las fichas guardadas en la campaña.
  4. Las acciones rápidas muestran durante 4,5 segundos una confirmación con **Deshacer**. El control reutiliza el historial existente y desaparece después de revertir.
- **Manual actualizado:** sección **Modo Dirección Táctil y Composición de Escenas**.
- **Evidencia de código e integración local:** 63 suites y 355 pruebas aprobadas; pruebas específicas de entrada por arrastre con coordenadas, zonas de soltado, retirada de instancia y Deshacer. `tsc -b` y compilación Vite de producción correctas.
- **Comprobación visual:** no repetida porque el controlador de UI del entorno continúa sin poder inicializar sus recursos. No se presenta la prueba DOM como validación visual.
- **Pendiente de prueba completa:** comprobar ergonomía del carril lateral, vibración/feedback táctil y sincronización percibida con teléfono de control y Mesa física conectados.
- **Resultado:** implementación y manual actualizados; prueba visual y recorrido físico pendientes.

## 2026-09-04 — MAN-026: Optimización de recursos, rendimiento, recuperación resiliente de borrador y respaldos autónomos en Android

- **Versión:** árbol de trabajo local con mejoras de robustez en memoria, almacenamiento y ciclo de vida (`v1.1.0-dev`, `versionCode 2`).
- **Entorno:**
  - Dispositivo emulado Android (`emulator-5554`, API 36.1, resolución 1080×2400) y dispositivo físico conectado vía ADB (`Motorola One Fusion`).
  - APK nativo de desarrollo: `com.akkarinrothen.visualplayer.dev` (`app-dev-debug.apk`).
  - Pruebas automatizadas en Vitest: 63 suites y 350+ pruebas unitarias aprobadas (100%), incluyendo `draftStorageService.test.ts`, `imageOptimizer.test.ts` y `backupPackageService.test.ts`.
  - Compilación estricta TypeScript (`tsc -b`), empaquetado de producción Vite y Gradle nativo (`assembleDevDebug`) completados con éxito y 0 errores.
- **Alcance y Mejoras Implementadas:**
  1. **Optimización y Deduplicación de Recursos Multimedia (Preguntas 1 y 6):**
     - Módulo `src/utils/imageOptimizer.ts` con escalado proporcional inteligente (fondos hasta 1920×1080, retratos y props hasta 512×512 preservando transparencias).
     - Compresión WebP adaptativa con selector de calidad táctil y opción de conservar archivo original si se prefiere.
     - Deduplicación automática mediante hash criptográfico SHA-256: no almacena duplicados si se selecciona dos veces la misma imagen.
     - Generación automática de miniaturas ligeras (160×160) en base de datos para renderizado fluido y sin pausas de galerías grandes en dispositivos móviles.
     - Rechazo preventivo y explicativo para formatos propietarios de cámara no soportados en navegadores móviles (ej. HEIC/HEIF de Apple).
  2. **Recuperación Resiliente de Borrador ante Cierres Abruptos (Pregunta 9):**
     - Módulo `src/services/draftStorageService.ts` y hook integrado en `SceneCanvasComposer.tsx`.
     - Persistencia síncrona inmediata (`localStorage` + `Dexie settings`) tras cada adición de figura, movimiento o ajuste de escala, protegiendo contra cierres inesperados por falta de memoria (`low memory killer`) o agotamiento de batería en Android.
     - Píldora de estado en tiempo real en la cabecera: `✓ Borrador guardado`.
     - Detección automática al reabrir la escena: si existe un borrador más reciente que la escena consolidada, se despliega la ventana modal **Borrador Recuperado** con métricas claras (hora del borrador, número de figuras detectadas) y opciones inequívocas: *«Continuar con el borrador (Recomendado)»* o *«Volver a la versión guardada»*.
  3. **Respaldos Completos Autónomos sin Cables (.vpbackup) (Pregunta 17):**
     - Módulo `src/services/backupPackageService.ts` y componente `src/components/master/modals/BackupManagerModal.tsx`.
     - Botón de acceso directo `[Respaldos]` en el Taller de Preparación (en cabecera superior y en la barra de Escenas Preparadas).
     - Exportación e importación autónoma desde el explorador de archivos del teléfono en un único archivo comprimido `.vpbackup`.
     - Inspección previa con firma de integridad SHA-256 antes de tocar la base de datos local.
     - Tres modos de restauración táctiles: *«Crear Copias»* (preserva campañas existentes con IDs únicos), *«Fusionar y Actualizar»* (agrega elementos nuevos) y *«Sobrescribir Todo»* (reemplazo limpio).
- **Evidencia y Validación en Dispositivo Real / Emulado:**
  - *Comprobado visualmente y en ejecución en el APK Android:*
    - `screen_backup_modal_active.png`: Modal de respaldos activo en Android mostrando resumen de datos locales y botón de exportación `.vpbackup`.
    - `screen_restore_active.png`: Pestaña de restauración de respaldo con selector de archivo `.vpbackup`.
    - `screen_composer_enter.png`: Compositor abierto en Android mostrando la píldora verde `✓ Borrador guardado` en la cabecera.
    - `screen_draft_check2.png`: Adición táctil del personaje *Eldrin Sombrasusurro* en el escenario sin guardar formalmente.
    - `screen_draft_recovery_dialog.png` / `screen_draft_dialog_result.png`: Tras matar el proceso con `am force-stop` y relanzar la app, al abrir la escena aparece el diálogo de recuperación *«Borrador Recuperado: Se detectó un borrador sin consolidar para esta escena con 1 figuras. ¿Cómo deseas continuar?»*.
    - `screen_draft_restored.png`: Al pulsar *«Continuar con el borrador (Recomendado)»*, el personaje Eldrin se restablece inmediatamente en su posición intacta en el lienzo.
  - *Comprobado mediante pruebas de integración local:* 350/350 pruebas aprobadas (100%), 0 regresiones.
- **Resultado:** sistema de optimización multimedia, persistencia resiliente ante cierres y respaldos autónomos verificado de extremo a extremo en Android y sincronizado con el manual.

## 2026-09-04 — MAN-025: Dirección rápida de personajes desde el control remoto

- **Versión:** árbol de trabajo local con cambios concurrentes preservados.
- **Alcance de uso:** flujo **Modo Dirección** de la previsualización del control remoto.
- **Cambios implementados:**
  1. Botón **Añadir** en la tira superior para abrir la biblioteca sin salir del escenario; la biblioteca permite buscar por nombre o rol.
  2. Botón de puerta junto a cada ficha para alternar directamente entre escenario y reserva. La reserva conserva la posición existente.
  3. Los personajes añadidos reciben una posición inicial entre siete candidatos, eligiendo el espacio más alejado de las figuras visibles para reducir solapamientos.
  4. El arrastre ignora movimientos involuntarios menores a 10 px, conserva coordenadas con precisión de 0,1% y muestra una copia semitransparente de cada figura desplazada junto con las coordenadas de la figura principal.
  5. Al soltar en modo En Vivo se emite una sola actualización transaccional de estado y su confirmación conserva la instantánea aplicada; se eliminó el envío duplicado que acompañaba cada movimiento del director.
- **Manual actualizado:** catálogo de personajes y sección **Modo Dirección Táctil y Composición de Escenas**.
- **Evidencia de código e integración local:** 63 suites y 353 pruebas unitarias aprobadas; `tsc -b` y compilación Vite de producción correctas. Se añadieron pruebas para entrada/reserva de una pulsación, acceso a biblioteca, tolerancia de 10 px, precisión subporcentual y conservación de la instantánea confirmada por la Mesa.
- **Comprobación visual:** bloqueada. El controlador de UI no pudo inicializar sus recursos (`failed to write kernel assets`), aun después de reiniciarlo. No se atribuye validación visual a las pruebas DOM.
- **Pendiente de prueba completa:** confirmar en dos dispositivos físicos control ↔ Mesa la latencia percibida, la recepción única de cada movimiento y la entrada/reserva durante una partida real.
- **Resultado:** implementación y manual actualizados; recorrido visual y prueba física pendientes por el bloqueo indicado.

## 2026-09-04 — MAN-024: Ergonomía táctil y despeje visual en edición Android

- **Versión:** árbol de trabajo local con refactorización de `SceneCanvasComposer.tsx` y suite `sceneCanvasComposer.test.ts`.
- **Entorno:** entorno de pruebas unitarias Vitest (340 pruebas aprobadas, 60 suites), verificación de tipos con `npx tsc -b`, empaquetado Vite y compilación de APK nativo de depuración con Gradle (`assembleDevDebug`).
- **Alcance:**
  1. **Cabecera compacta y despejada:** Eliminación de competencia espacial en teléfonos. Botón `Guardar` condensado, estado de borrador continuo en segundo plano y menú secundario (`⋮`) para «Añadir a preparación» y «Cambiar fondo».
  2. **Lienzo limpio sin obstrucciones:** Eliminación de la barra flotante invasiva sobre el escenario. Todo el ajuste de la figura activa se centraliza en la bandeja inferior.
  3. **Panel inferior contextual unificado:** Comparte exactamente la misma altura (185px) que la bandeja de pestañas normal para evitar brincos o desajustes del lienzo 16:9. Incluye cabecera con avatar, nombre, botones de espejo, capas, retirar y el control de retorno directo «✕ Volver a herramientas».
  4. **Tolerancia táctil a temblores (touchSlop de 10px):** Distinción matemática entre toques de selección y arrastres intencionales. Tocar una figura o un leve temblor no modifica sus coordenadas ni ensucia el borrador; el arrastre arranca superados los 10px y preserva el punto de agarre relativo exacto del dedo.
  5. **Cruceta D-Pad con pasos de píxeles reales de escenario:** Selector calibrado para el lienzo de 1920×1080: Fino (1px = `1/1920` X, `1/1080` Y), Normal (5px) y Amplio (20px), independiente del zoom visual del director y compartiendo la misma función de límites de escenario que el arrastre (`clampStageX`: 0.01 a 0.99, `clampStageY`: 0.02 a 0.98).
- **Archivos actualizados:** `src/components/master/composer/SceneCanvasComposer.tsx`, `src/components/master/composer/sceneCanvasComposer.test.ts`, `docs/manual/README.md` y `docs/manual/REVISIONES.md`.
- **Resultado:** 8 de 8 pruebas de compositor pasando al 100%, 340 pruebas totales del proyecto aprobadas, APK nativo `app-dev-debug.apk` compilado con éxito. Manual de usuario sincronizado.

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
## 2026-09-04 — MAN-023: Modularización Integral de Archivos Grandes (Refactorización Sin Cambios de Uso)

- **Versión:** árbol de trabajo local.
- **Entorno:** Vitest 57 suites con 326 pruebas aprobadas (100%), compilación de producción con Vite y TypeScript (`tsc -b && vite build`) aprobada en 1.13s con código 0 y 0 errores de tipado.
- **Alcance y Verificación Técnica:**
  1. **Modularización de `CharacterDirectorOverlay.tsx` (Reducido de 2.176 a 458 líneas):**
     - Desacoplado en componentes cohesivos y hooks reutilizables bajo `src/components/master/director/`:
       - `directorTypes.ts`: interfaces y tipos compartidos del overlay.
       - `DirectorChipsStrip.tsx`: tira horizontal superior para alternar personajes en escena y reserva.
       - `DirectorTopBar.tsx`: barra superior con modos de selección, guías visuales y selectores de cámara.
       - `DirectorBottomBar.tsx`: barra flotante táctil compacta para voz, expresión, visibilidad, presencia y panel «Más…».
       - `DirectorMoreDrawer.tsx`: cajón inferior móvil con controles agrupados de presencia, encuadre, transformación y organización.
       - `DirectorModals.tsx`: modales contextuales de calibración de apoyo, presets de cámara, orden de capas relativas y waypoints.
       - `useDirectorDrag.ts`: hook de cálculo de arrastre táctil rígido y acotado dentro de los límites del viewport.
  2. **Modularización de `MasterController.tsx` (Reducido de 3.531 a 2.604 líneas):**
     - Desacoplado en submódulos especializados bajo `src/components/master/controller/`:
       - `useStormCoordinator.ts`: loop estocástico de tormenta y rayos automáticos con dispatching desacoplado.
       - `useDirectorHandlers.ts`: encapsulación de callbacks de gestión de personajes, waypoints, props y regiones de oclusión.
       - `MasterMainTabs.tsx`: renderizado limpio de las pestañas principales (Vista Clásica, Momentos, Combate, Notas y Biblioteca).
  3. **Modularización de `SceneCompositorModal.tsx` (Reducido de 1.452 a 480 líneas):**
     - Desacoplado bajo `src/components/master/compositor/`:
       - `compositorTypes.ts`: helpers de posicionamiento y tipos compartidos de entidades seleccionadas.
       - `CompositorStage.tsx`: canvas interactivo 16:9 con arrastre unificado de figuras y decorados, guías de aspecto y barra de presets.
       - `CompositorSidebar.tsx`: barra lateral derecha con filtros de capas, lista de profundidad Z y controles de transformación.
       - `CompositorModals.tsx`: modales de adición de prop, guardado de composiciones y carga de presets de escena.
  4. **Modularización de `SessionPanel.tsx` (Reducido de 1.173 a 485 líneas):**
     - Desacoplado en subcomponentes bajo `src/components/master/sessionPanel/`:
       - `ActiveSceneCard.tsx`: tarjeta completa de la escena en vivo con vista previa, chips de estado, selector de tono, acciones rápidas, encuadre y variantes.
       - `NextSuggestedSceneCard.tsx`: tarjeta de la siguiente escena sugerida / borrador en preparación con controles de publicación rápida.
       - `OverwriteStagingModal.tsx`: diálogo modal de confirmación ante reemplazo de borrador en preparación.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 326/326 pruebas aprobadas (100%), compilación Vite exitosa en 1.13s, y verificación completa de paridad de contratos de UI.
  - *Resultado de uso:* Sin cambios de uso visual para los jugadores ni para el director; se preservaron intactos los contratos visuales, la persistencia en IndexedDB, las clases CSS de testing y el bus de comandos.
- **Resultado:** registro de revisiones actualizado con MAN-023.

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

## 2026-09-04 — MAN-020: Puesta al día de la app Android (v1.1.0), Conservación de Datos y Adaptación Responsive para Móviles y Tablets

- **Versión:** Versión Android 1.1.0 (versionCode 2, buildId 2026.09.04.1, protocolo de sincronización v2).
- **Entorno:**
  - Dispositivos físicos Android conectados mediante ADB: Tablet Samsung Galaxy Tab A8 (Android 14, 1200x1920, 240 dpi) y Smartphone Motorola One Fusion (Android 11, 720x1600, 280 dpi).
  - Pruebas unitarias automatizadas en Vitest (59 suites, 332 pruebas aprobadas al 100%).
  - Compilación de producción con TypeScript/Vite (`built in 9.39s`, 0 errores).
  - Sincronización con Capacitor 8 y compilación nativa Gradle (`assembleDevDebug` exitoso en 4m 15s).
- **Alcance y Verificación Técnica:**
  1. **Auditoría e Instalación Segura sin Pérdida de Datos (Serie 1, Preguntas 1 y 2):**
     - Se realizó diagnóstico previo en los dos dispositivos físicos. Se identificó que la versión instalada correspondía a `versionCode 1` (`1.0.0-dev`).
     - Se extrajeron respaldos físicos de seguridad del almacenamiento IndexedDB en `/data/data/com.akkarinrothen.visualplayer.dev/app_webview/Default/IndexedDB/https_localhost_0.indexeddb.leveldb` (`tablet_indexeddb.tar` y `phone_indexeddb.tar`).
     - Se incrementó la versión a `versionCode 2`, `versionName "1.1.0"` en `android/app/build.gradle`.
     - Se ejecutó la actualización mediante `adb install -r -d` sobre las instalaciones existentes (sin desinstalación previa).
     - Se verificó mediante `dumpsys package` y listado de archivos que `versionCode=2` quedó activo y los datos de Dexie/IndexedDB se conservaron íntegros.
  2. **Identificación de Versiones y Matriz de Compatibilidad (Serie 1, Pregunta 3 y Serie 2, Pregunta 6):**
     - Implementado `src/version.ts` con `PROTOCOL_VERSION = 2`, `APP_CAPABILITIES` (waypoints, oclusión, iluminación, revelaciones, ducking, temporizador de combate, variantes y decorados interactivos).
     - La Mesa emite `AuditMesaReport` con su versión, buildId, versión de protocolo y lista de capacidades soportadas.
     - `evaluateVersionCompatibility` analiza las capacidades. Si hay incompatibilidad de protocolo se muestra un banner crítico en `MasterController`, y si hay funciones no disponibles se muestra un aviso de capacidades limitadas sugiriendo actualizar la Mesa al finalizar la sesión.
  3. **Adaptación Responsive y Separación del Escenario Lógico 16:9 (Serie 2, Preguntas 5, 6 y 8):**
     - En teléfonos móviles (`< 900px` o portrait), la interfaz se apila verticalmente y activa una barra de navegación inferior accesible al pulgar (`MasterBottomNav`).
     - En tablets landscape (`>= 900px`), se utiliza un diseño de 2 columnas con ancho flexible `clamp(350px, 34vw, 480px)`. El escenario 16:9 conserva su proporción fija a la izquierda sin deformarse ni recortarse, mientras los controles se desplazan a la derecha con scroll independiente.
     - Se agregaron variables CSS `--sat`, `--sab`, `--sal`, `--sar` mapeadas a `env(safe-area-inset-*)` con `viewport-fit=cover` para proteger la interfaz contra recortes de cámara frontal (*notch*) y barras de navegación del sistema.
  4. **Pila LIFO de Prioridad para el Botón Atrás de Android (Serie 3, Pregunta 10):**
     - Implementado `backButtonStack.ts` con orden estricto de consumo:
       1. Teclado virtual (desenfoca inputs sin cerrar ventanas).
       2. Gestos de arrastre o edición activa en el escenario.
       3. Menús y cajones laterales.
       4. Ventanas modales (del más reciente al más antiguo).
       5. Vistas expandidas.
       6. Navegación entre pestañas.
       7. Diálogo de confirmación antes de salir al Lobby.
- **Diferenciación de Evidencia:**
  - *Comprobado en hardware real Android:* Despliegue de actualización sobre Samsung Galaxy Tab A8 y Motorola One Fusion mediante `adb install -r -d`, verificación de `versionCode=2` en `dumpsys package`, y conservación de archivos LevelDB de IndexedDB.
  - *Comprobado mediante pruebas de código e integración local:* 332/332 pruebas aprobadas (100%), 3 pruebas de versión en `src/domain/protocol/version.test.ts`, 3 pruebas de navegación en `src/services/backButtonStack.test.ts`, compilación TypeScript/Vite exitosa en 9.39s y compilación Gradle de APK exitosa.
  - *Pendiente de comprobación física extendida:* Partida interactiva de larga duración con control y mesa conectados entre el teléfono y la tablet una vez recargada la batería de los dispositivos.
- **Resultado:** app Android actualizada a v1.1.0, datos existentes conservados, interfaz adaptada a móvil y tablet, y documentación de uso y revisiones actualizada con MAN-020.

## 2026-09-04 — MAN-021: Modularización Arquitectónica de MasterController (`/goal`)

- **Versión:** árbol de trabajo local con refactorización modular profunda de `MasterController.tsx`.
- **Entorno:**
  - Pruebas unitarias automatizadas en Vitest: 59 suites ejecutadas, 332/332 pruebas aprobadas al 100%.
  - Compilación de producción estricta con TypeScript (`tsc -b`) y Vite finalizada en 4.26s con 0 errores de tipado.
  - Sincronización con Capacitor (`npx cap sync android`) exitosa en 0.44s.
  - Compilación nativa Gradle (`assembleDevDebug`) exitosa en 29s sin errores.
- **Alcance y Cambios de Arquitectura:**
  1. **Reducción de Complejidad en `MasterController.tsx`:** Reducido de **2.714 a 905 líneas** (reducción del 67% del archivo), desacoplando lógica de dominio en controladores especializados.
  2. **`useSessionSceneHandlers.ts`:** Encapsula la gestión de variantes de escena, perfiles sonoros y situaciones de bioma, iluminación por capas, emisores de zona, interacciones de objetos con sincronización de estado del mundo, diálogos cinematográficos con acciones idempotentes, handouts proyectados y crónicas de sesión.
  3. **`useCombatCoordinator.ts`:** Encapsula el avance y retroceso de turnos de combate, sincronización de la cámara con el combatiente activo, temporizador cinematográfico de combate y atenuación inteligente (*ducking*) del audio ambiental durante la voz del director.
  4. **`useCampaignManagement.ts`:** Encapsula el cambio, duplicación y borrado de campañas, invocación y retiro de figuras, asignación de expresiones faciales y anclas visuales, lanzamiento de dados y copias de seguridad JSON.
  5. **`MasterHeader.tsx`:** Componente desacoplado para la cabecera completa del director (título de campaña, barra rápida de momentos, historial, checkpoints, diagnóstico, chip de transporte, avisos persistentes de reconexión, modo caos, compatibilidad de versión y secuencias activas de macro, conmutador de modo En Vivo/Preparación, vista previa en miniatura y disparadores de pánico).
  6. **`MasterPrimaryModals.tsx`:** Desacopla la capa de modales directos (publicación selectiva, previsualización a pantalla completa, diagnóstico de red, historial de acciones, checkpoints, selector de campaña, editores de escenas y personajes, invocación, código QR y diagnóstico de red).
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración local:* 332/332 pruebas aprobadas (100%), 0 regresiones funcionales, compilación de TypeScript/Vite exitosa en 4.26s y compilación Gradle de APK exitosa.
  - *Comprobación visual y de uso:* Sin cambios de cara a la interfaz del usuario ni a la experiencia de los jugadores; todos los controles, nombres, atajos de teclado y diálogos permanecen idénticos.
- **Resultado:** modularización técnica completada con éxito y registrada en MAN-021.











## 2026-09-04 — Corrección de fondos invisibles en la Mesa

- **Versión:** árbol de trabajo local sobre `d9ec104`; se preservaron los cambios previos de modularización y sus revisiones.
- **Causa y corrección:** `StageViewport` dependía de clases utilitarias sin definición CSS. En el navegador, la cámara y las capas del fondo medían 1600 × 0 px. Se añadieron reglas explícitas de tamaño, posición, centrado y recorte para el escenario y sus previsualizaciones en `src/index.css`.
- **Evidencia visual:** en la Mesa web local (1600 × 900), las capas pasaron a medir 1600 × 900 px y se observó el fondo de «Pueblo» con personajes y cartel; la interfaz indicaba «Master Conectado». No se modificó la campaña desde este recorrido.
- **Evidencia de código:** compilación TypeScript/Vite correcta y 19 pruebas de `stageViewportFidelity.test.tsx` aprobadas. Los tests de jsdom no renderizan Canvas; la evidencia de visibilidad procede del navegador. Vite conserva avisos de tamaño de paquetes e imports mixtos.
- **Manual:** revisados el primer recorrido y las secciones de escenarios y fondos de `README.md`. Sin cambios de uso; manual revisado. Se restituye el resultado ya documentado: ver el fondo elegido en la Mesa.
- **Límites:** no se realizó una partida completa con dos dispositivos físicos, ni instalación del arreglo en Android. No se renovaron validaciones de otras funciones.
- **Próxima comprobación:** con la versión corregida en los dispositivos, alternar un fondo predeterminado y uno subido desde archivo; revisar también la miniatura y la vista previa completa.

## 2026-09-04 — MAN-022: Flujo de Autoría y Creación Táctil en Android sin Mesa (`/goal` y `/grill-me`)

- **Versión:** árbol de trabajo local con implementación y validación integral del flujo de creación y autoría táctil en Android (`v1.1.0-dev`, `versionCode 2`).
- **Entorno:**
  - Dispositivo físico Android conectado por ADB: `motorola_one_fusion` (Android 11, resolución 720×1600 portrait, 280 dpi).
  - Compilación nativa Gradle (`assembleDevDebug`) instalada como actualización sin pérdida de datos en el dispositivo vía `adb install -r -d`.
  - Pruebas automatizadas en Vitest: 60 suites, 336/336 pruebas aprobadas (100%), incluyendo 4 nuevas pruebas en `sceneCanvasComposer.test.ts`.
  - Compilación de producción estricta con TypeScript (`tsc -b`) y Vite finalizada en 3.83s con 0 errores de tipado.
- **Alcance y Cambios Implementados:**
  1. **Acceso Autónomo sin Mesa (Serie 1, Pregunta 1):**
     - Añadida tarjeta principal en el Lobby inicial (`Lobby.tsx`): **Preparar Escenas** (*«Crear y organizar sin conectar una Mesa»*), permitiendo al director crear material, organizar campañas y componer escenas en almacenamiento local Dexie/IndexedDB sin conectar una Mesa física ni fingir una partida en vivo.
     - Implementado `WorkshopView.tsx` como centro de autoría con tres pestañas: `Escenas`, `Personajes` y `Banco de Imágenes`.
  2. **Selector Visual Unificado (`AssetPickerModal.tsx`) (Serie 2, Preguntas 4, 6 y 7):**
     - Sustituido el campo de texto obligatorio `type="url"` por un selector visual con tres fuentes: *«Desde Dispositivo»* (selector de Fotos o Archivos nativo del sistema operativo Android), *«Mi Biblioteca»* (reutilización de imágenes existentes en Dexie con miniaturas grandes y búsqueda) y *«Por Enlace»*.
     - Deduplicación automática de imágenes y almacenamiento binario inmutable mediante `registerImmutableAsset`.
     - Previsualizaciones inmediatas en encuadre 16:9 y circular/cuadrado antes de confirmar.
  3. **Compositor de Escenas Táctil a Pantalla Completa (`SceneCanvasComposer.tsx`) (Serie 3, Preguntas 8, 9, 10 y 11):**
     - Pantalla de trabajo completa dedicada exclusivamente al escenario 16:9, sin modales anidados ni menús invasivos.
     - Control táctil de zoom del editor (`-`, `100%`, `+`, `↺`) completamente desacoplado de la cámara guardada para los jugadores.
     - Bandeja inferior interactiva (`Toca para añadir`) con carrusel de figuras y posicionamiento inicial despejado sin apilamientos en el centro.
     - Arrastre táctil directo con el dedo sobre el lienzo.
     - Barra flotante contextual sobre la figura seleccionada con controles táctiles de escala (`+`/`-`), reflejo horizontal en espejo (`[|]`, `isFlipped`), reordenación de capas (`^`/`v`) y retirada a reserva (`papelera`).
  4. **Persistencia Continua y Destino Claro (Serie 4, Preguntas 12 y 13):**
     - Indicador continuo de autoguardado en segundo plano (*«✓ Borrador guardado»* en verde), resistente a giros de pantalla, llamadas entrantes o cambio de app.
     - Botón explícito **💾 Guardar Escena** para consolidar los cambios en la campaña activa.
- **Diferenciación de Evidencia:**
  - *Comprobado en hardware real Android (`motorola_one_fusion`):*
    - `authoring_screen_17.png`: Visualización de la nueva tarjeta de acceso en el Lobby.
    - `authoring_screen_18.png` / `authoring_screen_33.png`: Acceso al Taller de Preparación (`WorkshopView`) con sus pestañas y botones de creación.
    - `authoring_screen_25.png`: Apertura del selector visual `AssetPickerModal` en el teléfono móvil.
    - `authoring_screen_27.png`: Disparo y apertura real del Photo Picker nativo del sistema Android (*«Esta app solo puede acceder a las fotos que selecciones»*).
    - `authoring_screen_34.png`: Visualización del `SceneCanvasComposer` a pantalla completa en el dispositivo físico, mostrando el escenario 16:9, zoom privado de edición, estado de borrador y carrusel de personajes.
    - `authoring_screen_35.png`: Inserción táctil de *Eldrin Sombrasusurro* con marco de selección, contador actualizado a `Personajes (1)` y barra contextual flotante activa.
    - `authoring_screen_36.png`: Inserción de *Morwen del Fuego Carmesí* junto a Eldrin sin solapamiento, con barra flotante y contador `Personajes (2)`.
  - *Comprobado mediante pruebas de código e integración local:* 336/336 pruebas aprobadas (100%), 4 nuevas pruebas en `sceneCanvasComposer.test.ts`, 0 regresiones en suites de combate, display y sincronización.
- **Resultado:** flujo de autoría móvil y creación táctil sin mesa completamente funcional, verificado en dispositivo real e integrado en la documentación.

## 2026-09-04 — MAN-023: Pulido de Autoría Táctil y Traslado a Preparación (`/goal` y `/grill-me`)

- **Versión:** árbol de trabajo local con mejoras de autoría táctil y traslado a sesión (`v1.1.0-dev`, `versionCode 2`).
- **Entorno:**
  - Pruebas automatizadas en Vitest: 60 suites, 339/339 pruebas aprobadas (100%), incluyendo 7 pruebas específicas en `sceneCanvasComposer.test.ts`.
  - Compilación estricta TypeScript (`tsc -b`) y empaquetado de producción Vite finalizado con 0 errores de tipado.
  - Compilación nativa Gradle Android (`assembleDevDebug`) completada con éxito en 54s (`app-dev-debug.apk`, 5.8 MB).
- **Alcance y Mejoras Implementadas:**
  1. **Creación Contextual de Personajes sin Salir de la Composición (Pregunta 1):**
     - Botón fijo `+ Nuevo` en el inicio del carrusel de personajes de la bandeja inferior.
     - Modal rápido con nombre y selector visual de imagen (`AssetPickerModal`).
     - Acción principal *«Crear y añadir a esta escena»*: persiste la ficha del personaje en la base de datos de la campaña (`db.campaigns`) y lo inserta de inmediato en el lienzo de la escena en una posición visible y despejada, quedando seleccionado y listo para ajustar.
  2. **Tres Modos Táctiles Inequívocos (Pregunta 4):**
     - Selector táctil superior con 3 estados mutuamente excluyentes: `Figuras` (modo predeterminado para interactuar con personajes), `Vista` (para desplazamiento *pan* y zoom privado del escenario) y `Fondo` (para encuadrar la imagen 16:9).
     - Evita arrastres accidentales del lienzo mientras se ajustan personajes y viceversa.
     - Botón de restablecimiento de encuadre inicial (`Ajustar a la vista`, `↺`) en modo Vista y botón `Restablecer fondo` en modo Fondo.
  3. **Micro-ajuste con Cruceta D-Pad (Pregunta 5):**
     - Integración de botones direccionales `←`, `↑`, `↓`, `→` en la barra flotante de la figura activa.
     - Selector de paso fino (`1%` para micro-calibración o `5%` para movimiento ágil).
     - Resuelve el problema de figuras pequeñas tapadas por el dedo del usuario en pantallas táctiles móviles.
  4. **Traslado de Escenas a Preparaciones de Sesión (Pregunta 10):**
     - Componente modal `TransferSceneModal.tsx` accesible desde la tarjeta de escena en el Taller y desde el encabezado del Compositor.
     - Selección explícita de campaña y sesión de destino (o creación rápida de una nueva preparación).
     - Opciones claras de destino: *«Añadir al repertorio»* (añade la escena a `frozenScenes`) o *«Abrir en Preparación (Staging)»* (actualiza `stagedState` como borrador del director).
     - Copia profunda aislada e independiente: no muta la escena original del Taller ni publica de forma automática a la Mesa de los jugadores.
- **Diferenciación de Evidencia:**
  - *Comprobado mediante pruebas de código e integración:* 339/339 pruebas pasando (100%), verificación de límites de micro-ajuste D-pad (0.05 a 0.95), persistencia contextual y clonación profunda hacia `db.sessions`.
  - *Comprobado mediante compilación nativa:* Gradle `assembleDevDebug` exitoso y sincronización Capacitor Android limpia.
- **Resultado:** manual actualizado y flujo completo de autoría táctil y traslado a preparación consolidado.


## 2026-09-04 — MAN-024: Navegación móvil en una sola fila

- **Versión:** árbol de trabajo local con mejora de navegación táctil para el control del director.
- **Alcance:** la barra inferior móvil mantiene cuatro destinos principales: **Sesión**, **Combate**, **Momentos** y **Más**. Las opciones **Notas y dados** y **Campaña y biblioteca** se abren desde una hoja inferior, con botones táctiles amplios y respetando el área segura inferior de Android.
- **Documentación de uso:** se actualizó `docs/manual/README.md` para explicar la ubicación de estas opciones.
- **Evidencia:** revisión de código y build iniciado. La compilación quedó pendiente por errores TypeScript preexistentes en `src/domain/display/characterDirector.test.tsx`; no se realizó comprobación visual en dispositivo Android ni prueba completa con mesa conectada.
- **Resultado:** mejora implementada; validación visual y compilación completa quedan pendientes hasta resolver los errores ajenos indicados.
