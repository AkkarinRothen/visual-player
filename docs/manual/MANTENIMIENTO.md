# Mantenimiento del manual

## Objetivo y alcance

Mantener `README.md` como guía de uso en español para personas sin conocimientos de programación. Incluye un recorrido inicial y un catálogo por tareas. El manual describe la versión revisada y sus limitaciones observadas, sin convertir funciones planeadas en promesas.

La revisión se realiza como parte del cierre de cada walkthrough o cambio que afecte al uso. La regla se encuentra en `../../AGENTS.md`; no es un proceso en segundo plano ni un monitor programado. Quien cierre el trabajo debe aplicarla.

## Procedimiento al cerrar un walkthrough

1. Revisar el alcance del walkthrough y los cambios reales. Tener en cuenta archivos sin seguimiento y cambios de otros trabajos, sin atribuirse ni sobrescribirlos.
2. Responder: ¿hay funciones nuevas, modificadas o eliminadas? ¿Cambian nombres, ubicaciones, requisitos, pasos, resultados, persistencia o visibilidad para jugadores?
3. Consultar los componentes y sus manejadores para verificar que los controles estén conectados. No deducir una función completa por el nombre de un archivo, texto promocional o test existente.
4. Recorrer la interfaz afectada con una campaña de prueba. Para afirmaciones de sincronización, comprobar el resultado en la Mesa; para sonido, comprobar audio real. Una prueba local no valida Android, TV, cámara, red local u operación sin Internet.
5. Actualizar el catálogo, las instrucciones, el glosario y los problemas que hayan cambiado. Mantener los enlaces internos y explicar los nombres exactos de la interfaz.
6. Si se usan capturas, obtenerlas de la versión comprobada, guardarlas en `capturas/`, añadir texto alternativo y registrar fecha/vista/dispositivo. No usar imágenes generadas como evidencia. No incluir códigos de acceso activos, datos personales o secretos de campañas reales.
7. Revisar si una limitación registrada sigue vigente: cerrarla con evidencia o conservarla. Si un fallo bloquea el recorrido, registrar el bloqueo y completar las partes que sí se puedan respaldar.
8. Añadir una entrada a `REVISIONES.md` con fecha local, versión/commit si se conoce, alcance, cambios del manual, evidencia, limitaciones y próximo recorrido concreto.
9. Si no hubo cambios de uso, registrar «Sin cambios de uso; manual revisado» e indicar qué se revisó. No reescribir secciones ni renovar validaciones ajenas al recorrido.
10. Comprobar enlaces y consistencia. En la entrega indicar qué se actualizó y qué pruebas siguen pendientes.

## Niveles de evidencia

| Estado | Cuándo usarlo |
| --- | --- |
| Revisado en código | Control, acceso y manejador inspeccionados. Falta ejecutar el recorrido. |
| Comprobado visualmente | Pantalla y controles observados en la app abierta. No implica haber completado toda la acción. |
| Recorrido comprobado | Pasos ejecutados y resultado observado; registrar entorno y condiciones. |
| Pendiente / bloqueado | No comprobado o impedido por un fallo concreto. |

No equiparar «el comando se envió» con «la Mesa lo aplicó» ni con «el usuario lo vio/oyó». No declarar aprobadas pruebas solo porque existan archivos de tests.

## Ficha para documentar una función

Usar estas preguntas para escribir un texto breve; no hace falta repetir toda la plantilla para acciones simples:

- **Nombre y propósito:** ¿qué puede hacer la persona y cuándo le sirve?
- **Acceso:** ¿qué pestaña, sección y botón debe tocar? ¿Cambia según la vista?
- **Preparación:** ¿necesita imágenes, enlaces, personajes, permisos o conexión?
- **Pasos:** ¿cuál es la secuencia mínima con los nombres exactos?
- **Resultado:** ¿qué ve quien dirige y qué ve/oye el grupo?
- **Publicación:** ¿actúa en vivo, guarda un borrador o requiere proyectar?
- **Corrección:** ¿cómo se detiene, se retira o se corrige? No prometer deshacer acciones que no lo permitan.
- **Persistencia:** ¿qué se guarda, dónde y qué incluye la exportación?
- **Ejemplo:** ¿cómo se usaría en una partida?
- **Límites:** ¿qué falta comprobar o qué problema se observó?

## Criterios de escritura

- Trato de «vos», frases breves y una acción principal por paso.
- Usar «tocá» como acción común a pantalla táctil y mouse.
- Mantener los nombres reales de botones aunque contengan inglés; traducir su significado en el glosario.
- Describir requisitos concretos y advertencias junto a la acción afectada.
- Mantener secretos, guardado y publicación explícitos; evitar garantías absolutas que no hayan sido comprobadas.
- Separar la guía de uso de las evidencias técnicas. Estas últimas van en `REVISIONES.md`.
- Capturas como ayuda, nunca como sustituto de los pasos escritos.

## Plantilla de revisión

```text
Fecha / identificador:
Versión o estado de trabajo:
Walkthrough y entorno:
Funciones afectadas:
Cambios del manual (secciones):
Evidencia: código / visual / recorrido comprobado:
Capturas nuevas o reemplazadas:
Incidencias y límites:
Próxima comprobación:
Resultado: actualizado / sin cambios de uso / revisión parcial por bloqueo.
```
