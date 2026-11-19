-- Chạy một lần trong Neon (SQL Editor). Chạy lại nhiều lần cũng an toàn.

create table if not exists users (
  id              bigserial primary key,
  username        text        not null,
  username_lower  text        not null unique,
  password_hash   text        not null,
  is_admin        boolean     not null default false,   -- true = admin, false = người dùng thường
  is_disabled     boolean     not null default false,   -- true = tài khoản bị khóa
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz
);

create table if not exists sessions (
  token_hash  text primary key,                          -- chỉ lưu bản băm của mã phiên
  user_id     bigint      not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists sessions_user_idx    on sessions(user_id);
create index if not exists sessions_expires_idx on sessions(expires_at);

create table if not exists settings (
  key   text primary key,
  value text not null
);

-- Ghi lại các lần nhập sai để giới hạn đoán mật khẩu / đoán mã lớp
create table if not exists auth_events (
  id              bigserial primary key,
  kind            text        not null,                  -- 'login_fail' | 'register_fail'
  username_lower  text,
  ip              text,
  at              timestamptz not null default now()
);
create index if not exists auth_events_at_idx on auth_events(at);

-- Mã lớp: người học cần mã này để tạo tài khoản. Để trống = đóng đăng ký.
insert into settings (key, value) values ('class_code', '') on conflict (key) do nothing;

-- ===== Sau khi chạy xong, làm 2 việc dưới đây (sửa lại giá trị rồi chạy riêng từng câu) =====
-- 1) Đặt mã lớp:
--    update settings set value = 'MA-LOP-CUA-BAN' where key = 'class_code';
-- 2) Đăng ký tài khoản của bạn trên web, rồi cấp quyền admin cho tài khoản đó:
--    update users set is_admin = true where username_lower = 'ten-dang-nhap-cua-ban';
