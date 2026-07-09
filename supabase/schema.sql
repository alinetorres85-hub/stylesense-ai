-- StyleSense AI — esquema do banco (Supabase / Postgres)
-- Cole no Supabase: menu "SQL Editor" → New query → Run.
--
-- O app guarda cada coleção do usuário (peças, looks salvos, diário, avatar,
-- plano da semana) como uma linha JSON nesta tabela chave-valor. A segurança
-- por linha (RLS) garante que cada pessoa só acesse os PRÓPRIOS dados.

create table if not exists public.user_data (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

drop policy if exists "own data" on public.user_data;
create policy "own data" on public.user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
