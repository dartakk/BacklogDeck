begin;

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists bio text;

alter table public.games
  add column if not exists external_id text,
  add column if not exists title text,
  add column if not exists cover_url text,
  add column if not exists platforms text[] default '{}',
  add column if not exists genres text[] not null default '{}',
  add column if not exists release_date date;

alter table public.user_library
  add column if not exists rating smallint,
  add column if not exists notes text,
  add column if not exists session_minutes smallint,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_library
  alter column format set default 'Digitale';

update public.user_library
set status = case lower(status)
  when 'backlog' then 'backlog'
  when 'in corso' then 'playing'
  when 'in_corso' then 'playing'
  when 'playing' then 'playing'
  when 'completato' then 'completed'
  when 'completed' then 'completed'
  when 'abbandonato' then 'dropped'
  when 'dropped' then 'dropped'
  else 'backlog'
end;

alter table public.reviews
  add column if not exists user_id uuid,
    add column if not exists game_id uuid,
  add column if not exists rating smallint,
  add column if not exists content text,
  add column if not exists created_at timestamptz not null default now();

alter table public.comments
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists review_id uuid,
  add column if not exists user_id uuid,
  add column if not exists content text,
  add column if not exists created_at timestamptz not null default now();

alter table public.notifications
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists review_id uuid,
  add column if not exists type text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table public.user_games
  add column if not exists user_id uuid,
  add column if not exists game_id bigint,
  add column if not exists steam_app_id bigint,
  add column if not exists playtime_minutes integer not null default 0,
  add column if not exists last_played_at timestamptz;

  update public.reviews
    set content = review_text
    where content is null;

  update public.comments
    set content = comment_text
    where content is null;

  update public.notifications
    set read_at = created_at
    where is_read and read_at is null;

create table if not exists public.review_likes (
    review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table if not exists public.steam_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  steam_id text not null unique,
  profile_url text,
  linked_at timestamptz not null default now(),
  synced_at timestamptz
);

create unique index if not exists games_external_id_unique
  on public.games (external_id);

create unique index if not exists user_games_steam_app_unique
  on public.user_games (user_id, steam_app_id);

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

create index if not exists comments_review_created_idx
  on public.comments (review_id, created_at);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_game_fkey'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_game_fkey
      foreign key (game_id) references public.user_games(id)
      on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_games_game_fkey'
      and conrelid = 'public.user_games'::regclass
  ) then
    alter table public.user_games
      add constraint user_games_game_fkey
      foreign key (game_id) references public.games(id)
      on delete cascade not valid;
  end if;
end $$;

create or replace function public.notify_review_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  review_owner uuid;
  interaction_type text;
begin
  select user_id
    into review_owner
    from public.reviews
    where id = new.review_id;

  if tg_table_name = 'comments' then
    interaction_type := 'comment';
  else
    interaction_type := 'like';
  end if;

  if review_owner is not null and review_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, review_id, type, is_read)
    values (review_owner, new.user_id, new.review_id, interaction_type, false);
  end if;

  return new;
end;
$$;

drop trigger if exists comments_notify_review_interaction on public.comments;
create trigger comments_notify_review_interaction
  after insert on public.comments
  for each row execute function public.notify_review_interaction();

drop trigger if exists likes_notify_review_interaction on public.review_likes;
create trigger likes_notify_review_interaction
  after insert on public.review_likes
  for each row execute function public.notify_review_interaction();

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles', 'games', 'reviews', 'comments', 'notifications',
        'user_games', 'user_library', 'review_likes', 'steam_connections'
      ])
  loop
    execute format(
      'drop policy %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.reviews enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.user_games enable row level security;
alter table public.user_library enable row level security;
alter table public.review_likes enable row level security;
alter table public.steam_connections enable row level security;

create policy profiles_read_authenticated on public.profiles
  for select to authenticated using (true);
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy games_read_all on public.games
  for select to anon, authenticated using (true);
create policy games_insert_authenticated on public.games
  for insert to authenticated with check (true);
create policy games_update_authenticated on public.games
  for update to authenticated using (true) with check (true);

create policy reviews_read_authenticated on public.reviews
  for select to authenticated using (true);
create policy reviews_insert_self on public.reviews
  for insert to authenticated with check (user_id = auth.uid());
create policy reviews_update_self on public.reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete_self on public.reviews
  for delete to authenticated using (user_id = auth.uid());

create policy comments_read_authenticated on public.comments
  for select to authenticated using (true);
create policy comments_insert_self on public.comments
  for insert to authenticated with check (user_id = auth.uid());
create policy comments_update_self on public.comments
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete_self on public.comments
  for delete to authenticated using (user_id = auth.uid());

create policy notifications_read_self on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_self on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_games_read_self on public.user_games
  for select to authenticated using (user_id = auth.uid());
create policy user_games_read_reviewed_games on public.user_games
  for select to authenticated using (
    exists (
      select 1 from public.reviews
      where reviews.game_id = user_games.id
    )
  );
create policy user_games_insert_self on public.user_games
  for insert to authenticated with check (user_id = auth.uid());
create policy user_games_update_self on public.user_games
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_games_delete_self on public.user_games
  for delete to authenticated using (user_id = auth.uid());

create policy user_library_read_self on public.user_library
  for select to authenticated using (user_id = auth.uid());
create policy user_library_insert_self on public.user_library
  for insert to authenticated with check (user_id = auth.uid());
create policy user_library_update_self on public.user_library
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_library_delete_self on public.user_library
  for delete to authenticated using (user_id = auth.uid());

create policy review_likes_read_authenticated on public.review_likes
  for select to authenticated using (true);
create policy review_likes_insert_self on public.review_likes
  for insert to authenticated with check (user_id = auth.uid());
create policy review_likes_delete_self on public.review_likes
  for delete to authenticated using (user_id = auth.uid());

create policy steam_connections_read_self on public.steam_connections
  for select to authenticated using (user_id = auth.uid());

grant select on public.games to anon, authenticated;
grant select, insert, update on public.games to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.user_games to authenticated;
grant select, insert, update, delete on public.user_library to authenticated;
grant select, insert, delete on public.review_likes to authenticated;
grant select on public.steam_connections to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_public_read'
  ) then
    execute 'create policy avatars_public_read on storage.objects for select to anon, authenticated using (bucket_id = ''avatars'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_upload_self'
  ) then
    execute 'create policy avatars_upload_self on storage.objects for insert to authenticated with check (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_update_self'
  ) then
    execute 'create policy avatars_update_self on storage.objects for update to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_delete_self'
  ) then
    execute 'create policy avatars_delete_self on storage.objects for delete to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';
  end if;
end $$;

notify pgrst, 'reload schema';

commit;