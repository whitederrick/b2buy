# B2BUY Supabase 셋업 가이드

> 이 문서는 **B2BUY 프로젝트를 처음부터 Supabase에 연결**하기 위한 절차입니다.
> 다음 3가지 환경 중 하나를 선택해 진행하세요.

---

## 0. 공통 준비물

- Node.js 18+ / npm 9+
- (옵션 A, C) Docker Desktop — 로컬/원격 컨테이너 실행용
- Supabase 계정 (https://supabase.com)

`.env.local` 은 **git에 커밋 금지**입니다. `.env.local.example` 을 복사해 채워주세요.

```bash
cp .env.local.example .env.local
```

---

## A) 로컬 Supabase (Docker) — 가장 빠른 시작

```bash
# 1) Supabase CLI 설치 (없다면)
npm i -g supabase

# 2) 로컬 스택 시작 (Postgres, Auth, Studio, Storage, Realtime)
npm run db:start
# → http://127.0.0.1:54323 에서 Studio 접속 가능
# → 출력되는 anon key / service_role key 를 .env.local 에 복사

# 3) .env.local 채우기
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<출력된 anon key>
SUPABASE_SERVICE_ROLE_KEY=<출력된 service_role key>

# 4) 시드 데이터 포함 DB 리셋
npm run db:seed
# 또는
supabase db reset

# 5) 개발 서버
npm run dev
```

---

## B) 원격 Supabase (Hosted) — 권장 (프로덕션)

```bash
# 1) https://supabase.com/dashboard 에서 새 프로젝트 생성
#    - Database password 안전하게 저장
#    - Region: Seoul (ap-northeast-2) 권장
#    - Project ref 이름 기억 (예: b2buy-prod)

# 2) 로컬과 원격 연결
export SUPABASE_PROJECT_REF=your-project-ref
npm run db:link

# 3) 마이그레이션 적용
npm run db:push
# 또는 대시보드 SQL Editor에서
#   supabase/migrations/*.sql 을 순서대로 실행

# 4) 시드 데이터
#    대시보드 SQL Editor → supabase/seed.sql 붙여넣기 + 실행

# 5) .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Settings > API
SUPABASE_SERVICE_ROLE_KEY=...       # Settings > API (절대 클라이언트 노출 금지)

# 6) 타입 자동 생성
npm run db:types
```

---

## C) 대시보드에서 수동 설정 (가장 단순)

CLI/Docker 없이 **웹 UI만**으로 하는 방법입니다.

1. https://supabase.com/dashboard → New Project
2. **SQL Editor** → New query → 아래 순서로 실행:
   - `supabase/migrations/20260101_init_b2buy_schema.sql`
   - `supabase/migrations/20260102_auth_link_and_signup.sql`
   - `supabase/migrations/20260103_storage_buckets.sql`
   - `supabase/seed.sql`
3. **Storage** → `deal-images`, `user-uploads` 두 버킷이 자동 생성되었는지 확인
4. **Authentication** → Providers → Email 활성화 (Sign up ON)
5. **Settings → API** → `URL`, `anon key`, `service_role key` 복사 → `.env.local`
6. (선택) **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (개발) / `https://yourdomain.com` (운영)
   - Redirect URLs: `http://localhost:3000/**`
7. **Database → Cron Jobs** 또는 **Vercel Cron** (옵션):
   - 매일 1회 `POST /api/deals/settle` with `Authorization: Bearer ${CRON_SECRET}`

---

## 적용된 마이그레이션이 만들어주는 것

| 마이그레이션 | 역할 |
|---|---|
| `20260101_init_b2buy_schema.sql` | ENUM, 테이블(`users`, `hs_codes`, `group_buy_deals`, `group_buy_participations`), 뷰(`v_deal_progress`), 함수(`current_tier_price`, `settle_group_buy`), RLS, 트리거 |
| `20260102_auth_link_and_signup.sql` | `public.users.id` ↔ `auth.users.id` 1:1 FK, 회원가입 RPC `signup_b2buy_user`, auth.users 트리거 `handle_new_auth_user` |
| `20260103_storage_buckets.sql` | Storage 버킷(`deal-images`, `user-uploads`) + RLS |

## 적용된 RLS 정책 요약

| 테이블 / 버킷 | 정책 | 효과 |
|---|---|---|
| `group_buy_deals` | `deals_anon_read` | 누구나(anon 포함) 조회 가능 |
| `group_buy_deals` | (쓰기) | service_role만 (서버 RPC로) |
| `hs_codes` | `hs_anon_read` | 누구나 조회 |
| `users` | `users_owner` | `auth.uid() = id` 본인만 |
| `group_buy_participations` | `parts_owner` | `auth.uid() = user_id` 본인만 |
| Storage `deal-images` | `deal_images_read` (public) / `*_admin_*` | 모두 읽기, service_role만 쓰기 |
| Storage `user-uploads` | `user_uploads_owner_*` | 본인 폴더(`{auth.uid()}/...`)만 |

---

## 동작 확인 체크리스트

```bash
# 1) dev 서버 기동
npm run dev

# 2) 회원가입 페이지에서 테스트 계정 생성
#    http://localhost:3000/login  →  회원가입 탭
#    입력: user_id=hong, password=pass1234!, email=hong@test.com, 회사정보...
#    → /mypage로 자동 이동

# 3) 데이터가 잘 들어갔는지 확인 (Supabase Studio)
#    Authentication → Users          : hong@test.com 등장
#    Table Editor → public.users     : 회사/담당자 정보 함께 등장
#    Table Editor → public.group_buy_deals : 시드 3건

# 4) 딜 목록 페이지
#    http://localhost:3000/deals
#    → "DEMO 데이터" 뱃지가 사라지고 실제 DB 데이터 표시
```

---

## 문제 해결 (Troubleshooting)

| 증상 | 원인 | 해결 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL 환경변수 …` 예외 | `.env.local` 없음/오타 | `.env.local` 다시 채우고 dev 서버 재시작 |
| 가입 후 401 / "이메일 또는 비밀번호가 올바르지 않습니다." | `20260102_*.sql` 미적용 | SQL Editor에서 마이그레이션 실행 |
| 마이페이지에 아무것도 안 보임 | RLS가 너무 빡빡 | SQL Editor에서 `select * from pg_policies where schemaname='public';` 확인 |
| Storage 업로드 403 | 버킷 정책 미적용 | `20260103_*.sql` 재실행 |
| `/api/deals/settle` 401 | `CRON_SECRET` 미일치 | `openssl rand -hex 32` → Vercel env |
| `participate` 가 500 | `participate_in_deal` RPC 미생성 | `20260101_*.sql` 재실행 |
| `price_tiers` 한국어 깨짐 | UTF-8 인코딩 문제 | SQL Editor는 UTF-8, `.sql` 파일도 UTF-8 (BOM 없음) |

---

## 다음 단계 (운영 전)

- [ ] Vercel 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` 등록
- [ ] 도메인 설정 + `NEXT_PUBLIC_SITE_URL` 변경
- [ ] Auth → Email → Confirm email ON (운영)
- [ ] Storage CDN 도메인 (`supabase.co`) → 커스텀 도메인
- [ ] Vercel Cron 또는 Supabase Edge Function (cron) 으로 `/api/deals/settle` 매일 1회 호출
- [ ] 하나은행 에스크로 API 키 발급 + `HANA_ESCROW_*` 환경변수 등록
- [ ] Sentry / Logflare 로 에러 모니터링
- [ ] DB 백업 (Supabase Pro는 PITR, Free는 일 1회)
