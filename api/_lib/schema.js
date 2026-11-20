'use strict';
// Toàn bộ cấu trúc bảng. Chạy tự động ở lần gọi API đầu tiên sau mỗi lần deploy (an toàn khi chạy lại).
module.exports = `
create table if not exists users (
  id              bigserial primary key,
  username        text        not null,
  username_lower  text        not null unique,
  password_hash   text        not null,
  is_admin        boolean     not null default false,
  is_disabled     boolean     not null default false,
  can_hsk         boolean     not null default false,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz
);

create table if not exists sessions (
  token_hash  text primary key,
  user_id     bigint      not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists sessions_user_idx    on sessions(user_id);
create index if not exists sessions_expires_idx on sessions(expires_at);

create table if not exists auth_events (
  id              bigserial primary key,
  kind            text        not null,
  username_lower  text,
  ip              text,
  at              timestamptz not null default now()
);
create index if not exists auth_events_at_idx on auth_events(at);

create table if not exists exams (
  id          bigserial primary key,
  name        text        not null,
  name_lower  text        not null unique,
  level       text        not null default '',
  data        jsonb       not null,
  guest       boolean     not null default false,
  created_by  bigint      references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists attempts (
  id              bigserial primary key,
  user_id         bigint      not null references users(id) on delete cascade,
  client_id       text        not null,
  level           text        not null default '',
  exams           jsonb       not null default '[]',
  total           int         not null,
  correct         int         not null,
  wrong           int         not null,
  blank           int         not null,
  sections        jsonb       not null default '[]',
  duration_sec    int         not null default 0,
  limit_sec       int         not null default 0,
  auto_submitted  boolean     not null default false,
  started_at      timestamptz not null,
  finished_at     timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists attempts_user_idx on attempts(user_id, finished_at desc);
create index if not exists attempts_time_idx on attempts(finished_at desc);

alter table users add column if not exists can_hsk boolean not null default false;
alter table exams add column if not exists guest boolean not null default false;

`;
