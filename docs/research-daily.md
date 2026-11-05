# Research diario Amauta

## Ciclo editorial

19:30 America/Buenos_Aires: recopilar documentos y preparar borrador de la rueda actual. No publicar una segunda edición.

08:00 de cada día hábil: completar con materiales recibidos de noche, verificar calendario de mercado y publicar una edición sobre la última rueda hábil. Un informe publicado es una fotografía histórica, no datos en vivo. Antes de reemplazar una edición, conservar su contenido y archivos originales.

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
