# Manual de Visual Player

Visual Player te ayuda a ambientar una partida de rol con imágenes, personajes, música y efectos. Una persona dirige desde el **Control Remoto** y el grupo mira la **Pantalla de Escena**, también llamada **Mesa**.

No necesitás saber programación. Cuando un paso diga «tocá», también podés hacer clic con el mouse.

**Primera edición · 2 de septiembre de 2026.** Comprobamos en dos pestañas del navegador local el inicio, la conexión por código y el cambio de escena mediante Preparación y Publicar Todo. Las demás instrucciones se basan en los controles revisados del proyecto y siguen pendientes de sus recorridos completos. Las pruebas en dispositivos físicos y de audio real también están pendientes. Podés consultar el alcance en el [registro de revisiones](REVISIONES.md).

## Elegí lo que querés hacer

- [Preparar tu primera partida](#primeros-pasos).
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

Necesitás tener acceso a la app en el dispositivo que usará quien dirige y en el que verá el grupo. Por ejemplo: un celular como control y una tablet como pantalla. Usá la misma versión de la app en ambos.

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
| Mostrar personajes y expresiones | Vista Clásica → Personajes en Escena | Invocar, quitar, cambiar posición y destacar al que habla; usar expresiones si están disponibles. |
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

1. Abrí **Sesión → Compositor**.
2. Seleccioná un personaje u objeto y arrastralo a su lugar. Ajustá tamaño y el orden de frente/fondo según corresponda.
3. **Objeto** permite agregar un elemento de decorado mediante su nombre e imagen.
4. Podés guardar la disposición con **Guardar Preset** y recuperar una con **Cargar**.
5. Confirmá con **Publicar a Mesa (ACK)** o **Guardar en Borrador**, según el modo activo.

**Ejemplo:** colocá al tabernero detrás de una barra y al visitante delante. Si el encuadre queda demasiado cerca, usá **Cámara → Restablecer**.

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

### Pestañas de la biblioteca

| Pestaña | Qué contiene |
| --- | --- |
| En preparación | Preparaciones que todavía no se publicaron a la Mesa. |
| En curso | Sesiones que ya tuvieron contenido publicado a los jugadores. |
| Finalizadas | Sesiones cerradas pero conservadas para referencia o duplicar. |
| Archivadas | Sesiones que ya no necesitás en la lista activa. |

### Acciones disponibles sobre cada preparación

- **Preparación:** carga el borrador guardado en el modo Preparación del panel. No publica nada a la Mesa hasta que usas **Publicar Todo** o **Publicación Selectiva**.
- **Continuar:** disponible en sesiones en curso o finalizadas. Restaura el último estado publicado a la Mesa.
- **Duplicar:** crea una copia con IDs nuevos. En el diálogo pods excluir el progreso de combate (rondas, temporizadores) y las condiciones activas.
- **Guardar como plantilla:** genera una versión reutilizable sin datos efímeros: HP perdidos, combate activo y condiciones se eliminan.
- **Exportar (.vpp.json):** descarga un archivo autocontenido con los assets incrustados. Sirve para trasladar la preparación a otro dispositivo.
- **Archivar:** mueve la sesión a la pestaña Archivadas sin borrar sus datos.
- **Eliminar:** borra la sesión de forma permanente. La app pide confirmación.

### Crear una preparación nueva

1. En la Biblioteca, escribí el nombre en el campo **Nombre de nueva preparación** y tocá **Nueva preparación** o pulsá Enter.
2. La nueva preparación aparece en la pestaña **En preparación** y se convierte en la activa del panel.

### Importar una preparación

1. En la Biblioteca, tocá **Importar**.
2. Elegí un archivo `.vpp.json` exportado desde la misma u otra instalación.
3. Si ya existe una sesión con el mismo identificador, la app crea una copia con el sufijo *(Importada)*.

<a id="continuidad"></a>
## Continuar la historia entre partidas

### Diario y preparación de sesión

En **Sesión → Diario** encontrás **Lo que saben**, **Cómo quedó el mundo** y **Pendiente próxima sesión**. Podés añadir pistas, consultar descubrimientos y guardar notas para la próxima partida. Separá la descripción pública de las notas privadas.

En **Preparar Sesión**, recorré los pasos con **Siguiente**: revisá los conocimientos del grupo, las notas, qué estados conservar o reiniciar y la escena inicial. Revisá el resumen antes de **Cargar en Staging (Modo Seguro)**. Después comprobá el borrador y publicalo cuando empiece la partida.

### Resumen de apertura y crónica escrita

En **Crónica**, usá **Generar desde Diario** o **Añadir Diapositiva**. Revisá títulos, textos e imágenes; podés ordenar las diapositivas y **Guardar en Campaña**. **Proyectar a la Mesa** muestra el resumen y **Cerrar Crónica en Mesa** lo retira.

En **Exportar Crónica**, revisá **Editar Borrador** y **Vista Previa (.md)**. Elegí **Copiar Texto**, **Descargar Markdown (.md)** o **Imprimir / PDF**. Esta última opción usa la impresión del navegador; guardar como PDF depende de las opciones del dispositivo. **Compartir** aparece cuando el dispositivo ofrece esa función.

Revisá el texto final antes de compartirlo, especialmente si agregaste contenido a mano. Una crónica escrita sirve para leer la historia; para recuperar una campaña usá su exportación de seguridad.

<a id="guardar"></a>
## Guardar, exportar y recuperar

### Copia de seguridad de la campaña

En **Campañas → Exportar** descargás un archivo terminado en `.json`. Guardalo con un nombre y una fecha que puedas reconocer. **Importar** permite elegir un archivo de campaña. Si corresponde a una campaña con el mismo identificador, la importación puede reemplazarla: exportá primero la versión que querés conservar.

La exportación guarda los datos de esa campaña. No es una copia completa de todos los datos de la app: los checkpoints y otros registros pueden almacenarse por separado. Las imágenes o sonidos que se guardaron como enlaces siguen dependiendo de esos enlaces.

Las campañas se guardan localmente en el navegador o dispositivo utilizado. No des por hecho que aparecerán en otro dispositivo ni que sobrevivirán al borrado de los datos de la app. Usá **Exportar** para llevarte una copia.

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

La app tiene herramientas de diagnóstico de conexión. Para un uso normal, consultá el estado y las opciones de reconexión; **Modo Caos (DEV)** está destinado a pruebas de fallos.

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

## Cómo se mantiene este manual

Después de cada walkthrough se revisan los cambios de uso, se corrigen las instrucciones afectadas y se registra qué se comprobó. Consultá el [registro de revisiones](REVISIONES.md) para conocer el alcance de cada revisión. Las instrucciones para quien lo actualice están en [Mantenimiento](MANTENIMIENTO.md).
