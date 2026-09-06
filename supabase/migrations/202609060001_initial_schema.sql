-- Travel Agent: shared trip model and row-level access rules.
-- Apply through Supabase migrations. No application secret belongs in this file.

create extension if not exists "pgcrypto";
create schema if not exists private;

create type public.trip_role as enum ('owner', 'admin', 'member');
create type public.plan_status as enum ('wishlist', 'approved', 'booked', 'recheck');
create type public.plan_category as enum ('transport', 'stays', 'events', 'places', 'next');
create type public.participant_scope as enum ('everyone', 'group', 'person');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) >= 2),
  origin text not null,
  destination_country text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_trip_dates check (end_date >= start_date)
);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.trip_role not null default 'member',
  participation_start date,
  participation_end date,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id),
  constraint valid_participation_dates check (
    participation_end is null or participation_start is null or participation_end >= participation_start
  )
);

create table public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  category public.plan_category not null,
  title text not null,
  subtitle text,
  details text,
  source_name text,
  source_url text,
  price_amount numeric(12, 2) check (price_amount is null or price_amount >= 0),
  final_price_amount numeric(12, 2) check (final_price_amount is null or final_price_amount >= 0),
  currency char(3) not null default 'RUB',
  status public.plan_status not null default 'wishlist',
  participant_scope public.participant_scope not null default 'everyone',
  participant_ids uuid[] not null default '{}',
  needs_recheck boolean not null default false,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  plan_item_id uuid references public.plan_items(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  category public.plan_category not null,
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'RUB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  plan_item_id uuid references public.plan_items(id) on delete set null,
  body text not null check (char_length(trim(body)) > 0),
  link_url text,
  created_at timestamptz not null default now()
);

create index trip_members_user_idx on public.trip_members(user_id);
create index plan_items_trip_status_idx on public.plan_items(trip_id, status);
create index budget_items_trip_idx on public.budget_items(trip_id);
create index messages_trip_created_idx on public.messages(trip_id, created_at);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger trips_set_updated_at before update on public.trips
for each row execute function private.set_updated_at();
create trigger plan_items_set_updated_at before update on public.plan_items
for each row execute function private.set_updated_at();
create trigger budget_items_set_updated_at before update on public.budget_items
for each row execute function private.set_updated_at();

create or replace function private.add_trip_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger trips_add_owner after insert on public.trips
for each row execute function private.add_trip_owner();

create or replace function private.is_trip_member(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_trip_admin(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
      where trip_id = target_trip_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_trip_member(uuid) to authenticated;
grant execute on function private.is_trip_admin(uuid) to authenticated;
revoke all on function private.add_trip_owner() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;
alter table public.plan_items enable row level security;
alter table public.budget_items enable row level security;
alter table public.messages enable row level security;

create policy "profiles are visible to self" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "profiles can be created by self" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles can be updated by self" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "members can view trips" on public.trips
for select to authenticated using (private.is_trip_member(id));
create policy "users can create own trips" on public.trips
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "admins can edit trips" on public.trips
for update to authenticated using (private.is_trip_admin(id)) with check (private.is_trip_admin(id));
create policy "owners can delete trips" on public.trips
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "members can view members" on public.trip_members
for select to authenticated using (private.is_trip_member(trip_id));
create policy "admins can manage members" on public.trip_members
for insert to authenticated with check (private.is_trip_admin(trip_id));
create policy "admins can update members" on public.trip_members
for update to authenticated using (private.is_trip_admin(trip_id)) with check (private.is_trip_admin(trip_id));
create policy "admins can remove members" on public.trip_members
for delete to authenticated using (private.is_trip_admin(trip_id) and role <> 'owner');

create policy "admins can view invites" on public.trip_invites
for select to authenticated using (private.is_trip_admin(trip_id));
create policy "admins can create invites" on public.trip_invites
for insert to authenticated with check (private.is_trip_admin(trip_id) and created_by = (select auth.uid()));
create policy "admins can revoke invites" on public.trip_invites
for update to authenticated using (private.is_trip_admin(trip_id));

create policy "members can view plan" on public.plan_items
for select to authenticated using (private.is_trip_member(trip_id));
create policy "members can add plan ideas" on public.plan_items
for insert to authenticated with check (private.is_trip_member(trip_id) and created_by = (select auth.uid()));
create policy "creators and admins can edit plan" on public.plan_items
for update to authenticated using (private.is_trip_admin(trip_id) or created_by = (select auth.uid()))
with check (private.is_trip_admin(trip_id) or (created_by = (select auth.uid()) and status = 'wishlist'));
create policy "admins can delete plan" on public.plan_items
for delete to authenticated using (private.is_trip_admin(trip_id));

create policy "members can view budget" on public.budget_items
for select to authenticated using (private.is_trip_member(trip_id));
create policy "admins can manage budget" on public.budget_items
for all to authenticated using (private.is_trip_admin(trip_id)) with check (private.is_trip_admin(trip_id));

create policy "members can view messages" on public.messages
for select to authenticated using (private.is_trip_member(trip_id));
create policy "members can send messages" on public.messages
for insert to authenticated with check (private.is_trip_member(trip_id) and author_id = (select auth.uid()));
create policy "authors can delete messages" on public.messages
for delete to authenticated using (author_id = (select auth.uid()) or private.is_trip_admin(trip_id));
