# Amauta Local — Brief del proyecto

> **Empezá leyendo [HANDOFF.md](HANDOFF.md)** — ahí está el estado actual, lo que falta y cómo desplegar.

## Qué es

**Amauta Local** es el **portal interno del equipo de Amauta Inversiones Financieras** (Multifamily Office, CNV Mat. 1029). Nació como "Amauta Research" y se está convirtiendo en la **web madre** que concentra todas las herramientas en una sola app, detrás de un **login de equipo por email**.

- **Deploy:** `amauta-research.vercel.app` (repo GitHub **`Cuffa28/amauta-research`**).
- **Stack:** sitio **estático** — HTML + CSS + **JavaScript vanilla (ES modules)**. Sin framework, sin build, sin bundler. Se sirve la carpeta `public/`.
- **Backend:** **Supabase** proyecto **`jfjqydgqzlwnyngcmzwu`** (Postgres + Auth + Realtime) + 1 Edge Function (`admin-write`).
- Dependencias por CDN: Chart.js 4.4.1, DOMPurify, Fira Sans, TradingView widget.

## Arquitectura (una sola app, navegación por sidebar)

Todo vive en `public/`. Es una SPA con sidebar a la izquierda y un `#contentArea` a la derecha donde se montan las secciones. **Todo se integra en la misma app — no se redirige a otras webs.**

- `public/index.html` — shell: login view + sidebar + main. Carga `cedears.js` y `news.js` como scripts clásicos y `app.js` como módulo.
- `public/js/app.js` — orquestador: gate de login, routing por `?view=`/`?inst=`, sidebar, montaje de secciones.
- `public/js/supabase-client.js` — auth (OTP email), sesión persistente, lecturas/escrituras a Supabase, realtime.
- `public/js/renderer.js` — renderiza instrumentos de Research (bloques + Chart.js).
- `public/js/admin.js` — panel admin (CRUD de instrumentos/bloques). Solo rol `admin`.
- `public/js/cedears.js` — **Monitor CEDEARs** (sección **nativa**; `window.CedearsView.mount/unmount`). Datos en tablas `cedears_*` del mismo Supabase.
- `public/js/news.js` — **Noticias** Reuters (sección **nativa**; `window.NewsView`).
- `public/js/config.js` — URL/key de Supabase, orden de categorías y `EMBEDS` (URLs de las secciones iframe).
- `public/sw.js` — service worker cache-first. **Al cambiar archivos del shell hay que bumpear `CACHE`** (hoy `amauta-local-v14`).
- `supabase/functions/admin-write/index.ts` — Edge Function; escribe con service_role; **exige rol `admin`** (valida contra `team_members`).

### Secciones del portal (todas dentro de la misma app)
| Sección | Cómo está integrada | Ruta |
|---|---|---|
| Research (instrumentos) | nativa (renderer.js) | `?inst=<id>` |
| Monitor CEDEARs | **nativa** (cedears.js, datos en Supabase) | `?view=cedears` |
| Noticias | **nativa** (news.js) | `?view=news` |
| Monitor FCIs | **iframe** a `monitor-fci-amauta.vercel.app` | `?view=fci` |
| Chat Financiero | **iframe** a `amauta-chat-financiero.vercel.app` | `?view=chat` |
| Simulador | "Próximamente" (no existe repo aún) | `?view=simulador` |

**Patrón para agregar una herramienta nueva:**
- Si tiene su propia app Next.js separada → embeberla: agregar entrada en `config.js` `EMBEDS`, una entrada en el sidebar (`buildSidebar` en app.js) y su ruta en `showEmbed`.
- Si sus datos están en el Supabase de research → módulo nativo tipo cedears (`window.XxxView.mount/unmount`) cargado como script en index.html.

## Autenticación (login de equipo por email, sin contraseña)

- El portal entero está detrás del login (`body.authed`). Sin sesión válida → se muestra `#loginView`.
- Flujo: escribís tu correo → Supabase manda un **código OTP** → lo ingresás → entrás. (También soporta magic link vía captura del hash de la URL.)
- **Allowlist `team_members`** (tabla en Supabase): `email` (PK), `role` (`member`|`admin`), `active`. Tras verificar el OTP se valida que el correo esté en la allowlist activa; si no, se deniega.
- `role='admin'` habilita el Panel Admin (edición de Research). `member` = solo lectura.
- La Edge Function `admin-write` re-chequea rol `admin` del lado server.
- RLS: cada usuario autenticado solo puede leer SU fila de `team_members`.

## Branding (obligatorio)

| Elemento | Valor |
|---|---|
| Amarillo (primario) | `#F3CF11` |
| Bordó | `#621044` |
| Negro/charcoal | `#231F20` |
| Fuente | **Fira Sans** (300–800), fallback Arial |
| Logo | `public/assets/amauta-logo-horizontal.png` + marca diamante SVG en el sidebar |
| Disclaimer CNV 1029 | **OBLIGATORIO** en vistas de cara al cliente |

Variables CSS `--am-*` en `public/css/styles.css`.

## Correr localmente

```bash
npx serve public -l 3000 --no-clipboard
# abrir http://localhost:3000
```
Las lecturas de Supabase son con anon key (funcionan sin login). Para probar el login por código ver HANDOFF.md (requiere 2 ajustes en Supabase).

## Gotchas
- **Service worker cache-first**: si cambiás archivos del shell y no bumpeás `CACHE` en `sw.js`, los usuarios ven assets viejos.
- `admin.js`: cuidado con backticks crudos dentro de template literals (ya hubo un bug de sintaxis por `` ```json `` sin escapar).
- El proyecto Supabase correcto es **`jfjqydgqzlwnyngcmzwu`** (hubo una config vieja que apuntaba a `ltfcqoutumlcaakmobew` — NO usar esa).
