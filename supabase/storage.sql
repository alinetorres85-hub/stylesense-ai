-- StyleSense AI — Storage das fotos das roupas.
-- Cole no Supabase: SQL Editor → New query → Run.
-- Cria o bucket "wardrobe" (público) e as regras: cada usuário gerencia os
-- arquivos na SUA pasta (o nome do arquivo começa com o id do usuário).

insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', true)
on conflict (id) do update set public = true;

drop policy if exists "wardrobe public read" on storage.objects;
create policy "wardrobe public read" on storage.objects
  for select using (bucket_id = 'wardrobe');

drop policy if exists "wardrobe own write" on storage.objects;
create policy "wardrobe own write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe own update" on storage.objects;
create policy "wardrobe own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe own delete" on storage.objects;
create policy "wardrobe own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
