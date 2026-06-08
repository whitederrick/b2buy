-- =============================================================================
-- 20260102_auth_link_and_signup.sql
--  - public.users.id 를 auth.users(id) 와 1:1 연결 (FK)
--  - auth.users INSERT 시 자동으로 public.users row 생성 (트리거)
--  - 회원가입 시 public.users에 회사/담당자 정보를 함께 채우는 RPC
--  - 마이그레이션 순서: 20260101_init_b2buy_schema.sql 실행 "이후"
-- =============================================================================

-- 호스팅 DB의 advisory lock 대기를 짧게 (5초) — 멈춤 방지
set lock_timeout = '5s';
set statement_timeout = '120s';

-- -----------------------------------------------------------------------------
-- 1) public.users.id (gen_random_uuid) → auth.users(id) FK 로 교체
--    - 의존성 순서: participations.user_id FK → users PK
--    - 안전을 위해 모든 행 정리 (개발/데모 단계)
-- -----------------------------------------------------------------------------

-- (1-a) 자식 테이블들의 FK를 먼저 끊는다
alter table if exists public.group_buy_participations
  drop constraint if exists group_buy_participations_user_id_fkey;

-- (1-b) users PK 제거
alter table public.users
  drop constraint if exists users_pkey;

-- (1-c) 데이터 정리 (FK 끊었으므로 안전)
truncate table public.group_buy_participations;
truncate table public.users restart identity cascade;

-- (1-d) users PK 재생성 (이제 default 만 유지; FK는 auth.users 가 부모)
alter table public.users
  alter column id set default gen_random_uuid();

alter table public.users
  add constraint users_pkey primary key (id);

-- (1-e) auth.users 와 FK 연결 (이미 있으면 재생성만)
alter table public.users
  drop constraint if exists users_id_fkey;
alter table public.users
  add constraint users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- (1-f) 자식 테이블 FK 재설정 (auth.users 가 부모와 동일 ID 공간)
alter table public.group_buy_participations
  drop constraint if exists group_buy_participations_user_id_fkey;
alter table public.group_buy_participations
  add constraint group_buy_participations_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

-- user_id 컬럼을 login id 로 사용하므로 unique index 보강
create unique index if not exists idx_users_user_id on public.users (user_id);

-- -----------------------------------------------------------------------------
-- 2) 회원가입 RPC: auth.users + public.users 를 한 트랜잭션으로 생성
-- -----------------------------------------------------------------------------
create or replace function public.signup_b2buy_user(
  p_email           text,
  p_password        text,
  p_user_id         text,
  p_manager_name    text,
  p_phone_number    text,
  p_company_reg_no  text,
  p_company_name    text,
  p_ceo_name        text,
  p_department      text    default null,
  p_position        text    default null,
  p_company_phone   text    default null,
  p_company_address text    default null,
  p_zip_code        text    default null,
  p_biz_type        text    default null,
  p_biz_item        text    default null
)
returns table (
  user_id    uuid,
  login_id   text,
  email      text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_new_uid uuid := gen_random_uuid();
begin
  -- 1) auth.users 에 직접 INSERT
  insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_new_uid,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider','email','providers', array['email']),
    jsonb_build_object('user_id', p_user_id, 'manager_name', p_manager_name),
    now(), now()
  );

  -- 2) auth.identities 에 email identity 등록
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_new_uid,
    jsonb_build_object('sub', v_new_uid::text, 'email', p_email, 'email_verified', true),
    'email',
    v_new_uid::text,
    now(), now()
  );

  -- 3) public.users 프로필 row 생성
  insert into public.users (
    id, user_id, password_hash, manager_name, phone_number, email,
    department, position,
    company_reg_no, company_name, ceo_name,
    company_phone, company_address, zip_code, biz_type, biz_item
  ) values (
    v_new_uid, p_user_id, 'managed-by-supabase-auth', p_manager_name, p_phone_number, p_email,
    p_department, p_position,
    p_company_reg_no, p_company_name, p_ceo_name,
    p_company_phone, p_company_address, p_zip_code, p_biz_type, p_biz_item
  );

  return query select v_new_uid, p_user_id, p_email;
end;
$$;

grant execute on function public.signup_b2buy_user(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) handle_new_user 트리거 (fallback)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users (id, user_id, password_hash, manager_name, phone_number, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_id', 'user_' || substr(new.id::text, 1, 8)),
    'managed-by-supabase-auth',
    coalesce(new.raw_user_meta_data->>'manager_name', '미입력'),
    '-',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 4) RLS 정책
-- -----------------------------------------------------------------------------
drop policy if exists users_owner on public.users;
create policy users_owner on public.users
  for all using (auth.uid() = id)
          with check (auth.uid() = id);

drop policy if exists parts_owner on public.group_buy_participations;
create policy parts_owner on public.group_buy_participations
  for all using (auth.uid() = user_id)
          with check (auth.uid() = user_id);

drop policy if exists deals_anon_read on public.group_buy_deals;
create policy deals_anon_read on public.group_buy_deals
  for select to anon, authenticated using (true);

drop policy if exists hs_anon_read on public.hs_codes;
create policy hs_anon_read on public.hs_codes
  for select to anon, authenticated using (true);

-- =============================================================================
-- 끝.
-- =============================================================================
