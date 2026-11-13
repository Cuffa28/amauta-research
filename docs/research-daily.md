# Research diario Amauta

## Ciclo editorial

19:30 America/Buenos_Aires: recopilar documentos y preparar borrador de la rueda actual. No publicar una segunda edición.

08:45 de cada día hábil: completar con materiales recibidos de noche, verificar calendario de mercado y publicar una edición sobre la última rueda hábil. Un informe publicado es una fotografía histórica, no datos en vivo. Antes de reemplazar una edición, conservar su contenido y archivos originales.

## Integración implementada

`/research` usa el acceso de equipo del portal. `/api/research` valida el token con Supabase y la membresía activa, consulta solamente ediciones publicadas y nunca almacena respuestas privadas en caché. La pantalla diferencia archivo vacío, carga, error de conexión y cobertura parcial. No tiene informes de ejemplo ni datos de Gmail en el repositorio público.

## Pendientes antes de producción

1. Verificar el proyecto Supabase real utilizado por las variables del portal. Verificación del 5/11: el proyecto amauta-research jfjqydgqzlwnyngcmzwu tiene nueve miembros activos, confirmados por consulta directa. El cero del listado inicial era una estimación de estadísticas, no un conteo real. No se modificaron miembros ni permisos de Auth.
2. El esquema `research-daily.sql` fue aplicado al proyecto amauta-research mediante la migración create_research_daily_editions. Se cargó una edición inicial parcial sobre la rueda del 4/11. RLS habilitado; anon sin lectura y authenticated sin escritura, comprobados por consulta. Conectar un publicador autenticado de servidor con validación de contenido, idempotencia por rueda y conservación inmutable de versiones. No exponer service_role en el navegador.
3. Conectar Gmail para lectura autónoma y procesar PDF completos. El plugin de este chat no constituye una conexión del servidor.
4. Subir gráficos y PDF a almacenamiento privado; servir únicamente URLs firmadas tras verificar membresía. La interfaz no renderiza imágenes arbitrarias de Markdown para evitar fugas a terceros. Integrar el visor de gráficos privados cuando exista este mecanismo.
5. Ensayar apertura, fallos parciales, edición histórica y aviso de publicación antes de sustituir las tareas actuales de ChatGPT.

## Evidencia y actualización

Guardar por fuente proveedor, URL, hash del documento, fecha observada, publicación, recepción, consulta y estado de lectura. Por afirmación, registrar las fuentes de respaldo. Rechazar números sin respaldo y mantener diferencias entre proveedores explícitas. Los informes históricos no se recalculan con revisiones futuras sin dejar una corrección versionada.

El snapshot macro existente incluye `generatedAt`, `failures`, `retainedSeries`, y cada serie contiene `retrievedAt` y puntos fechados. Consultar todas estas propiedades: una descarga exitosa no convierte una observación antigua en actual. No comparar automáticamente series con frecuencia, cobertura, unidad o base distinta.

La copia inspeccionada el 5/11/2026 fue generada el 5/11 a las 02:24 UTC, pero sus últimas reservas eran del 2/11 y sus compras de divisas del 30/10. Este es un ejemplo de rezago real que debe mostrarse, no ocultarse. Feriados y fines de semana requieren calendario de mercado verificado.


## Vista visual y PDF (12/11/2026)

La web oficial tiene tres vistas: Qué pasó ayer, Qué mirar hoy e Informe completo. El PDF es una síntesis visual; el cuerpo completo, sus fuentes y las figuras originales siguen conservados en la tabla. El acceso de web, API, gráficos y PDF está habilitado al equipo con dirección exacta @amautainversiones.com, sesión autenticada y membresía activa. Se comparten únicamente ediciones publicadas en modo lectura; los borradores, revisiones internas y permisos de escritura siguen restringidos. La elegibilidad por dominio se centraliza en src/lib/research-access.ts y se replica en la política SELECT documentada en research-access.sql; pertenecer al dominio por sí solo no reemplaza la membresía activa. Las imágenes privadas solo se obtienen en la consulta de una edición; nunca se incluyen en el listado ni en GitHub. Las Pages de autoría y sus controles conservan su audiencia privada y no son el portal del equipo.

`briefing` es un objeto JSONB privado opcional con `{version:1, cutoff:ISO timestamp, intro:string, metrics:[{label,value,context}], yesterday:[{label,title,text,attribution}], today:[{date?:ISO date,label,title,text,attribution}]}`. Prepararlo al publicar cada nueva edición a partir de las fuentes leídas. No extraer números mediante expresiones regulares ni completar expectativas ausentes: preservar condiciones, discrepancias, fechas y atribuciones. Como referencia editorial, hasta tres métricas, dos a cuatro tarjetas de cierre y dos a cuatro de agenda. No introducir hechos nuevos que no estén respaldados por el cuerpo y sus fuentes. Si falta el objeto, se muestran párrafos reales del informe y su agenda, sin inventar indicadores. Cualquier cambio a una edición publicada requiere archivar transaccionalmente `to_jsonb` de la fila completa, incluidas sus imágenes y briefing.

`prebuild` ejecuta `scripts/build-research-macro.mjs`. Genera un índice compacto a partir de snapshots públicos versionados de Macro Lab. Verifica generatedAt, failures, retainedSeries, retrievedAt, puntos finitos, fechas únicas y períodos consecutivos para variaciones. Se excluyen snapshots sin controles verificables. Reservas y compras se conservan en sus unidades originales; el IPC mensual se calcula desde niveles INDEC con fórmula explícita, separado de observaciones oficiales. No se usa REM como dato observado.

La API selecciona el último snapshot con generatedAt anterior o igual a published_at de la edición, nunca latest actual. Las versiones históricas de Macro Lab deben permanecer inmutables. Las observaciones y consultas conservan sus fechas; series retenidas y fallos se identifican. No se interpola ni se reconstruyen puntos ambiguos. Los puntos se grafican por fecha calendario y las escalas y unidades quedan visibles. Una nueva descarga no modifica una edición histórica ni la convierte en información en vivo. Si no existe snapshot anterior verificado, se informa su ausencia.

Validación: `npm run test:research`, `npm run build` y revisión visual de web (desktop/móvil), apertura de figuras, cambio de edición y PDF completo. En entornos Windows con node_modules enlazado fuera del checkout, usar `next build --webpack` para la comprobación local; producción compila sin ese enlace.
