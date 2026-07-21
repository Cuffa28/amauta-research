-- Auto-alta de miembros del equipo por dominio (@amautainversiones.com).
--
-- Cuando se crea un usuario en auth.users (ocurre al pedir el código de login,
-- porque sendOtp usa create_user:true), si el correo pertenece al dominio de
-- Amauta se agrega automáticamente a la allowlist public.team_members como
-- 'member' activo. Correos de otros dominios NO se registran → quedan bloqueados
-- en getTeamMember(). El acceso real sigue requiriendo el código OTP.
--
-- Nota: para correos del dominio que YA tenían usuario auth creado antes de este
-- trigger, correr el backfill de más abajo una vez.

create or replace function public.autoregister_team_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null
     and lower(new.email) like '%@amautainversiones.com' then
    insert into public.team_members (email, role, active)
    values (lower(new.email), 'member', true)
    on conflict (email) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_autoregister on auth.users;
create trigger on_auth_user_created_autoregister
  after insert on auth.users
  for each row execute function public.autoregister_team_member();

-- Backfill (una sola vez) de correos del dominio ya existentes en auth.users:
-- insert into public.team_members (email, role, active)
-- select lower(u.email), 'member', true
-- from auth.users u
-- where u.email is not null and lower(u.email) like '%@amautainversiones.com'
-- on conflict (email) do nothing;
