-- ============================================================
-- HireLens Supabase Migration
-- Run this in the Supabase SQL Editor (once)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  theme       text default 'light',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CV VERSIONS
-- ============================================================
create table if not exists public.cv_versions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  filename     text not null,
  raw_text     text,
  parsed_data  jsonb,
  created_at   timestamptz default now()
);

alter table public.cv_versions enable row level security;

create policy "Users can manage own cv_versions"
  on public.cv_versions for all
  using (auth.uid() = user_id);

create index idx_cv_versions_user_id on public.cv_versions(user_id);

-- ============================================================
-- JOBS
-- ============================================================
create table if not exists public.jobs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  url          text,
  raw_text     text,
  parsed_data  jsonb,
  created_at   timestamptz default now()
);

alter table public.jobs enable row level security;

create policy "Users can manage own jobs"
  on public.jobs for all
  using (auth.uid() = user_id);

create index idx_jobs_user_id on public.jobs(user_id);

-- ============================================================
-- ANALYSES
-- ============================================================
create table if not exists public.analyses (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  cv_id         uuid references public.cv_versions(id) on delete set null,
  job_id        uuid references public.jobs(id) on delete set null,
  match_score   integer,
  ats_score     integer,
  breakdown     jsonb,
  created_at    timestamptz default now()
);

alter table public.analyses enable row level security;

create policy "Users can manage own analyses"
  on public.analyses for all
  using (auth.uid() = user_id);

create index idx_analyses_user_id on public.analyses(user_id);
create index idx_analyses_created_at on public.analyses(created_at desc);

-- ============================================================
-- APPLICATIONS (Tracker)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    create type application_status as enum (
      'saved', 'applied', 'interview', 'offer', 'rejected', 'ghosted'
    );
  END IF;
END $$;

create table if not exists public.applications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  job_title     text not null,
  company       text not null,
  job_url       text default '',
  status        application_status default 'saved',
  cv_id         uuid references public.cv_versions(id) on delete set null,
  analysis_id   uuid references public.analyses(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.applications enable row level security;

create policy "Users can manage own applications"
  on public.applications for all
  using (auth.uid() = user_id);

create index idx_applications_user_id on public.applications(user_id);
create index idx_applications_status on public.applications(status);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at
  before update on public.applications
  for each row execute procedure public.update_updated_at();

-- ============================================================
-- GRANT service role access (needed for backend admin client)
-- ============================================================
grant all on public.profiles to service_role;
grant all on public.cv_versions to service_role;
grant all on public.jobs to service_role;
grant all on public.analyses to service_role;
grant all on public.applications to service_role;
