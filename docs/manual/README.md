# Manual de Visual Player

Visual Player te ayuda a ambientar una partida de rol con imágenes, personajes, música y efectos. Una persona dirige desde el **Control Remoto** y el grupo mira la **Pantalla de Escena**, también llamada **Mesa**.

No necesitás saber programación. Cuando un paso diga «tocá», también podés hacer clic con el mouse.

**Primera edición · 2 de septiembre de 2026.** Comprobamos en dos pestañas del navegador local el inicio, la conexión por código y el cambio de escena mediante Preparación y Publicar Todo. Las demás instrucciones se basan en los controles revisados del proyecto y siguen pendientes de sus recorridos completos. Las pruebas en dispositivos físicos y de audio real también están pendientes. Podés consultar el alcance en el [registro de revisiones](REVISIONES.md).

## Elegí lo que querés hacer

- [Preparar tu primera partida](#primeros-pasos).
- [Crear y preparar escenas sin conectar una Mesa (Taller)](#taller-preparacion).
- [Entender En Vivo, Preparación y Publicar](#publicar).
- [Consultar todas las funciones por tarea](#catalogo).
- [Crear una campaña, escenas y personajes](#campanas).
- [Ambientar y organizar la escena](#ambientar).
- [Mostrar diálogos y documentos](#narracion).
- [Dirigir un combate](#combate).
- [Preparar momentos y accesos rápidos](#momentos).
- [Gestionar preparaciones y reutilizar sesiones](#biblioteca).
- [Continuar la historia entre partidas](#continuidad).
- [Guardar, exportar y recuperar](#guardar).
- [Resolver problemas habituales](#problemas).
- [Entender las palabras de la app](#glosario).

<a id="primeros-pasos"></a>
## Tu primera partida

### 1. Prepará los dispositivos

Necesitás tener acceso a la app en el dispositivo que usará quien dirige y en el que verá el grupo. Por ejemplo: un celular como control y una tablet como pantalla.

- **Misma versión recomendada:** Procurá usar la misma versión en ambos dispositivos. Si conectás un control actualizado (ej. v1.1.0) con una Mesa rezagada (v1.0.0), la app te mostrará un **Aviso de compatibilidad** en la barra superior advirtiendo de diferencias de protocolo o de funciones avanzadas no soportadas por la Mesa, para evitar desincronizaciones en la partida.
- **Actualizar en Android sin perder datos:** Al instalar un nuevo archivo APK de actualización, instalalo **directamente sobre la versión existente sin desinstalarla**. De esta forma, el sistema operativo conserva intactas todas tus campañas, sesiones, notas y fichas de personajes. Si desinstalás la app antes de actualizar, Android eliminará la base de datos interna.
- **Adaptación a celulares y tablets:** En celulares, los controles se adaptan verticalmente con una barra de navegación inferior cómoda para usar con el pulgar. Esa barra reúne **Sesión**, **Combate**, **Momentos** y **Más**; dentro de **Más** encontrás **Notas y dados** y **Campaña y biblioteca**. En tablets horizontales, la pantalla se organiza en dos columnas para mantener el escenario 16:9 visible a la izquierda mientras desplazás los controles a la derecha. La interfaz respeta los recortes de cámara frontal (*notch*) y las barras del sistema operativo (*áreas seguras*).
- **Botón Atrás de Android:** En dispositivos móviles, el botón o gesto Atrás nativo no cierra la app de golpe. Sigue un orden seguro: primero cierra el teclado virtual si estás escribiendo, luego cancela arrastres o cierra paneles y ventanas emergentes, y finalmente pide confirmación antes de salir al menú inicial.
- **Cambios rápidos durante la partida:** En la pestaña **Sesión**, usá **Acciones rápidas** para activar con un toque **Relámpago**, **Sacudir**, **Cartel**, **Ambiente** y **Sonidos**. Tocá **Más** para abrir acciones secundarias como **Iluminación**, **Cámara y escena**, **Mostrar recurso** y **Música ambiental**. El drawer inferior se cierra tocando afuera o después de elegir una acción.
- **Modo Partida:** Tocá **Modo mesa** para abrir una consola flotante. Desde ahí podés activar **Pantalla activa**, **Pantalla completa** u **Ocultar controles** para despejar la vista. Aunque ocultes los controles, el botón **Mesa** permanece visible para recuperarlos. Tocá **Salir del Modo Partida** al terminar.
- **Editar durante la partida:** En el control clásico de **En Vivo**, tocá **Mover personajes** dentro de **Editar escena en vivo** para abrir el editor táctil. En **Modo Dirección** podés arrastrar personajes sobre el escenario; desde **Fondo y personajes** podés cambiar el fondo y ajustar la composición antes de aplicar el cambio.
- **Escenas recientes y deshacer:** La vista **Sesión** conserva hasta cinco escenas usadas recientemente con sus miniaturas. Tocá una para volver a esa ubicación siguiendo el modo actual (**En Vivo** o **Preparación**). Después de una acción rápida, usá **Deshacer** si necesitás corregirla.
- **Panel Ahora / Después:** En la vista **Sesión**, **Ahora · En Mesa** indica la escena que está viendo el grupo y **Después · Preparado** muestra el borrador siguiente. Si hay cambios pendientes, podés tocar **Publicar** o **Descartar** directamente desde ese panel.
- **Controles según el contexto:** Durante un combate, el bloque **Contexto actual** muestra la ronda y el combatiente activo, con botones **Anterior**, **Siguiente turno** y **Ver combate**. Fuera del combate muestra el próximo paso sugerido y permite **Preparar siguiente** o **Buscar escena**.
- **Diseño compacto en Android:** En teléfonos, la cabecera deja solo la campaña, conexión y previsualización táctil; los modos y pestañas se manejan desde el panel de Sesión. Las ventanas se abren dentro de la pantalla y su contenido se desplaza internamente.
- **Editor En Vivo predeterminado:** Al abrir la pestaña **En Vivo**, Visual Player entra directamente en el modo clásico de edición. Desde ahí podés cambiar cartel, clima, iluminación, sonido, escenas y personajes. La vista alternativa de Sesión ya no se ofrece como paso separado.
- **Editor de escena en el celular:** Al tocar **Editar escena**, el editor ocupa toda la pantalla. El lienzo queda arriba, las capas y controles tienen desplazamiento propio y **Cancelar**/**Publicar a Mesa** permanecen abajo. En **Modo Dirección** podés tocar y arrastrar NPCs sin mover una ventana flotante.
- **Últimas acciones:** El **Centro de Partida** muestra las cuatro acciones más recientes, indicando si fueron **En Vivo** o **Borrador**, la escena relacionada y la hora. Tocá **Ver historial completo** para revisar o restaurar un punto anterior.

Para este primer recorrido, usá conexión a Internet. El funcionamiento sin Internet y la conexión local de Android quedan pendientes de una guía comprobada en dispositivos reales. Si vas a usar imágenes o sonidos mediante enlaces, esos enlaces también deben poder abrirse desde los dispositivos.

Podés empezar con las escenas y personajes de la campaña de demostración que carga la app. Para crear tus propios recursos, tené a mano una imagen de fondo y un retrato de personaje; la música es opcional.

### 2. Abrí la pantalla del grupo

1. En el dispositivo que verá el grupo, abrí Visual Player.
2. En **Pantalla de Escena**, tocá **Abrir en esta Pantalla**.
3. Esperá a que aparezca el código de sala, con un formato parecido a `VP-ABCD`.
4. Dejá esta pantalla abierta mientras conectás el control.

**Resultado esperado:** aparece la sala con su código y un QR, que es la imagen cuadrada que podés escanear para conectarte.

### 3. Conectá el control del director

1. Abrí Visual Player en el otro dispositivo.
2. En **Control Remoto**, escribí el código de la Mesa y tocá la flecha **Conectar**.
3. También podés tocar **Escanear Código QR**. Podés activar la cámara o elegir **Subir Foto del Código QR**.
4. Si aparece **Autorización de Master Requerida** en la Mesa, compará el código de comprobación con el del control. Si coincide, tocá **Aprobar Master**.
5. Antes de continuar, comprobá que la Mesa indique **Master Conectado** y que el control indique **Mesa OK**.

**Resultado esperado:** el director tiene sus controles y la Mesa queda lista para recibir los cambios. Comprobamos la conexión por código entre dos pestañas locales; el escaneo de QR, la aprobación manual cuando se solicite y la conexión entre dispositivos físicos necesitan su propia prueba.

### 4. Mostrá una escena

1. En el control, abrí **Sesión** y tocá **Vista Clásica**.
2. Elegí **PREPARACIÓN** para preparar el cambio de escena.
3. En **Cambiar Escenario**, elegí una escena de la campaña.
4. Tocá **Revisar y Publicar** y revisá los cambios, o **Publicar Todo** si querés enviar el borrador completo.
5. Mirá la Mesa para confirmar que aparece el fondo elegido.

**Ejemplo:** elegí una taberna para representar la llegada del grupo a una posada.

### 5. Agregá un personaje y música

1. En la Vista Clásica, buscá **Personajes en Escena** y tocá **Invocar NPC** o **+ Invocar de la Biblioteca**.
2. Elegí un personaje. Si seguís en Preparación, publicá el borrador cuando esté listo.
3. Volvé a **Vista Sesión** con **Volver a Vista Sesión**.
4. Si la escena tiene audio, tocá **Sonar Música**.
5. En la Mesa, tocá **Haz clic para habilitar sonido en la mesa** si aparece ese aviso.

**Resultado esperado:** el grupo ve el personaje sobre el fondo y escucha el ambiente de la escena. Comprobá ambos resultados en la Mesa; el control por sí solo no confirma que todo se vea y se oiga correctamente.

Algunas escenas preparadas ya traen personajes y audio. Revisá qué cargó la escena antes de invocar personajes o cambiar la reproducción.

<a id="taller-preparacion"></a>
## Crear y preparar escenas sin conectar una Mesa (Taller de Preparación)

Podés crear escenarios, importar fotos de tu dispositivo y armar personajes antes del día de la partida, **sin necesidad de abrir una sala ni conectar una segunda pantalla**:

1. En la pantalla inicial (Lobby), buscá la tarjeta **Preparar Escenas** (*«Crear y organizar sin conectar una Mesa»*) y tocá **Abrir Taller**.
2. Arriba tenés el selector de campaña para elegir sobre cuál estás trabajando o crear una nueva con el botón **+**.
3. Encontrarás tres pestañas principales:
   - **Escenas:** Muestra las escenas ya preparadas con su miniatura grande. Tocá **+ Nueva Escena** para crear una desde cero o **Componer** para modificar una existente.
   - **Personajes:** Te permite crear fichas rápidas (**+ Nuevo Personaje**) con su nombre, rol, puntos de golpe y retrato fotográfico.
   - **Banco de Imágenes:** Acceso directo a tu biblioteca de fotos locales guardadas en el dispositivo para organizarlas o reutilizarlas.

### Elegir imágenes desde Fotos o Archivos del teléfono (Selector Visual)

Ya no necesitás escribir direcciones de Internet ni copiar enlaces largos. Al tocar cualquier botón para cambiar fondo o retrato:

1. Se abre el **Selector Visual de Imágenes** con tres pestañas:
   - **Desde Dispositivo (Recomendado):** Tocá la zona de carga para abrir directamente el selector de Fotos o Archivos nativo de tu teléfono Android. Podés elegir imágenes JPG, PNG, WebP o GIF.
   - **Optimización y Compresión Adaptativa:** Para garantizar una partida fluida sin ralentizaciones ni consumo excesivo de memoria en celulares y tablets, la app optimiza automáticamente la foto seleccionada:
     - **Fondos de Escenario:** Se escalan proporcionalmente hasta un máximo de 1920×1080 píxeles.
     - **Retratos y Objetos (Props):** Se escalan hasta 512×512 píxeles preservando las transparencias.
     - **Formato WebP y Píldora de Ahorro:** La imagen se comprime en formato moderno WebP de alto rendimiento. En pantalla verás una píldora indicando el porcentaje de memoria ahorrado (ej. *«Optimizada: -68%»*). Si por alguna razón artística necesitás la resolución original exacta, podés desactivar la casilla *«Optimizar imagen»*.
     - **Deduplicación Automática:** La app calcula un código de verificación (hash SHA-256) de cada archivo; si intentás subir dos veces la misma foto, el sistema la detecta y reutiliza la copia existente sin consumir espacio adicional de tu teléfono.
     - **Miniaturas de Carga Inmediata:** Se generan miniaturas ligeras (160×160 píxeles) para que tu galería cargue al instante incluso si tenés cientos de imágenes guardadas.
   - **Mi Biblioteca:** Muestra todas las fotos que ya importaste en partidas o escenas anteriores con miniaturas cuadradas grandes y barra de búsqueda por nombre. Tocar una imagen la selecciona al instante sin volver a subirla ni duplicar espacio.
   - **Por Enlace:** Para cuando quieras pegar una dirección web tradicional si así lo preferís.
2. Al elegir una imagen, la app te muestra su previsualización en el encuadre 16:9 (para fondos) o en círculo/cuadrado (para retratos). Podés darle un nombre personalizado antes de confirmar.

### Componer cómodamente con el dedo (Compositor Táctil de Pantalla Completa)

Al crear o editar una escena desde el taller, se abre el **Compositor de Escenas a Pantalla Completa**:

1. **Lienzo Protagonista 16:9 Limpio:** La escena ocupa el centro de la pantalla con la proporción exacta que verá el grupo. Se eliminó cualquier barra flotante invasiva sobre el lienzo para que nada tape las figuras ni el encuadre.
2. **Cabecera Despejada, Guardado Continuo y Menú (`⋮`):**
   - La barra superior conserva la flecha de regreso, el nombre de la escena, el botón compacto **💾 Guardar** y la píldora verde de confirmación: **✓ Borrador guardado**.
   - **Recuperación Resiliente tras Cierres Inesperados:** La app guarda de forma instantánea y síncrona cada movimiento, figura agregada o cambio de escala. Si el sistema operativo Android cierra la app repentinamente por falta de memoria o la batería se agota mientras editás, al volver a abrir la escena en el Taller aparecerá la ventana **Borrador Recuperado**:
     - Te indicará la hora exacta del borrador y la cantidad de figuras detectadas.
     - Podés tocar **Continuar con el borrador (Recomendado)** para retomar la escena exactamente donde la dejaste, o **Volver a la versión guardada** si preferís descartar las modificaciones no consolidadas.
   - Las acciones secundarias como **Añadir a preparación** y **Cambiar fondo** se agrupan en el menú de tres puntos (`⋮`), evitando que los controles compitan por el ancho en teléfonos estrechos.
3. **Tres Modos Táctiles Inequívocos:** En la franja superior podés alternar el comportamiento del contacto con la pantalla:
   - **Figuras:** Modo predeterminado para tocar, seleccionar y mover personajes. Cuenta con un **umbral táctil de tolerancia** (10 píxeles): tocar una figura para seleccionarla o un pequeño temblor del dedo no la desplaza involuntariamente ni ensucia el borrador. El arrastre solo comienza al superar ese umbral, manteniendo exactamente el punto relativo donde apoyaste el dedo.
   - **Desplazar Vista:** Te permite mover el área de trabajo (*pan*) y hacer zoom privado sin alterar la mesa de los jugadores.
   - **Ajustar Fondo:** Arrastrá libremente sobre el lienzo para re-encuadrar fondos panorámicos 16:9, con botón directo para restablecer la vista.
4. **Panel Contextual Inferior Unificado (Altura Fija de 185 px):**
   - Para evitar que la pantalla salte o se deforme al seleccionar un elemento, tanto la bandeja de pestañas general como los ajustes de la figura seleccionada comparten exactamente la misma altura fija (185 píxeles).
   - Al tocar una figura, la bandeja se transforma automáticamente en su panel de ajuste con:
     - **Cabecera de Figura:** Retrato y nombre de la figura, botón **Espejo** (reflejo horizontal), **Capas** (adelante/atrás), **Retirar** (papelera) y el botón **✕ Volver a herramientas** para deseleccionar y regresar a las pestañas normales.
     - **Controles de Tamaño:** Botones `-` y `+` con porcentaje visible para agrandar o achicar el personaje.
     - **Cruceta D-Pad con pasos de píxeles reales:** En lugar de porcentajes genéricos, incluye un selector de pasos calibrado al lienzo de 1920×1080: **Fino (1px)** para alineación milimétrica, **Normal (5px)** para movimiento estándar y **Amplio (20px)** para desplazamientos rápidos. Comparte los mismos límites que el arrastre, permitiendo acercar personajes a los bordes de la pantalla.
5. **Crear Personajes sin salir de la Composición:**
   - En la pestaña inferior **Personajes**, el botón destacado **+ Nuevo** abre una ventana modal donde ingresás nombre y foto. Al confirmar, el personaje se guarda en la campaña y se coloca de inmediato en el escenario en una posición visible.
6. **Añadir a Preparación (Traslado seguro a una partida):**
   - Desde el menú `⋮` del Compositor podés enviar la escena a cualquier preparación activa o crear una nueva sesión en el momento, sin publicar nada automáticamente a la Mesa.
7. Tocá la flecha **Atrás** para volver al taller en cualquier momento.

---

<a id="publicar"></a>
## En Vivo, Preparación y Publicar

| Control | Qué significa para vos |
| --- | --- |
| **EN VIVO** | Los cambios de escena que hacés en este modo se envían a la Mesa. |
| **PREPARACIÓN** | Preparás un borrador del estado de la escena antes de enviarlo. También aparece como «Staging». |
| **Revisar y Publicar** | Revisás las diferencias y elegís qué cambios enviar. El diálogo permite **Publicar Seleccionados**. |
| **Publicar Todo** / **Llevar a Mesa** | Enviás el borrador completo. El nombre depende de la vista. |
| **Descartar borrador** | Abandonás los cambios pendientes y volvés al estado en vivo. |
| **Publicar Directo** | Envía la escena directamente. Usalo cuando ya estés listo para mostrarla. |

**Guardar** conserva contenido para usarlo después. **Publicar** cambia lo que recibe la Mesa. Guardar una campaña, una conversación o una composición no significa que ya esté en pantalla.

### Previsualización y los tres indicadores de la Mesa

La barra superior del director incluye una previsualización que reproduce exactamente lo que ve el grupo:
- **Escenario 16:9 con bandas neutras:** La escena se calcula en una proporción estándar (16:9) y se adapta a la forma física de la pantalla del grupo (sea televisor 16:9, tablet 16:10 o celular) rellenando los bordes sobrantes con bandas negras neutras, sin recortar ni deformar las figuras. Si el dispositivo está en vertical, la previsualización sugiere girarlo para mejorar la visibilidad.
- **Pestaña «En Pantalla»:** Muestra la última composición que la Mesa física confirmó haber recibido.
- **Pestaña «Borrador»:** Muestra lo que estás preparando antes de enviarlo.
- **Botón «Vista prevista»:** Si la Mesa acaba de conectarse y todavía no envió su primera confirmación, te permite revisar qué imagen local espera proyectar.

Debajo de la previsualización verás **tres indicadores independientes**:
1. **Estado:** Informa si la orden fue recibida (`Rev. X`), si está en tránsito (`Enviando`) o si falló (`Error`).
2. **Imágenes:** Indica si los retratos y fondos ya cargaron en la pantalla (`Img listas`) o si están descargándose (`Cargando X pend.`). Si proyectás una imagen que la Mesa todavía no tiene lista, aparecerá una advertencia: *«Imagen pendiente de descarga en la Mesa»*.
3. **Audio:** Informa si el sonido está habilitado (`Audio OK`) o si requiere atención (`Tocar Mesa`). Muchos navegadores bloquean la música hasta que alguien toca físicamente la pantalla del dispositivo de los jugadores.

Preparación se aplica al borrador de la escena. Las herramientas con acciones explícitas como **Ejecutar en Vivo**, **Proyectar a la Mesa**, **Rayo** o los efectos de sonido pueden actuar sobre la Mesa directamente. Para ensayar sonidos o conversaciones, usá su opción específica de ensayo privado. La cobertura de Preparación en las herramientas avanzadas sigue pendiente de prueba completa.

Si la app pregunta si querés reemplazar un borrador, tené en cuenta que el nuevo reemplaza los cambios que estabas preparando. Elegí **Cancelar** si necesitás revisarlos primero.

<a id="catalogo"></a>
## Catálogo de funciones

Esta lista reúne los controles encontrados en la versión local revisada. Comprobamos visualmente las vistas Sesión y Vista Clásica, y completamos el recorrido básico de conexión y publicación de una escena. Las herramientas restantes necesitan pruebas específicas; su presencia en esta lista no equivale a una prueba completa aprobada.

| Quiero… | Dónde buscar | Para qué sirve |
| --- | --- | --- |
| Conectar la Mesa y el control | Inicio: Pantalla de Escena / Control Remoto | Conectar por código o QR. |
| Mostrar la Mesa a pantalla completa | Mesa: Pantalla Completa | Aprovechar el espacio de la pantalla. |
| Organizar aventuras | Campañas / título de campaña | Crear, cambiar, duplicar o eliminar campañas. |
| Crear fondos y lugares | Campañas → Nuevo Escenario | Guardar fondo, cartel, clima, iluminación, música y notas. |
| Crear personajes | Campañas → Nuevo NPC | Guardar nombre, retrato, descripción y puntos de golpe. |
| Cambiar de escenario | Sesión → Vista Clásica → Cambiar Escenario | Elegir qué lugar mostrar o preparar. |
| Mostrar u ocultar el nombre del lugar | Sesión → Mostrar Cartel / Ocultar Cartel | Controlar el título que ve el grupo. |
| Mostrar personajes y expresiones | Modo Dirección o Vista Clásica → Personajes en Escena | Añadir, hacer entrar, retirar a reserva, mover y destacar al que habla; usar expresiones si están disponibles. |
| Colocar personajes y objetos | Sesión → Compositor | Mover, cambiar tamaño y ordenar elementos; guardar composiciones. |
| Cambiar el encuadre | Sesión → Cámara | Mostrar un plano general, enfocar al hablante o al grupo y restablecer la cámara. |
| Ambientar el lugar | Vista Clásica: clima e iluminación | Cambiar el ambiente visual de la escena. |
| Usar conjuntos de luces | Sesión → Presets Luz | Combinar luces con las actuales o reemplazarlas; guardar conjuntos propios. |
| Activar ambientes localizados | Sesión → Luces / Ambiente | Encender o apagar luces y efectos que la escena ya tenga configurados. |
| Cambiar una escena preparada | Sesión: variantes e interacciones | Aplicar variantes o acciones disponibles en esa escena. Solo aparecen cuando existen. |
| Disparar un efecto dramático | Sesión → Rayo / Temblor | Lanzar un efecto puntual. |
| Controlar relámpagos | Sesión → Auto-Tormenta / Con Destellos | Activar la tormenta automática o cambiar a **Sin Destellos**. |
| Reproducir música | Sesión → Sonar Música / Pausar Música | Controlar la música ambiental de la escena. |
| Elegir música por ambiente | Sesión → Banda Sonora | Configurar pistas según el tipo de lugar y la situación. |
| Bajar la música mientras narro | Sesión → Hablar | Atenuar el fondo mientras hablás; elegir cuánto baja. |
| Reproducir sonidos cortos | Sesión → SFX Pad | Elegir efectos y probarlos en modo privado o enviarlos a la Mesa. |
| Mostrar conversaciones | Sesión → Diálogos & Narración | Mostrar frases, narrar y avanzar por un guion. |
| Preparar un guion | Diálogos & Narración → Nuevo | Crear intervenciones, notas privadas, acciones y ensayar. |
| Revelar una identidad gradualmente | Sesión → Revelaciones | Mostrar rostro o nombre cuando el personaje lo permita. |
| Mostrar mapas o pistas | Sesión → Documentos / Handout en Mesa | Proyectar páginas con imágenes y revelar partes gradualmente. |
| Gestionar una batalla | Combate | Combatientes, iniciativas, turnos, puntos de golpe y condiciones. |
| Reutilizar encuentros | Combate → Encuentros Guardados | Recuperar encuentros preparados y gestionar refuerzos. |
| Controlar el tiempo por turno | Combate: reloj | Iniciar, pausar, reiniciar, añadir tiempo y elegir si se muestra. |
| Encadenar efectos | Momentos | Preparar y ejecutar una secuencia de acciones. |
| Tener acciones a mano | Sesión: favoritos | Guardar accesos a escenas, momentos y sonidos. |
| Consultar notas y tirar dados | Notas DM (Notas en la barra móvil) | Escribir notas de escena y tirar d4, d6, d8, d10, d12, d20 o d100. |
| Registrar lo descubierto | Sesión → Diario | Consultar revelaciones, estado del mundo y pendientes. |
| Preparar la próxima partida | Sesión → Preparar Sesión | Revisar continuidad y cargar una preparación en borrador. |
| Mostrar «Anteriormente…» | Sesión → Crónica | Crear y proyectar un resumen con diapositivas. |
| Llevarme un resumen escrito | Sesión → Exportar Crónica | Revisar el texto, copiarlo, descargarlo o imprimirlo. |
| Corregir o recuperar un estado | Barra superior: Deshacer, Rehacer, Historial y Checkpoints | Revisar acciones y recuperar estados anteriores. |
| Ocultar la pantalla o detener una secuencia | Barra de emergencia | Blackout, Parar Momento y controles de audio. |
| Guardar una copia de campaña | Campañas → Exportar / Importar | Descargar o recuperar un archivo de campaña. |

<a id="campanas"></a>
## Crear una campaña, escenas y personajes

### Crear o cambiar de campaña

Tocá el título de la campaña en la parte superior, o **Campañas → Cambiar Campaña**. En **Tus Campañas & Aventuras**, elegí una existente o **Nueva Campaña**. Completá el título y la descripción y usá el botón de creación del formulario.

La misma ventana ofrece duplicar y eliminar campañas. Duplicar puede servirte para preparar una variante de la aventura. Antes de eliminar contenido propio, guardá una copia con **Exportar**.

### Crear una escena

1. Entrá en **Campañas → Nuevo Escenario**.
2. Completá **Nombre de la Escena** y **Imagen de Fondo (URL o Subir Archivo)**. Una URL es un enlace a la imagen.
3. Si querés, agregá el **Banner Principal** (el cartel del lugar), subtítulo, clima, iluminación y un enlace de audio ambiental.
4. Escribí tus recordatorios en **Notas Secretas del DM**.
5. Tocá **Crear Escena**. Para editar una existente, usá el lápiz de **Editar Escenario** y luego **Guardar Cambios**.
6. Para mostrarla, elegila desde **Cambiar Escenario** y publicala si estás en Preparación.

**Ejemplo:** «Posada del Dragón», una imagen de la taberna y el subtítulo «Al caer la noche».

La app exige que quede al menos un escenario en la campaña. Las opciones de clima e iluminación del editor y de la Vista Clásica pueden tener nombres distintos en esta versión.

### Crear y mostrar un personaje

1. Entrá en **Campañas → Nuevo NPC**.
2. Completá nombre, rol o título, puntos de golpe, retrato y las notas que necesites.
3. Guardá el personaje con el botón del formulario.
4. En **Vista Clásica → Personajes en Escena**, abrí la biblioteca de invocación y elegilo.
5. Ajustá su posición o destacalo como hablante. Para sacarlo de la escena, usá **Quitar de Pantalla**.

Quitar un personaje de pantalla conserva su ficha en la campaña. Eliminarlo desde la biblioteca es una acción diferente.

<a id="ambientar"></a>
## Ambientar y organizar la escena

### Fondo, clima, cartel y música

En **Vista Clásica** encontrás los controles para cambiar el escenario, editar el cartel, ajustar el clima y la iluminación, y controlar el audio ambiental. Para el primer ensayo, hacé un cambio por vez y comprobá el resultado en la Mesa.

Desde **Sesión** tenés accesos a **Mostrar Cartel**, **Rayo**, **Temblor** y la reproducción de música. **Sin Destellos** está destinado a suprimir el destello de los relámpagos manteniendo el trueno; queda pendiente comprobar su comportamiento en los dispositivos de la partida.

### Música por lugar y sonidos

En **Banda Sonora**, elegí el tipo de lugar y la situación; agregá la **Pista Musical** y, si querés, una **Capa Ambiental Continua**. Usá **Probar en Auriculares** para ensayar en el dispositivo del director, **Guardar en Campaña** para conservar la configuración y **Proyectar Tono a la Mesa** para aplicarla.

En **SFX Pad**, seleccioná un banco y un efecto. Revisá si está en **Ensayo Activo (Local)** o **Modo Mesa (Público)** antes de tocarlo. **Detener SFX** permite detener los efectos. Si ensayás cerca de los jugadores, conectá auriculares al dispositivo del director para que no escuchen su altavoz.

**Hablar** baja el fondo para facilitar la narración. Al terminar, volvé a tocar el control para salir del estado **Hablando (Ducked)**. Esto no graba ni transmite tu voz: controla la atenuación del sonido.

### Mover personajes, objetos y cámara

1. Abrí **Sesión → Compositor** o tocá **Modo Dirección** en la previsualización superior.
2. Seleccioná un personaje u objeto y arrastralo a su lugar. Ajustá tamaño y el orden de frente/fondo según corresponda.
3. **Objeto** permite agregar un elemento de decorado mediante su nombre e imagen independiente.
4. Podés guardar la disposición con **Guardar Preset** y recuperar una con **Cargar**.
5. Confirmá con **Publicar a Mesa (ACK)** o **Guardar en Borrador**, según el modo activo.

**Ejemplo:** colocá al tabernero detrás de una barra y al visitante delante. Si el encuadre queda demasiado cerca, usá **Cámara → Restablecer**.

### Tácticas y formaciones en escena

Para organizar rápidamente a un pelotón de enemigos o a los aventureros sin tener que acomodar a cada uno a mano:

1. Tocá **Seleccionar varios** en la barra superior del Modo Dirección.
2. Para marcar a todas las figuras presentes en el escenario a la vez, tocá **Seleccionar todos**. También podés tocar cada figura individualmente para sumarla al grupo.
3. Cuando tengas 2 o más figuras seleccionadas, tocá el menú **Formación ▾**:
   - **Fila horizontal:** Despliega a las figuras en una sola línea ordenada, centradas alrededor de la figura principal.
   - **Semicírculo:** Forma un arco envolvente alrededor del centro, ideal para rodear a un prisionero o proteger un umbral.
   - **Flancos (Alas):** Separa al grupo en dos alas simétricas a izquierda y derecha, dejando a la figura ancla en el centro.
   - **Racimo (2 filas):** Organiza a las figuras en dos filas escalonadas y compactas, listas para un avance militar.
4. **Compresión elástica automática:** Si aplicás una formación cerca de un extremo de la pantalla, la app comprime las distancias suavemente para que ninguna figura se salga de los límites del escenario ni quede cortada.
5. **Guardar formación personalizada:** Si acomodaste a tus figuras en una disposición táctica propia (ej. una escolta en cuña o una emboscada dispersa), tocá **Formación ▾ → Guardar formación actual...**, poné un nombre (ej. *«Guardia de honor»*) y confirmá. La formación quedará disponible en el menú para aplicarla a cualquier otro grupo de personajes en cualquier momento.

### Guías magnéticas e imán inteligente

Para alinear figuras con precisión sin tener que medir porcentajes con el ojo:

1. En la barra superior, activá el botón **Imán**.
2. Al arrastrar cualquier figura o grupo de personajes, sentirás que la posición se "imanta" automáticamente cuando estés cerca de puntos clave:
   - **Línea de suelo (0%):** Para que los personajes apoyen los pies exactamente en el suelo del escenario.
   - **Eje central (50%):** Para centrar al interlocutor principal o una criatura monumental.
   - **Tercios de escena (33% y 67%):** Para composiciones visuales equilibradas basadas en la regla de los tercios.
   - **Puntos narrativos guardados:** Para colocar a la figura con exactitud sobre una puerta, mostrador o altar.
3. Al engancharse magnéticamente, la app dibuja una línea guía punteada luminosa con el nombre de la referencia y emite una suave vibración háptica en tu teléfono para confirmar el enganche sin que tengas que apartar la mirada de la escena.
4. Para mover con absoluta libertad continua sin ninguna atracción, simplemente volvé a tocar **Imán** para desactivarlo.

### Seguir en Mesa en vivo

En la barra superior podés activar el conmutador **Seguir en Mesa** (disponible cuando el destino es la Mesa en vivo). Al tenerlo activo, los jugadores ven moverse la figura por el escenario mientras arrastrás tu dedo, con envíos agrupados para que la conexión permanezca fluida. Al soltar, la posición definitiva queda confirmada.

### Duplicar figuras rápidamente

Para añadir refuerzos idénticos durante un combate (por ejemplo varios guardias o lobos) sin tener que buscarlos en la biblioteca ni reconfigurar su tamaño:

1. Tocá la figura en escena.
2. En la barra rápida inferior, tocá **Duplicar**.
3. La app crea una copia a su lado (+6% a la derecha) y numera automáticamente las etiquetas privadas del director (ej. el original pasa a llamarse *«Guardia 1»* y la copia *«Guardia 2»*, *«Guardia 3»*, etc.). Las fichas base de tu campaña no se modifican y aparece un aviso con el botón **Deshacer** por si tocaste por error.

### Ocultación detrás del decorado (Regiones de oclusión)

Cuando un elemento clave del decorado (como un mostrador de madera, un pilar de piedra o una balaustrada) ya forma parte de la imagen de fondo, podés hacer que los personajes queden físicamente detrás sin necesidad de recortar la imagen original en un editor externo:

1. En el **Modo Dirección**, abrí el visor de capas de escena (botón **Capas** en la barra superior o en el panel de personaje).
2. Tocá **Nueva región oclusión**.
3. Escribí un nombre descriptivo (ej. *«Mostrador taberna»* o *«Pilar izquierdo»*) e indicá su posición (`X`, `Y`) y tamaño (`Ancho`, `Alto`) en porcentaje de la pantalla.
4. Asigná el nivel de capa (`zIndex`). Por ejemplo, con capa 15, cualquier personaje con capa 10 quedará oculto por detrás de esa parte del fondo, mientras que un cliente con capa 20 se verá por delante.
5. Tocá **Crear región**.

**Resultado esperado:** la región clona con precisión subpíxel la porción del fondo y se intercala entre las figuras. Los nombres de las regiones de oclusión son privados del director y nunca se muestran al grupo.

### Puntos narrativos de escena (Waypoints)

Para mover personajes rápidamente entre ubicaciones recurrentes de la historia (como *«En la puerta»*, *«Detrás de la barra»* o *«Junto al fuego»*) sin tener que adivinar las coordenadas a mano cada vez:

1. Colocá a una figura en la posición deseada dentro del escenario.
2. Tocá el botón **Más…** en la barra inferior del personaje y buscá la sección **Puntos Narrativos de Escena**.
3. Tocá **Guardar como punto…**, escribí el nombre del punto (ej. *«Entrada principal»*) y confirmá. El punto queda guardado de forma permanente para esa escena.
4. Para mover a cualquier personaje a ese punto, tocalo, abrí **Más… → Mover a punto…** y elegí el destino.
5. Podés elegir entre movimiento **Instantáneo** (teletransporte inmediato) o **Suave (0.4s)** (desplazamiento cinematográfico visible en la Mesa).
6. Si otro personaje ya está ocupando esa ubicación, la ventana te advertirá con un aviso amarillo para evitar solapamientos accidentales.

### Legibilidad de nombres y condiciones

Para evitar que los nombres tapen los rostros o las peanas de criaturas pequeñas o en composiciones apretadas:

1. En **Más… → Posición de la etiqueta**, podés elegir entre:
   - **Auto:** La etiqueta se ubica en la base, pero si hay subtítulos de diálogo activos y el personaje está abajo (`Y < 18%`), la app eleva la etiqueta automáticamente sobre su cabeza para que no quede tapada.
   - **Abajo:** Siempre al pie de la figura.
   - **Arriba:** Siempre flotando sobre la cabeza.
   - **Lateral:** Al costado derecho de la figura, ideal para tokens compactos.
2. Los nombres largos se truncan con puntos suspensivos sin desbordar los márgenes de la figura.
3. Si un combatiente acumula varias condiciones de combate, la Mesa muestra las dos primeras y agrupa las restantes en una insignia compacta `+N` (ej. `+2`) para no saturar la imagen.

En **Presets Luz**, elegí un conjunto y decidí entre **Combinar con Actuales** o **Reemplazar Iluminación**. Las variantes, interacciones, revelaciones y efectos localizados solo aparecen cuando la escena o sus personajes tienen esa información preparada. La creación completa de esos recursos necesita un recorrido específico y no se da por comprobada en esta edición.

<a id="narracion"></a>
## Mostrar diálogos y documentos

### Diálogos y narración

En **Sesión → Diálogos & Narración** podés elegir quién habla, escribir una frase y tocar **Lanzar**. Para reutilizar un guion, usá **Nuevo**, añadí intervenciones, elegí narrador o personaje y completá sus textos. Podés ordenar las frases y probarlas con **Modo Ensayo** antes de **Guardar**.

Al usar una conversación guardada, los controles incluyen **Mostrar** o **Actualizar**, **Anterior**, **Siguiente**, **Completar** (mostrar el texto completo) y **Ocultar**. Una frase también puede tener acciones de cámara o un Momento asociado. **Repetir acciones** vuelve a disparar sus efectos: usalo solo si querés repetirlos.

Las notas privadas y las ramas de conversación tienen controles separados del texto para jugadores. Escribí allí tus recordatorios y reservá el texto público para lo que querés mostrar. La comprobación de privacidad con dos dispositivos está pendiente.

### Mapas, cartas y pistas: Handouts

Un *handout* es un material visual que mostrás al grupo, como una carta, un mapa o una pista.

1. Abrí **Sesión → Documentos**. Si ya hay uno proyectado, el botón puede decir **Handout en Mesa**.
2. Prepará el título y la **URL de imagen** de la página. **Página** permite añadir más páginas.
3. Elegí la página y usá **Proyectar Pág. … a la Mesa** o **Mostrar Pág. … en Mesa**.
4. Usá **Pincel** o **Recuadro** para descubrir regiones cubiertas. **Mover** desplaza la imagen sin pintar.
5. Podés **Deshacer**, **Ocultar Todo**, **Revelar Todo** y ajustar el acercamiento.
6. Si aparece **Actualizar en Mesa**, usalo para enviar la edición. Para cerrar la presentación, tocá **Retirar de la Mesa**.

**Ejemplo:** mostrale al grupo una parte del mapa y descubrí una habitación cuando entren. Esta guía describe páginas basadas en imágenes; la importación directa de archivos PDF no está comprobada.

<a id="combate"></a>
## Dirigir un combate

1. Abrí **Combate** y agregá participantes con **+ Combatiente**, con sus nombres, iniciativas y puntos de golpe.
2. También podés usar **Importar Campaña** para incorporar personajes al combate o **Encuentros Guardados** para recuperar uno preparado. Este **Importar Campaña** es distinto del botón que restaura un archivo de copia de seguridad.
3. Revisá las iniciativas o usá **Tirar Iniciativas**.
4. Tocá **Iniciar Combate**. Cuando corresponda, usá **Desplegar a la Batalla** para llevar los participantes a escena.
5. Avanzá con **Siguiente** y corregí con **Anterior**. Ajustá los puntos de golpe y asigná condiciones a cada participante según lo ocurrido en la partida.
6. **Condiciones y estados:** tocá los iconos de condición (En Llamas, Envenenado, Aturdido, Ciego, Derribado, Apresado, Hechizado, etc.) para agregarlos o quitarlos en un toque. En la Mesa se muestran hasta tres insignias por combatiente; si acumula más, se agrupan en un indicador `+N` para mantener limpia la visualización. Las condiciones marcadas como privadas no se proyectan a la Mesa. La condición «Invisible» no oculta automáticamente el avatar; el aspecto visual y la regla mecánica se gestionan por separado.
7. Revisá el control de visibilidad de HP de cada combatiente para decidir si el grupo ve esa información.
8. Al terminar, tocá **Finalizar Combate**.

Durante el combate, el temporizador de turno ofrece un anillo luminoso y cuenta regresiva local (sin saturar la conexión de red). Permite iniciar, pausar, sumar **30 segundos**, reiniciar y alternar la visibilidad en la Mesa. Al expirar, muestra una señal visual de tiempo cumplido y un aviso sonoro sutil, sin saltar el turno ni penalizar automáticamente al participante.

La vista de Sesión también ofrece cámara de combate en modo **Sugerir**, **Automática** o **Manual** y un botón **Enfocar**.

<a id="momentos"></a>
## Momentos y favoritos

Un **Momento** es una secuencia preparada: por ejemplo, oscurecer la pantalla, lanzar un trueno y cambiar de escena.

1. Abrí **Momentos → + Nuevo Momento**.
2. Escribí nombre y descripción; usá **Agregar Paso** para construir la secuencia.
3. Ajustá la espera y los efectos de cada paso, como Blackout, Rayo, Temblor, sonido o escenario.
4. Guardá el Momento. Usá **Cargar Borrador** para cargar su resultado en Preparación o **Ejecutar en Vivo** para reproducir la secuencia en la Mesa.
5. Mientras se ejecuta, **Parar Momento** o **Cancelar** detienen la secuencia y solicitan restaurar el estado anterior.

En la barra de favoritos de **Sesión**, abrí la gestión de favoritos, agregá escenas, momentos o sonidos y tocá **Guardar Favoritos**. Un favorito funciona como un acceso rápido; revisá qué acción contiene antes de tocarlo en una partida.

<a id="biblioteca"></a>
## Gestionar preparaciones y reutilizar sesiones

El panel del director muestra una cabecera con el nombre de la preparación activa. Tocalo para renombrarlo. El indicador a la derecha confirma el estado del guardado automático: **Guardando…**, **Guardado** o **Error de disco**.

Para abrir la **Biblioteca de Preparaciones**, tocá el botón **Biblioteca** en la cabecera de sesión.

### Biblioteca unificada y selector de campaña

La Biblioteca permite encontrar preparaciones de la campaña activa o de todas las campañas registradas en el dispositivo:
- **Selector de campaña:** en la barra superior podés alternar entre ver la campaña actual o **Todas las campañas**. La app recuerda tu última selección sin alterar la campaña activa en la mesa.
- **Búsqueda profunda:** el campo de búsqueda filtra en tiempo real por nombre de preparación, notas secretas del director, nombres de escenas (tanto en borrador como congeladas) y nombres de personajes.
- **Etiquetas (#tags):** si tus sesiones tienen etiquetas, una fila de botones te permite filtrar con un toque todas las preparaciones de una temática determinada.
- **Miniaturas y datos en tarjeta:** cada preparación muestra una miniatura de su fondo principal, la campaña a la que pertenece, número de sesión, última fecha de edición y su estado de respaldo.
- **Plantillas entre campañas:** podés consultar la lista de plantillas de cualquier campaña y tocar **Usar Plantilla** para crear una nueva preparación en tu campaña actual como copia independiente, sin alterar la plantilla original.

### Pestañas de la biblioteca

| Pestaña | Qué contiene |
| --- | --- |
| En preparación | Preparaciones que todavía no se publicaron a la Mesa. |
| En curso | Sesiones que ya tuvieron contenido publicado a los jugadores. |
| Finalizadas | Sesiones cerradas pero conservadas para referencia o duplicar. |
| Archivadas | Sesiones que ya no necesitás en la lista activa. |
| Plantillas | Diseños de sesión limpios listos para instanciar en cualquier campaña. |
| Papelera | Elementos eliminados de forma recuperable. |

### Acciones disponibles sobre cada preparación

- **Preparación:** carga el borrador guardado en el modo Preparación del panel. Es completamente independiente de los cambios posteriores en la campaña (conserva su propia versión congelada de escenas, personajes, conversaciones y documentos). No publica nada a la Mesa hasta que usás **Publicar Todo** o **Publicación Selectiva**.
- **Continuar:** disponible en sesiones en curso o finalizadas. Restaura el último estado publicado a la Mesa para reanudar la partida exactamente donde quedó.
- **Siguiente entrega (mismo grupo):** prepara la continuación directa de la historia para la misma mesa de juego. Hereda todas las consecuencias del mundo, las revelaciones descubiertas, el inventario y las notas. Podés elegir si conservar el daño recibido por los monstruos y NPCs (para encuentros a medio resolver) o curarlos. Avanza el número ordinal (`Sesión N+1`) y arranca en modo Preparación con la Mesa en blanco, lista para planificar sin proyectar nada a los jugadores.
- **Jugar con otro grupo (nueva línea de partida):** bifurca la preparación para dirigir la misma aventura a un grupo de jugadores diferente. Asigna un identificador de grupo nuevo e independiente, de modo que sus decisiones no se mezclen. Reinicia automáticamente las identidades reveladas (los personajes vuelven a mostrarse como siluetas y alias misteriosos para proteger la sorpresa), restaura la salud de los enemigos y limpia el combate, pero mantiene intactos los mapas, los props decorados, las puertas secretas abiertas intencionalmente, las luces y la música.
- **Duplicar:** crea una copia con identificadores nuevos. Podés excluir el progreso de combate, las condiciones activas y elegir si restaurar o conservar los puntos de vida de Monstruos y NPCs (útil para ensayar variantes tácticas).
- **Puntos de control:** permite consultar los checkpoints vinculados a la sesión y **Restaurar como copia**, generando una nueva preparación sin sobrescribir la actual ni emitir a la Mesa.
- **Guardar como plantilla:** genera una versión reutilizable limpia: elimina HP perdidos, combate activo y condiciones transitorias.
- **Presets de Escena Completa:** permite reutilizar un escenario entero (fondo, personajes colocados, props, luces con efectos de parpadeo, partículas, música ambiental, interacciones y diálogo vinculado). Al insertarlo en una preparación, todos sus identificadores se reasignan automáticamente para no colisionar con elementos existentes y se cargan siempre en Preparación (borrador), sin publicar ni reproducir audio en la Mesa.
- **Exportar (.vpp.json):** abre el **Diagnóstico de Exportación (Pre-Flight)**, que comprueba si todos los fondos, retratos, props, música, efectos y documentos están disponibles localmente. Intenta descargar los archivos remotos y te indica claramente si es un **Paquete 100% Autocontenido para uso sin internet** o una **Exportación Incompleta** con listado de faltantes.
- **Archivar:** mueve la sesión a la pestaña Archivadas sin borrar sus datos.
- **Enviar a papelera:** realiza un borrado seguro (soft-delete), moviendo la sesión a la pestaña **Papelera**. Podés restaurarla en cualquier momento o vaciar la papelera de forma permanente.

### Indicadores de respaldo exterior

En la cabecera del panel y en las tarjetas de la Biblioteca verás el estado de tu preparación:
- **Solo local:** la preparación existe únicamente en el almacenamiento local del navegador de este dispositivo. Nunca se ha exportado un paquete `.vpp.json`.
- **Sin respaldar:** la preparación fue exportada anteriormente, pero hiciste cambios locales posteriores que todavía no están en ningún archivo exterior.
- **Respaldado:** tenés un archivo `.vpp.json` externo al día con tu última modificación. Si todos los archivos están incrustados, la etiqueta indica respaldo 100% sin conexión; si algún recurso depende de un enlace remoto externo, el sistema lo indica como respaldo parcial.

### Crear una preparación nueva

1. En la Biblioteca, escribí el nombre en el campo **Nombre de nueva preparación** y tocá **Nueva preparación** o pulsá Enter.
2. La nueva preparación aparece en la pestaña **En preparación** y se convierte en la activa del panel.

### Importar una preparación y trasladar entre dispositivos (PC ↔ Móvil)

1. En la Biblioteca, tocá **Importar** y seleccioná el archivo `.vpp.json`.
2. La app abre la **Inspección de Importación (Diff Review)** antes de guardar nada en tu dispositivo.
3. **Control de Versiones y Conflictos:** Si ya existe una versión de esa sesión en tu dispositivo, el sistema compara las fechas y revisiones. Si tu copia local tiene partidas o avances más recientes, la app te avisa que sobrescribir borraría progreso jugado y te recomienda **Importar como copia paralela**.
4. Podés verificar si el paquete es completo para uso sin conexión, cuántas escenas y personajes incluye y si hay discrepancias.
5. Tocá **Importar como copia independiente (Recomendado)** para incorporar la preparación sin pisar tus escenas existentes ni emitir nada a la Mesa.

### Actualizar una sesión desde una plantilla maestra (Comparación granular)

Si mejoraste la plantilla de una aventura (por ejemplo, añadiendo un mapa secreto o un diálogo nuevo) y querés aplicar esas mejoras a una partida que ya empezaste:
- **Inspección de diferencias:** la app compara tu preparación con la plantilla y te muestra qué elementos son nuevos, cuáles fueron modificados y cuáles son idénticos.
- **Elección granular:** para cada escena o conversación modificada podés decidir si conservar tu versión (`keep_session`), actualizar a la versión de la plantilla (`overwrite_with_template`) o crear una copia paralela (`create_copy`).
- **Punto de control automático previo:** antes de aplicar los cambios, el sistema crea un checkpoint automático de seguridad por si querés revertir la sincronización.
- **Protección del progreso jugado:** no resetea los puntos de vida perdidos en combate, las condiciones activas ni las notas o revelaciones que tu grupo ya descubrió.

### Evaluación pre-partida («Lista para jugar») con soluciones en un clic

Antes de iniciar la sesión, podés pulsar **Evaluar** junto al nombre de la preparación. El sistema comprueba cuatro aspectos clave y ofrece botones de acción directa para resolver cualquier problema:
1. **Escena preparada para proyección:** verifica que haya un escenario cargado en Preparación. Si falta, ofrece **Elegir Escena de Inicio**.
2. **Activos para uso sin conexión:** comprueba que todos los fondos, retratos, props y música estén en el almacenamiento local. Si detecta enlaces externos, ofrece **Descargar Recursos Faltantes**.
3. **Retratos e identidades:** detecta personajes colocados en escena sin imagen de avatar y ofrece **Asignar Retratos Faltantes**.
4. **Protección de diálogos:** comprueba que las conversaciones y documentos estén congelados de forma independiente.

### Confianza de archivos, auditoría de espacio y sincronización entre dispositivos

- **Detección de ramas divergentes (dos dispositivos):** si modificaste la preparación por separado en tu PC y en tu móvil partiendo de la misma revisión, la app detecta la divergencia concurrente y no permite que la hora del reloj sobrescriba silenciosamente tus cambios; te recomienda importar como copia paralela.
- **Exportación limpia sin enlaces temporales:** al exportar `.vpp.json`, la app convierte cualquier referencia temporal `blob:` en datos base64 persistentes. El paquete se puede abrir en cualquier computadora limpia sin conexión a internet y tras reiniciar la app.
- **Importación transaccional protegida:** la carga de un paquete se procesa como una transacción única. Si el archivo está corrupto o se interrumpe, se cancela todo el proceso sin dejar archivos huérfanos ni preparaciones a medio importar.
- **Auditoría de espacio y eliminación segura de huérfanos:** calcula el tamaño exacto ocupado en disco por imágenes y sonidos, distinguiendo los archivos en uso, los retenidos en la papelera o en puntos de control históricos, y los archivos huérfanos. La purga de huérfanos recupera espacio en disco eliminando únicamente lo que no se usa en ninguna campaña, sesión ni historial.
- **Copia de comprobación de respaldo:** permite verificar un archivo de respaldo importándolo como copia aislada (`[Comprobación]`), comprobando su integridad sin alterar la campaña activa ni proyectar nada a la pantalla de los jugadores.
- **Migración explícita de preparaciones antiguas:** si cargás una preparación previa a los snapshots inmutables, la app la migra de forma explícita registrando la fecha y una nota informativa, protegiendo la línea base sin falsear que sea la versión original si la campaña cambió.

### Chequeo previo: «Lista para jugar»

Antes de comenzar la partida podés comprobar el estado de preparación de tu sesión. El chequeo evalúa 4 aspectos:
1. **Escena preparada:** confirma que haya una escena inicial lista para proyectar a la Mesa.
2. **Archivos sin conexión:** verifica que el 100% de los fondos, retratos, props y música estén guardados localmente en el dispositivo (sin depender de internet).
3. **Retratos y personajes:** comprueba que ningún personaje en escena tenga el retrato roto o vacío.
4. **Protección de diálogos:** verifica que las conversaciones y documentos estén congelados de forma independiente.
Si todo está en orden, el indicador confirma **«Sesión lista para jugar sin conexión a Internet»**.

### Reutilizar escenas completas mediante Presets (Guardar e Insertar)

Podés guardar cualquier escena que tengas armada en tu borrador como una pieza independiente para reutilizarla en otras sesiones o campañas:
1. **Guardar Preset:** En el panel de sesión, junto a la siguiente escena en preparación, tocá **Guardar Preset**. Escribí un nombre, una descripción y etiquetas (por ejemplo: `taberna, noche, social`). Si la escena tiene un diálogo asociado, podés vincularlo. El preset guarda el fondo, los personajes, los props decorativos, las luces, las partículas y el audio ambiental.
2. **Insertar Preset:** Tocá **Insertar Preset...** para abrir la biblioteca de escenas reutilizables.
   - **Análisis de dependencias:** La app revisa los archivos del preset antes de tocar nada y te muestra si está 100% listo sin conexión o si hay recursos faltantes.
   - **Resolución de personajes y diálogos:** Si un personaje o conversación ya existe en la campaña de destino, podés elegir entre **«Reutilizar existente»** o **«Crear copia independiente»**.
   - **Añadir como Escena Nueva:** Agrega la escena a la preparación de la sesión sin borrar lo que estabas haciendo.
   - **Reemplazar Borrador:** Reemplaza la composición actual en preparación. Crea automáticamente un punto de control previo por si querés deshacer el cambio.
   - **Protección de la Mesa:** Las operaciones con presets se realizan exclusivamente en tu borrador. No emiten nada a la pantalla de los jugadores ni reproducen sonido.

<a id="continuidad"></a>
## Continuar la historia entre partidas

### Diario y preparación de sesión

En **Sesión → Diario** encontrás **Lo que saben**, **Cómo quedó el mundo** y **Pendiente próxima sesión**. Podés añadir pistas, consultar descubrimientos y guardar notas para la próxima partida. Separá la descripción pública de las notas privadas.

En **Preparar Sesión**, recorré los pasos con **Siguiente**: revisá los conocimientos del grupo, las notas, qué estados conservar o reiniciar y la escena inicial. Revisá el resumen antes de **Cargar en Staging (Modo Seguro)**. Después comprobá el borrador y publicalo cuando empiece la partida.

### Jugar con otro grupo (Configuración Inicial Fiel y Protección de la Mesa)

Cuando dirigís la misma aventura para un grupo diferente, no querés rehacer la preparación desde cero ni spoilear la trama:
1. **Fijar Configuración Inicial:** En la cabecera del panel de sesión, el botón **Fijar Inicial** registra el estado actual de tu borrador como la línea base intencional de la aventura. El autoguardado durante la partida nunca modificará esta configuración.
2. **Bifurcar para otro grupo:** En la Biblioteca de Sesiones, tocá los tres puntos de la sesión y elegí **Jugar con otro grupo**.
3. **Restauración Fiel del Estado Preparado:** La nueva sesión arranca con los estados iniciales intencionales:
   - **Personajes conocidos:** Si el tabernero era conocido de antemano por el grupo, sigue estando descubierto.
   - **Misterios protegidos:** Los personajes o villanos que el grupo anterior desenmascaró vuelven a su silueta oculta y a su alias enigmático.
   - **NPCs heridos preparados:** Si preparaste a un guardia patrullero herido con 12 de 25 HP por una emboscada inicial, la nueva partida arranca con sus 12 HP preparados (no se cura mágicamente al 100% ni arranca con el daño de la partida anterior).
   - **Entorno preparado:** Las puertas o cofres que el grupo anterior abrió vuelven a su estado cerrado preparado.
   - **Diario limpio:** Las notas privadas, diario y decisiones del grupo previo quedan excluidos.
4. **Protección de la Mesa Conectada:** La nueva sesión arranca en modo **Preparación con la Mesa en blanco (sin publicar)**. Aunque los jugadores estén mirando la pantalla grande, no se proyectará nada ni se revelará la escena hasta que el director decida tocar **Llevar a la Mesa (ACK)**.

### Resumen de apertura y crónica escrita

En **Crónica**, usá **Generar desde Diario** o **Añadir Diapositiva**. Revisá títulos, textos e imágenes; podés ordenar las diapositivas y **Guardar en Campaña**. **Proyectar a la Mesa** muestra el resumen y **Cerrar Crónica en Mesa** lo retira.

En **Exportar Crónica**, revisá **Editar Borrador** y **Vista Previa (.md)**. Elegí **Copiar Texto**, **Descargar Markdown (.md)** o **Imprimir / PDF**. Esta última opción usa la impresión del navegador; guardar como PDF depende de las opciones del dispositivo. **Compartir** aparece cuando el dispositivo ofrece esa función.

Revisá el texto final antes de compartirlo, especialmente si agregaste contenido a mano. Una crónica escrita sirve para leer la historia; para recuperar una campaña usá su exportación de seguridad.

<a id="guardar"></a>
## Guardar, exportar y recuperar

### Respaldos Completos Autónomos (.vpbackup)

Para no depender de cables, computadoras ni comandos de terminal, Visual Player incluye un sistema de **Respaldos Autónomos**:

1. **Dónde se encuentra:**
   - Entrá al **Taller de Preparación** y tocá el botón **[Respaldos]** (disponible en la cabecera superior junto a la campaña y en la barra de Escenas Preparadas).
2. **Exportar Copia de Seguridad:**
   - En la pestaña **Exportar Respaldo**, verás un resumen de los elementos que se incluirán (campañas, escenas, personajes y fotos de la galería local).
   - Tocá **Exportar Copia (.vpbackup)** para generar y descargar un único archivo comprimido.
   - Podés guardarlo en la carpeta Descargas de tu teléfono o compartirlo por mensajería o nube a otro dispositivo.
3. **Restaurar una Copia:**
   - En el modal de respaldos, tocá la pestaña **Restaurar Copia**.
   - Tocá el área de selección para elegir tu archivo `.vpbackup` desde el almacenamiento del teléfono.
   - **Inspección Pre-vuelo Automática:** Antes de tocar tus datos, la app verifica la firma de integridad (código SHA-256) y te muestra qué contiene el archivo (cantidad de campañas, escenas y fotos).
   - **Tres Modos de Restauración según tu necesidad:**
     - **Crear Copias (Más seguro, recomendado):** Si ya tenés una campaña con el mismo nombre, le asigna identificadores nuevos e independientes para que no pierdas nada de tu trabajo actual.
     - **Fusionar y Actualizar:** Conserva tus datos actuales y añade únicamente los elementos nuevos o actualizados que vengan en el archivo.
     - **Sobrescribir Todo:** Reemplaza la biblioteca local completa por los datos del respaldo. Útil cuando cambiás de teléfono o querés restaurar un estado limpio exacto.

### Copia de seguridad individual de campaña

En **Campañas → Exportar** podés descargar una campaña puntual en formato `.json`. Guardala con un nombre y fecha reconocibles. **Importar** permite cargarla individualmente. Recordá que los archivos `.json` individuales no siempre incluyen los archivos pesados de imágenes locales, mientras que el paquete `.vpbackup` empaqueta la biblioteca multimedia completa.

### Deshacer y puntos de restauración

- **Deshacer / Rehacer:** recorren cambios del estado de la sesión. También aparecen los atajos **Ctrl+Z** y **Ctrl+Y**. No supongas que revierten una eliminación en la biblioteca o un efecto sonoro que ya se escuchó.
- **Historial:** permite revisar las acciones registradas.
- **Checkpoint:** guarda un punto de restauración local del estado de la sesión. Esperá la indicación **Guardado local**.
- **Puntos de Restauración (Checkpoints):** permite previsualizar un punto y **Restaurar** el estado a pantalla. Revisá cuál estás eligiendo antes de confirmar.
- **Reanudar:** aparece en el inicio si se detecta una sesión interrumpida. Retoma el rol y la sala registrados; comprobá después la conexión y el contenido recuperado.
- **Borrador automático de la preparación:** el panel guarda el estado de Preparación cada vez que hacés un cambio. Al reabrir la app, encontrás el borrador exacto donde lo dejaste, sin necesidad de hacer nada adicional.

**Reset Demo** borra las campañas y otros registros de biblioteca para cargar la demostración. No lo uses como solución a una desconexión ni antes de exportar las campañas que quieras conservar.

### Controles de emergencia

En la barra de emergencia, **Blackout** requiere tocar una vez y luego **¿Confirmar?** para ocultar la pantalla. **Encender** vuelve a mostrarla. **Parar Momento** aparece mientras hay una secuencia en marcha.

El control **Mute Total** se ofrece para silenciar y cambia a **Reactivar**. En esta revisión solo se confirmó en código su cambio sobre el audio ambiental; está pendiente verificar que detenga todos los canales y efectos. Para efectos en curso, revisá también **SFX Pad → Detener SFX**.

<a id="problemas"></a>
## Problemas habituales

| Qué pasa | Qué revisar |
| --- | --- |
| El panel del director queda en blanco al conectar | Recargá la app y volvé a entrar con el código de la Mesa. Si persiste, registrá en qué paso ocurre para revisar el fallo. No uses Reset Demo: borra contenido y no es una reparación del panel. |
| La cámara no lee el QR | Podés introducir el código de sala a mano o usar **Subir Foto del Código QR**. |
| El control no conecta | Revisá que la Mesa siga abierta, que el código coincida y si falta **Aprobar Master**. Consultá el estado de conexión y **Reconectar Ahora** cuando esté disponible. |
| No encuentro el QR | En la Mesa, buscá **Ver QR** o **Mostrar Código QR y PIN**. |
| Un cambio no aparece en la Mesa | Revisá si quedó en **PREPARACIÓN**, si falta publicarlo y si el control muestra **Sin Mesa**. |
| No se escucha música | Habilitá sonido en la Mesa, revisá su volumen, que la escena tenga audio, que esté en reproducción y que no esté silenciado. |
| Se escucha en el control pero no en la Mesa | Revisá si activaste el ensayo privado. También comprobá el sonido y la conexión de la Mesa. |
| No carga una imagen o una pista | Revisá el enlace y su disponibilidad desde el dispositivo que debe mostrarla o reproducirla. |
| Todo se ve negro | Revisá si está activo **Blackout** y tocá **Encender**. |
| Falta un botón avanzado | Algunas opciones requieren personajes, un combate activo o recursos configurados. Probá la vista indicada en el catálogo; la disposición en celular está pendiente de comprobación. |
| El personaje quedó fuera del encuadre | Usá **Cámara → Restablecer** y revisá su posición en el Compositor. |
| No veo mis campañas en otro dispositivo | Los datos son locales. Usá una copia exportada para trasladar la campaña. |
| Aparece «Aviso de compatibilidad de versión» | El control y la Mesa ejecutan versiones con protocolo distinto o la Mesa carece de funciones recientes. Actualizá la app del dispositivo rezagado al concluir la sesión. |
| El botón Atrás de Android no cierra la app | El botón Atrás está protegido para evitar pérdidas de datos: primero cierra el teclado, luego menús o ventanas emergentes y finalmente pide confirmación antes de salir. |

### Modo Dirección Táctil y Composición de Escenas

Podés colocar y dirigir a tus personajes directamente sobre la pantalla de previsualización sin entrar a ventanas complejas:

1. **Activar Modo Dirección:** Tocá el botón **Modo Dirección** en la esquina superior de la previsualización (o a pantalla completa). La vista previa normal permanece protegida contra toques accidentales. Al encender el modo, podés tocar figuras para seleccionarlas y arrastrarlas. Tocar el fondo deselecciona sin mover la cámara.
2. **Añadir, hacer entrar o sacar sin abandonar el escenario:** Usá la tira de personajes que aparece arriba del escenario:
   - Tocá **Añadir** para abrir la biblioteca. Podés buscar por nombre o rol; al elegir una ficha, aparece en un espacio libre del escenario para reducir solapamientos.
   - Tocá el botón de puerta a la derecha de una ficha para retirarla a reserva o hacerla entrar de nuevo con una sola pulsación. La reserva conserva su posición para que vuelva al mismo lugar.
   - Para elegir exactamente por dónde entra alguien que está en reserva, arrastrá su ficha desde la tira hasta el lugar deseado del escenario. La figura aparece semitransparente bajo el dedo antes de confirmar la entrada.
   - Tocá el resto de la ficha para seleccionarla y abrir sus acciones rápidas.
3. **Calibrar apoyo en el suelo y expresiones:** Si una imagen PNG tiene bordes transparentes debajo de los pies, la figura puede parecer que «flota». Seleccioná al personaje, tocá **Más…** y elegí **Calibrar apoyo visual…**. Ajustá el deslizador sobre el fondo cuadriculado para que los pies toquen la línea roja de suelo:
   - **Guardar en esta figura:** Aplica la corrección únicamente a esta instancia en el escenario actual.
   - **Guardar apoyo (Ficha/Biblioteca):** Guarda la calibración en la ficha del personaje para la expresión activa. Al cambiar de gesto (sonrisa, asombro, ira) con márgenes transparentes diferentes, la app aplica automáticamente la calibración correspondiente sin que la figura salte de altura ni cambie de tamaño.
4. **Línea de suelo por escena:** Las escenas con escaleras, puentes o tarimas pueden tener una altura de suelo personalizada. El botón **Guías** muestra la línea de apoyo y los márgenes seguros para diálogos. Con dos o más personajes seleccionados, el botón **Al suelo** nivela a todos en la base de la escena considerando sus apoyos calibrados.
5. **Controles cómodos para celular (uso con una sola mano):** La barra de acciones rápidas se ubica al pie de la pantalla sin tapar a la figura. Ofrece accesos directos de un toque:
   - **Voz:** Activa o desactiva el resplandor de habla del personaje.
   - **Expresión:** Abre el menú de gestos faciales del personaje.
   - **Ocultar / Mostrar:** Conmuta si los jugadores ven o no a la figura en pantalla, conservando su posición exacta.
   - **Más…:** Despliega un panel inferior con cinco secciones:
     - *Presencia:* Enviar a la reserva, hacer entrar a escena o preparar entrada animada.
     - *Encuadre:* Centrar la cámara en este personaje.
     - *Transformación:* Girar en espejo, agrandar/achicar escala (+/-) y calibrar apoyo visual.
     - *Capas y Profundidad:*
       - **Al frente / Al fondo:** Mueve la figura al primer plano o detrás de todo.
       - **Delante de… / Detrás de…:** Abre una lista con las figuras y objetos de la escena (como un mostrador de taberna o una tarima) para intercalar al personaje en el plano exacto sin solapamientos.
       - **Ver capas de escena:** Muestra la lista de orden de profundidad completa para ordenar capas una a una con flechas.
     - *Organización:* Bloquear contra arrastres accidentales, asignar etiqueta privada del DM (ej. *«Guardia puerta»*) y **Duplicar copia** para crear otra instancia numerada.
    - **Duplicar:** Botón directo en la barra inferior y en *Más…*. Crea una copia de la figura activa con una ligera separación para no encimarla. La app numera automáticamente las etiquetas privadas (ej. *«Guardia 1»* y *«Guardia 2»*) y ofrece **Deshacer**.
    - Durante el arrastre con el dedo, la barra se oculta temporalmente. La copia semitransparente de la figura sigue el dedo y muestra sus coordenadas; la Mesa recibe la posición definitiva al soltar.
    - Al comenzar a mover una figura aparece un carril a la derecha con tres destinos. Soltala sobre **Reserva** para sacarla conservando su posición, sobre **Ocultar** para mantenerla en escena sin que los jugadores la vean, o sobre **Quitar** para eliminar únicamente esa aparición. **Quitar** no borra la ficha de la campaña.
    - Después de una entrada, salida, ocultación, duplicación o retirada aparece un aviso temporal con **Deshacer** para revertir rápidamente la acción.
6. **Movimiento en vivo y precisión segura:**
   - **Seguir en Mesa:** Conmutador opcional en la barra superior (en modo En Vivo). Cuando está activo, la pantalla de los jugadores refleja el desplazamiento mientras arrastrás el dedo, limitando los envíos para cuidar la conexión. Al soltar se confirma la posición final. Si está apagado, la Mesa solo actualiza al levantar el dedo.
   - La app ignora temblores menores a 10 píxeles, por lo que tocar para seleccionar no cambia la posición. Al arrastrar conserva décimas de porcentaje para evitar saltos grandes. Con **Seleccionar varios**, el conjunto mantiene exactamente la distancia entre sus integrantes:
   - **Freno en bloque:** Si cualquier figura del grupo alcanza el borde de la pantalla (márgenes seguros `0% a 100%`), todo el conjunto se detiene de forma rígida sin aplastar la formación.
   - **Figuras bloqueadas:** Si una figura tiene el candado activado, queda fija en su lugar y no es arrastrada con el resto.
   - **Cancelación segura:** Si la cámara se mueve durante el arrastre, o si el dedo/mouse sale del área de la pantalla o se interrumpe el gesto, el arrastre se cancela automáticamente sin producir saltos ni publicar movimientos accidentales a la Mesa.
7. **Puntos narrativos sobre el escenario:** Tocá el botón **Puntos** en la barra superior para ver los marcadores guardados (ej. *«Puerta»*, *«Mostrador»*, *«Altar»*) directamente sobre la previsualización. Al tocar un marcador teniendo una figura seleccionada, esta se traslada instantáneamente a esas coordenadas con opción de **Deshacer**. Si no hay nadie seleccionado, enfoca la cámara en ese punto.
8. **Preparar entradas desde reserva:** Cuando un personaje está fuera de escena, seleccioná su ficha, tocá **Más…** y elegí **Preparar entrada…**. Podés elegir su animación (fundido o deslizamiento desde un borde) y verificar que la imagen pública ya esté descargada en la Mesa. Al tocar **Hacer entrar a escena**, aparecerá con animación suave y sin demoras ni recortes.
9. **Encuadres guardados con nombre:** En el menú **Cámara**, podés elegir **Guardar encuadre actual…** para recordar planos como *«Mostrador»* o *«Puerta del sótano»*. Tocarlos mueve la cámara al encuadre guardado sin desplazar a los personajes y suspende el seguimiento automático del hablante hasta que lo reactives.

### Diagnóstico y recuperación de la Mesa

Si sospechás que la pantalla de los jugadores se quedó congelada o desincronizada, tocá la pastilla de estado de conexión en la barra superior para abrir la ventana de **Diagnóstico de Conexión y Sincronización**:
- **Comprobar Mesa:** Envía una consulta no destructiva que no altera la partida. Muestra en pantalla el dispositivo conectado, la resolución exacta, los recursos descargados y el estado del audio.
- **Resincronizar Mesa:** Si la Mesa no refleja la escena actual, esta acción reenvía la instantánea pública completa. Restaura de forma limpia el estado visual **sin repetir efectos sonoros, truenos pasados ni reiniciar los cronómetros de combate**.
- **Copiar Diagnóstico:** Genera un informe técnico completo en el portapapeles con datos de red, latencia y telemetría de pantalla. Está completamente saneado: no incluye notas privadas del director, textos secretos ni contraseñas.

<a id="glosario"></a>
## Palabras que aparecen en la app

| Palabra | Qué significa |
| --- | --- |
| Master, Game Master, DM o director | La persona que dirige la partida. |
| Mesa / Pantalla de Escena | La pantalla que mira el grupo. |
| Campaña | El conjunto de escenas, personajes y contenidos de una aventura. |
| Escena / Escenario | Un lugar o situación que preparás para mostrar. |
| NPC / PNJ | Personaje que normalmente interpreta quien dirige. |
| HP / Puntos de golpe | Los puntos de vida de un personaje o criatura. |
| Iniciativa | El orden de actuación durante el combate. |
| Staging / Preparación / Borrador | Cambios preparados antes de publicarlos. |
| Publicar / Proyectar / Llevar a Mesa | Enviar contenido a la pantalla de jugadores. |
| ACK | Confirmación de recepción; cuando aparezca, comprobá también el resultado en la Mesa. |
| Checkpoint | Punto guardado para recuperar un estado de la sesión. |
| Macro / Momento | Secuencia de acciones preparada para ejecutarse. |
| SFX / Soundboard | Efectos de sonido / panel de botones para reproducirlos. |
| Ducking / Atenuación | Bajar el sonido de fondo para que la voz se entienda mejor. |
| Preset | Configuración guardada para reutilizar. |
| Prop | Objeto de decorado, como una mesa o un cofre. |
| Bioma | Tipo de entorno, como un bosque o una cueva. |
| Handout | Material visual para el grupo, como una carta o un mapa. |
| URL | Enlace a un recurso, como una imagen o una pista de audio. |
| Markdown (.md) | Archivo de texto con formato sencillo para títulos y listas. |
| Preparación (Biblioteca) | Una instancia de sesión con su borrador, notas y estado del mundo. Se guarda automáticamente. |
| Plantilla de sesión | Preparación sanitizada: sin combate activo, HP al máximo y sin condiciones. Sirve para empezar otra sesión similar desde cero. |
| .vpp.json | Archivo portable de exportación de una preparación. Incluye los assets incrustados y funciona sin conexión. |
| Duplicar sesión | Crear una copia con IDs nuevos. Pods excluir el progreso de combate y las condiciones transitorias. |
| Aviso de compatibilidad | Alerta en la cabecera cuando el control del director y la pantalla de la Mesa tienen versiones con protocolos incompatibles o funciones no soportadas. |
| Pila del botón Atrás | Sistema que gestiona el botón Atrás nativo de Android de forma ordenada (cierra primero el teclado, luego menús o modales y por último pide confirmación para salir). |
| Área segura (Safe Area) | Margen automático que evita que la cámara frontal (*notch*) o las barras de navegación de Android tapen botones o textos de la app. |
| .vpbackup | Archivo de respaldo completo autónomo. Empaqueta campañas, escenas, personajes y biblioteca de imágenes locales con validación SHA-256 para transferir o resguardar datos sin cables ni comandos. |
| Deduplicación | Detección automática por código hash que evita almacenar la misma foto varias veces en el dispositivo, ahorrando memoria y almacenamiento. |
| Borrador Recuperado | Ventana de protección que detecta ediciones sin guardar tras un cierre forzado o descarga de batería en Android, permitiendo restaurar el lienzo intacto. |

## Cómo se mantiene este manual

Después de cada walkthrough se revisan los cambios de uso, se corrigen las instrucciones afectadas y se registra qué se comprobó. Consultá el [registro de revisiones](REVISIONES.md) para conocer el alcance de cada revisión. Las instrucciones para quien lo actualice están en [Mantenimiento](MANTENIMIENTO.md).
