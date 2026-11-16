# Research: publicación y evidencia histórica

El portal muestra solamente la última edición `published`. Las ediciones anteriores y
sus revisiones completas permanecen como respaldo interno. La API de Research y la
descarga PDF rechazan IDs reemplazados. La base de observaciones es independiente de
la edición vigente; no se borra al publicar otra.

## Reloj y responsabilidades

- 19:30 Argentina: tarea editorial prepara borrador, lee fuentes y agrega observaciones.
- 08:00: tarea editorial completa el borrador. Última búsqueda 08:35–08:40.
- Antes de 08:45: verifica Page y fila y deja una versión exacta en la cola.
- 08:45: `pg_cron` ejecuta `research_internal.publish_ready()` en el servidor.
- 08:46: tarea de control verifica resultado, sincroniza portada privada y avisa con enlace.

Las tareas editoriales y de control dependen del scheduler de Codex y de sus conectores;
el reloj de publicación funciona en Supabase. El servidor no descarga correos ni redacta
el informe. Una falla en la preparación no se oculta publicando contenido viejo.
La función registra `missing_ready_draft`, `calendar_missing` o `blocked_validation`.
La hora publicada es la real; no se promete tiempo real ni se falsifica un corte.

El calendario privado distingue negociación de liquidación. Su carga inicial verificada
alcanza diciembre de 2026; debe extenderse con el original BYMA antes de agotarse.
Una fecha desconocida bloquea la publicación. Los lunes se cubre la última rueda real y
se separan las novedades del fin de semana. El resumen semanal se entrega solo viernes.

## Preparar la cola

Consultar esquema, calendario, fila y cola existentes primero. Guardar `draft` y Page
privada coherentes; preservar gráficos y registrar límites materiales en `coverage` y
contenido. Revisar editorialmente antes de usar esta plantilla parametrizada:

```sql
insert into public.research_publication_queue
 (publication_date,edition_id,ready_at,cutoff_at,body_md5,sources_md5,
  charts_md5,briefing_md5,page_url,state)
select :publication_date,id,now(),:cutoff_at,md5(body),md5(sources::text),
 md5(charts::text),md5(briefing::text),:verified_private_page_url,'ready'
from public.research_daily_editions
where id=:reviewed_edition_id and status='draft'
on conflict(publication_date) do update set
 edition_id=excluded.edition_id,ready_at=excluded.ready_at,cutoff_at=excluded.cutoff_at,
 body_md5=excluded.body_md5,sources_md5=excluded.sources_md5,
 charts_md5=excluded.charts_md5,briefing_md5=excluded.briefing_md5,
 page_url=excluded.page_url,state='ready'
where research_publication_queue.state='ready';
```

Los parámetros se deben enlazar o escapar como literales, nunca concatenar contenido
de fuentes como SQL ejecutable. Comparar lectura posterior con la versión revisada.
Si cambia body/sources/charts/briefing, volver a revisar y renovar hashes.
Los hashes detectan cambios posteriores, no sustituyen el análisis editorial.

El publicador exige última rueda verificada, borrador, fuentes, briefing y al menos dos
gráficos. Archiva el borrador completo transaccionalmente antes de publicarlo. No publica
una segunda edición en el mismo día. Nunca cambiar una edición publicada sin archivar
una revisión completa. El control posterior conserva portada previa con sus imágenes
y verifica Page/DB antes de anunciar éxito.

## Base de observaciones

`research_observations` almacena evidencia con fecha observada, unidad, fuente, clase
oficial/research/derivada, metodología, URL original, consulta y fechas de publicación y
recepción si se conocen. No inventar fechas ausentes. `evidence_key` estable deduplica
descargas repetidas; no incluir el hash del snapshot completo en esa clave. Usar hash
de serie, fecha, valor y documento/original. Una corrección se agrega como nueva evidencia
con `supersedes_id`; se conserva el dato anterior. Reutilizar la clave de serie solo
cuando fuente, alcance, unidad y metodología sean comparables.

El visor elige el último vintage observado por fecha. No mezcla pronósticos ni cifras
en disputa; no promedia fuentes. La consulta del visor trae hasta 2.000 registros de
evidencia recientes por serie; la tabla conserva toda la historia. Una observación sola
se muestra sin inventar una tendencia. Guardar futuros resultados y agregarlos a la
serie no implica disponibilidad instantánea ni elimina los rezagos oficiales.

Separar compras concertadas MLC de factores de variación de reservas BCRA; separar VE
de VNO; documentar conversión de moneda y denominador de rollover. El snapshot de
Macro Lab requiere validar generatedAt/failures/retainedSeries/retrievedAt por serie.

## Acceso y comprobación

RLS y APIs requieren sesión y miembro activo del dominio corporativo exacto. Ningún
cliente puede escribir observaciones, cola, calendario, ejecuciones o revisiones.
El publicador no es SECURITY DEFINER ni un RPC público. Sus permisos y esquema son
privados; cron lo ejecuta con el rol administrativo del servidor.

Esquema en `research-history.sql`. Job instalado con reloj UTC/GMT:

```sql
select cron.schedule('amauta-research-publish-0845',
 '45 11 * * 1-5','select research_internal.publish_ready();');
```

No duplicar el job si ya existe. Verificar `cron.job`, `cron.job_run_details` y
`research_publication_runs`. Tests transaccionales de horario/feriado/validación/
publicación única en `research-publication-test.sql` (fixtures fechados para entorno
controlado, todo termina en rollback). Pruebas del visor y permisos con
`node --test tests/research-*.test.cjs` y build de producción.
