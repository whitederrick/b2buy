-- =============================================================================
-- B2BUY (비투바이) - 초기 스키마 마이그레이션
-- 기반 문서:
--   - B2BUY AI 개발용 시스템 아키텍처 및 기획 정의서 (2. 데이터 모델)
--   - B2BUY_ERDCLOUD.xlsx (사용자/회사/공동구매 신청/공동구매/제품 정보/HS코드)
-- Supabase / PostgreSQL 15+ 기준
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- 대소문자 무시 이메일

-- -----------------------------------------------------------------------------
-- 1. ENUM 타입 정의
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'deal_status') then
    create type deal_status as enum (
      '모집중',         -- 진행 중 (current_qty < moq_target, now < end_date)
      '공구성공',       -- 마감 시점 current_qty >= moq_target
      '공구실패',       -- 마감 시점 current_qty <  moq_target
      '배송중',
      '완료'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'escrow_status') then
    create type escrow_status as enum (
      '입금대기',
      '예치완료',
      '정산완료',
      '환불완료'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipping_type') then
    create type shipping_type as enum (
      '사무실',
      '창고',
      '공장',
      '기타'
    );
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 2. users (사용자 + 회사/법인 정보 통합 테이블)
-- 기획 정의서 2.1 + ERD의 사용자/회사 1:1 결합
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            text        unique not null,                       -- 로그인 ID
  password_hash      text        not null,                              -- bcrypt hash
  manager_name       text        not null,                              -- 담당자명
  phone_number       text        not null,                              -- 휴대폰번호
  email              citext      unique not null,                       -- 이메일
  department         text,                                              -- 부서명
  position           text,                                              -- 직책
  -- 법인/회사 정보
  company_reg_no     text        not null,                              -- 사업자등록번호
  company_name       text        not null,                              -- 법인명
  ceo_name           text        not null,                              -- 대표자명
  company_phone      text,                                              -- 대표전화
  company_address    text,                                              -- 사업장 주소
  zip_code           text,                                              -- 우편번호
  biz_type           text,                                              -- 업태
  biz_item           text,                                              -- 업종
  -- 기본배송지(요청사항에서 자주 사용)
  default_shipping_type  shipping_type default '사무실',
  default_shipping_addr  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_users_user_id  on public.users (user_id);
create index if not exists idx_users_company  on public.users (company_reg_no);

-- -----------------------------------------------------------------------------
-- 3. hs_codes (HS 코드 마스터) - ERD의 Original/2 Level 테이블 통합
-- -----------------------------------------------------------------------------
create table if not exists public.hs_codes (
  hs_code        text primary key,                 -- 예: 3923.30
  kor_name       text,                              -- 한글 품명
  eng_name       text,                              -- 영문 품명
  default_rate   numeric(5,2),                      -- 기본 세율(%)
  category_code  text,                              -- 2 Level (부/류 코드)
  kor_section    text,                              -- 한글 부 명칭
  eng_section    text,                              -- 영문 부 명칭
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. group_buy_deals (공동구매 딜 마스터)
-- 기획 정의서 2.2 + ERD 공동구매/제품 정보 결합
-- price_tiers 예시:
-- [
--   {"min_qty": 1000,  "max_qty": 9999,  "price": 250},
--   {"min_qty": 10000, "max_qty": 29999, "price": 200},
--   {"min_qty": 30000, "max_qty": null,  "price": 180}
-- ]
-- -----------------------------------------------------------------------------
create table if not exists public.group_buy_deals (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,                       -- 공동구매 명
  hs_code         text        references public.hs_codes (hs_code),
  product_name    text        not null,                       -- 품목 명
  product_url     text,                                       -- 1688/알리바바 원천 URL
  image_url       text,                                       -- 대표 이미지
  category        text        not null default 'C',           -- 카테고리(A/B/C/D...)
  moq_target      integer     not null check (moq_target > 0),
  current_qty     integer     not null default 0 check (current_qty >= 0),
  min_buy_qty     integer     not null default 1,             -- 1인 최소 구매 수량
  max_buy_qty     integer,                                    -- 1인 최대 구매 수량
  start_date      timestamptz not null,
  end_date        timestamptz not null,
  status          deal_status not null default '모집중',
  price_tiers     jsonb       not null,                       -- 구간별 단가
  base_price      integer     not null,                       -- 기준가(국내 도매가) - 절감액 계산용
  escrow_fee_rate numeric(5,2) not null default 1.5,          -- 에스크로 수수료(%)
  platform_fee    numeric(5,2) not null default 5.0,          -- 플랫폼 수수료(%)
  shipping_cost   integer     not null default 0,             -- 배송비(전체 공구)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_deal_period check (end_date > start_date)
);

create index if not exists idx_deals_status   on public.group_buy_deals (status);
create index if not exists idx_deals_end_date on public.group_buy_deals (end_date);
create index if not exists idx_deals_hs_code  on public.group_buy_deals (hs_code);

-- -----------------------------------------------------------------------------
-- 5. group_buy_participations (공동구매 참여 내역)
-- 기획 정의서 2.3
-- -----------------------------------------------------------------------------
create table if not exists public.group_buy_participations (
  id              uuid            primary key default gen_random_uuid(),
  user_id         uuid            not null references public.users (id)         on delete cascade,
  deal_id         uuid            not null references public.group_buy_deals (id) on delete cascade,
  requested_qty   integer         not null check (requested_qty > 0),
  initial_price   integer         not null,                       -- 참여 시점 단가
  final_price     integer,                                        -- 마감 후 확정 단가
  escrow_status   escrow_status   not null default '입금대기',
  shipping_addr   text            not null,
  shipping_type   shipping_type   not null,
  escrow_vacct    text,                                           -- 하나은행 가상계좌
  participated_at timestamptz     not null default now(),
  settled_at      timestamptz,
  unique (user_id, deal_id)  -- 동일 Deal 1회 참여(정책에 따라 변경 가능)
);

create index if not exists idx_part_user on public.group_buy_participations (user_id);
create index if not exists idx_part_deal on public.group_buy_participations (deal_id);

-- -----------------------------------------------------------------------------
-- 6. 가격 계산/달성률 뷰 (조회 성능 최적화 + 프론트 노출 가공)
-- -----------------------------------------------------------------------------
create or replace view public.v_deal_progress as
select
  d.id                                                      as deal_id,
  d.title,
  d.product_name,
  d.image_url,
  d.moq_target,
  d.current_qty,
  d.status,
  d.end_date,
  d.start_date,
  d.price_tiers,
  d.base_price,
  case
    when d.moq_target > 0
    then round((d.current_qty::numeric / d.moq_target) * 100, 2)
    else 0
  end                                                        as achievement_pct,
  case
    when d.end_date > now() then
      greatest(0, ceil(extract(epoch from (d.end_date - now())) / 86400))::int
    else 0
  end                                                        as d_day,
  (select count(*) from public.group_buy_participations p where p.deal_id = d.id) as participant_count
from public.group_buy_deals d;

-- -----------------------------------------------------------------------------
-- 7. 마감 스케줄러용 RPC 함수 (Task 2에서 호출)
-- 마감일 도달 시 status / final_price / escrow_status 일괄 업데이트
-- -----------------------------------------------------------------------------
create or replace function public.settle_group_buy(p_deal_id uuid)
returns table (
  deal_id          uuid,
  final_status     deal_status,
  final_price      integer,
  updated_rows     integer
)
language plpgsql
security definer
as $$
declare
  v_moq        integer;
  v_qty        integer;
  v_status     deal_status;
  v_final_price integer;
  v_rows       integer;
begin
  select moq_target, current_qty
    into v_moq, v_qty
  from public.group_buy_deals
  where id = p_deal_id
  for update;

  if v_moq is null then
    raise exception 'deal not found: %', p_deal_id;
  end if;

  if v_qty >= v_moq then
    -- 성공: 현재 누적 수량이 속한 구간의 단가를 final_price로 결정
    v_status     := '공구성공';
    v_final_price := public.current_tier_price(p_deal_id, v_qty);

    update public.group_buy_deals
       set status     = v_status,
           final_price = v_final_price,
           updated_at  = now()
     where id = p_deal_id;

    update public.group_buy_participations
       set final_price   = v_final_price,
           escrow_status = '예치완료',
           settled_at    = now()
     where deal_id = p_deal_id
       and final_price is null;
  else
    -- 실패: 전액 환불
    v_status     := '공구실패';
    v_final_price := null;

    update public.group_buy_deals
       set status     = v_status,
           updated_at = now()
     where id = p_deal_id;

    update public.group_buy_participations
       set escrow_status = '환불완료',
           settled_at    = now()
     where deal_id = p_deal_id
       and escrow_status in ('입금대기','예치완료');
  end if;

  get diagnostics v_rows = row_count;
  deal_id      := p_deal_id;
  final_status := v_status;
  final_price  := v_final_price;
  updated_rows := v_rows;
  return next;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. price_tiers 기반 현재 구간 단가 계산 함수
-- 사용: current_tier_price(deal_id, current_qty)
-- -----------------------------------------------------------------------------
create or replace function public.current_tier_price(p_deal_id uuid, p_qty integer)
returns integer
language plpgsql
stable
as $$
declare
  v_tiers jsonb;
  v_price integer;
begin
  select price_tiers into v_tiers
    from public.group_buy_deals
   where id = p_deal_id;

  -- JSON 순회: 가장 비싼(첫 번째) 구간부터 매칭
  select (tier->>'price')::int
    into v_price
    from jsonb_array_elements(v_tiers) as tier
   where p_qty >= coalesce((tier->>'min_qty')::int, 0)
     and (
       (tier->>'max_qty')::int is null
       or p_qty < (tier->>'max_qty')::int
     )
   order by (tier->>'price')::int asc
   limit 1;

  return coalesce(v_price, 0);
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. updated_at 자동 갱신 트리거
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated   on public.users;
drop trigger if exists trg_deals_updated   on public.group_buy_deals;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_deals_updated before update on public.group_buy_deals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. Row Level Security (RLS) - 안전 가드
-- -----------------------------------------------------------------------------
alter table public.users                 enable row level security;
alter table public.group_buy_deals       enable row level security;
alter table public.group_buy_participations enable row level security;
alter table public.hs_codes              enable row level security;

-- deals: 누구나 모집중/성공/실패 등 "공개" 상태는 조회 가능
drop policy if exists deals_public_read on public.group_buy_deals;
create policy deals_public_read on public.group_buy_deals
  for select using (true);   -- 필요 시 status='모집중' 등으로 제한

-- participations: 본인 것만 조회/수정
drop policy if exists parts_owner on public.group_buy_participations;
create policy parts_owner on public.group_buy_participations
  for all using (auth.uid() = user_id)
          with check (auth.uid() = user_id);

-- users: 본인 row만
drop policy if exists users_owner on public.users;
create policy users_owner on public.users
  for all using (auth.uid() = id)
          with check (auth.uid() = id);

-- hs_codes: 공개
drop policy if exists hs_public on public.hs_codes;
create policy hs_public on public.hs_codes
  for select using (true);

-- =============================================================================
-- 마이그레이션 끝.
-- 다음 단계:
--   1) Supabase Studio > SQL Editor에서 본 파일 실행
--   2) 정산 스케줄러는 Supabase > Database > Webhooks 또는 Edge Function,
--      또는 GitHub Actions + cron 으로 public.settle_group_buy() 호출
-- =============================================================================
