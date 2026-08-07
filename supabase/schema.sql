-- ════════════════════════════════════════════════════════════
--  LIGA eFOOTBALL — skema Supabase
--  Jalankan seluruh isi file ini di Supabase > SQL Editor
-- ════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Liga ────────────────────────────────────────────────────
create table if not exists leagues (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null default 'LIGA EFOOTBALL',
  season        text not null default 'SEASON 1',
  handle        text not null default '@ligaefootball',
  double_round  boolean not null default false,
  pts_win       int not null default 3,
  pts_draw      int not null default 1,
  pts_loss      int not null default 0,
  auto_confirm  boolean not null default false,
  registration_open boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Tim peserta ─────────────────────────────────────────────
create table if not exists teams (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references leagues(id) on delete cascade,
  name       text not null,
  player     text default '',
  short      text default '',
  created_at timestamptz not null default now()
);
create index if not exists teams_league_idx on teams(league_id);

-- ── Jadwal & hasil ──────────────────────────────────────────
create table if not exists fixtures (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references leagues(id) on delete cascade,
  md           int not null,
  home_id      uuid not null references teams(id) on delete cascade,
  away_id      uuid not null references teams(id) on delete cascade,
  home_score   int,
  away_score   int,
  status       text not null default 'scheduled',   -- scheduled | pending | confirmed
  match_date   date,
  match_time   text default '',
  reporter     text default '',
  source       text default '',                     -- 'ai' | 'manual' | 'admin'
  ai_note      text default '',
  evidence_url text default '',
  reported_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists fixtures_league_idx on fixtures(league_id, md);

-- ── Keamanan ────────────────────────────────────────────────
-- Semua akses lewat API route pakai service role key, jadi
-- akses langsung dari browser ditutup total.
alter table leagues  enable row level security;
alter table teams    enable row level security;
alter table fixtures enable row level security;

-- Izin akses. Sejak 30 Mei 2026 project baru tidak lagi memberi
-- grant otomatis, jadi service_role harus diberi izin eksplisit.
-- anon sengaja tidak diberi izin apa pun.
grant usage on schema public to service_role;
grant select, insert, update, delete on leagues  to service_role;
grant select, insert, update, delete on teams    to service_role;
grant select, insert, update, delete on fixtures to service_role;

-- ── Liga awal ───────────────────────────────────────────────
insert into leagues (slug, name, season, handle)
values ('main', 'LIGA EFOOTBALL', 'SEASON 1', '@ligaefootball')
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════
--  Storage: bucket bukti screenshot
--  Buat lewat Supabase > Storage > New bucket
--    Nama   : evidence
--    Public : ya
--  Atau jalankan baris di bawah ini.
-- ════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;
