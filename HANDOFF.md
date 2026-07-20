# Amauta Local — Estado y próximos pasos (handoff)

_Última actualización: 2026-07-20._

Esta es la carpeta de trabajo canónica del portal **Amauta Local** (= repo GitHub `Cuffa28/amauta-research`, deploy en `amauta-research.vercel.app`). Ignorá las otras carpetas viejas del escritorio (`amauta-research`, `amauta-research-main`) — están desactualizadas.

---

## ✅ Hecho y verificado (local)

- **Rebrand a Amauta Local**: título, manifest, meta, sidebar, welcome, logo horizontal.
- **Login de equipo por email (OTP)** gateando toda la app; sesión persistente; rol admin automático (reemplaza la contraseña vieja).
- **Integración de herramientas en la MISMA app (sin redirect):**
  - CEDEARs y Noticias → nativas (ya existían).
  - **Monitor FCIs** y **Chat Financiero** → embebidos como **sección iframe** (`?view=fci` / `?view=chat`). Verificado que ninguna bloquea iframe y que cargan a pantalla completa.
  - **Simulador** → "Próximamente".
- **Service worker** bumpeado a `amauta-local-v14`.
- Todo commiteado en esta carpeta (rama actual, commit "Amauta Local: login de equipo por email…").

## ✅ Hecho en el backend Supabase (proyecto `jfjqydgqzlwnyngcmzwu`)

- Tabla **`team_members`** creada con RLS (cada uno lee su fila) y sembrada con `facundo@amautainversiones.com` como **admin**. Migración versionada en `supabase/migrations/20260720_create_team_members.sql`.
- Edge Function **`admin-write` redeployada (v2)**: exige rol `admin` + CORS con localhost.
- Envío de OTP probado OK (crea el usuario y manda el email).

---

## ⛔ Lo que FALTA para que el login funcione end-to-end

### 1) Dos ajustes en Supabase → Authentication (dashboard)
Necesarios para que llegue un **código de 6 dígitos** en vez de un link de "Confirmar cuenta":
1. **Email Templates → "Magic Link"**: incluir `{{ .Token }}` en el cuerpo (muestra el código).
2. **Providers → Email**: desactivar **"Confirm email"** (el acceso ya lo controla la allowlist `team_members`; la confirmación por mail solo agrega fricción). Alternativa: dejar la confirmación y confiar en el link, pero requiere el paso 3 (Site URL) y el deploy.
3. (Si se usan links) **URL Configuration**: Site URL = `https://amauta-research.vercel.app` y agregar `http://localhost:3000` a Redirect URLs.

> Con los pasos 1 y 2, el login por código funciona incluso en local (`localhost:3000`), sin depender del deploy.

### 2) Deploy a producción
Los cambios están commiteados acá pero **no pusheados**. Para que lleguen a `amauta-research.vercel.app`:
```bash
cd <esta carpeta>
git push origin HEAD:main        # Vercel despliega solo al pushear a main
```
> Requiere credenciales de GitHub de la cuenta `Cuffa28`. Si el push pide login, usar un Personal Access Token o `gh auth login`.

### 3) Sumar al resto del equipo (cuando quieras)
En Supabase → SQL Editor (proyecto `jfjqydgqzlwnyngcmzwu`):
```sql
insert into public.team_members (email, role, full_name) values
  ('persona@amautainversiones.com', 'member', 'Nombre Apellido');
-- role 'admin' para quienes puedan editar Research.
```

---

## 🔜 Pendiente / ideas a futuro (no bloqueante)

- **Login único real (SSO)**: hoy se sigue en `*.vercel.app`, así que las apps embebidas (FCIs, Chat) tienen su propia sesión. Para SSO real habría que migrar todo a subdominios de `amautainversiones.com` (portal + `research.`/`monitor.`/`chat.`) con cookie de sesión del dominio padre.
- **Chat Financiero**: hoy embebido por iframe. Si se quiere que respete el login de equipo, agregarle el mismo gate OTP (usa Next.js 14 + su propio Supabase con tablas `series`/`observaciones`/`solicitudes`; habría que apuntar la AUTH al proyecto de research). Repo: `Cuffa28/amauta-chat-financiero`.
- **Simulador**: no existe repo aún; cuando exista, agregar su URL en `config.js` `EMBEDS.simulador.url`.
- **Visual estilo Monitor FCIs**: se mantuvo el sidebar (necesario para navegar las secciones). Si se quiere el header superior con regla amarilla del monitor, es un pase visual aparte.

---

## Correr localmente
```bash
npx serve public -l 3000 --no-clipboard
# http://localhost:3000
```

## Repos relacionados (dueño: Cuffa28)
- `Cuffa28/amauta-research` — **este** (portal Amauta Local).
- `Cuffa28/monitor-fci-amauta` — Monitor FCIs (Next.js 16). Embebido por iframe.
- `Cuffa28/amauta-chat-financiero` — Chat Financiero (Next.js 14 + Claude). Embebido por iframe.

## Archivos clave si retomás
- `public/js/app.js` — gate de login + routing + secciones (`showEmbed`, `showCedears`, `showNews`, `selectInstrument`).
- `public/js/supabase-client.js` — `sendOtp` / `verifyOtp` / `getTeamMember` / sesión persistente.
- `public/js/config.js` — `EMBEDS` (URLs de FCIs/Chat/Simulador).
- `supabase/functions/admin-write/index.ts` — autorización admin (redeploy si cambia).
