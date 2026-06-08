# B2BUY (비투바이)

> **소상공인·인디 브랜드 대상 뷰티/생활용품 부자재(공용기·펌프 등) 중국 직소싱 펀딩형 공동구매 플랫폼**

Next.js 14 (App Router) + **Supabase (PostgreSQL + Auth + Storage + RLS)** + Tailwind CSS 기반.

## 🚀 빠른 시작 (3분)

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 파일 생성
cp .env.local.example .env.local
# → NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY 입력

# 3) Supabase 마이그레이션 실행 (3개 SQL 파일 순서대로)
#    - supabase/migrations/20260101_init_b2buy_schema.sql
#    - supabase/migrations/20260102_auth_link_and_signup.sql
#    - supabase/migrations/20260103_storage_buckets.sql
#    - supabase/seed.sql                (선택: 데모 데이터)
#    자세한 절차: SUPABASE_SETUP.md

# 4) 개발 서버 실행
npm run dev
# → http://localhost:3000 접속
```

> Supabase 연결 전이라도 `lib/demoData.ts`의 샘플 데이터로 모든 UI/로직이 동작합니다.

### Supabase CLI (Docker) — 한 줄 실행

```bash
npm run db:start         # postgres, auth, storage, studio 컨테이너 기동
npm run db:seed          # 마이그레이션 + 시드 데이터 적용
npm run db:studio        # http://127.0.0.1:54323 (Supabase Studio)
```

## 📁 프로젝트 구조

```
b2buy/
├── app/
│   ├── layout.tsx                  # 글로벌 레이아웃 + Navbar
│   ├── page.tsx                    # 랜딩
│   ├── globals.css                 # Tailwind + 유틸
│   ├── login/page.tsx              # 로그인/회원가입 (Supabase Auth 연동)
│   ├── deals/
│   │   ├── page.tsx                # 메인 (카드 그리드 + KPI)
│   │   └── [id]/page.tsx           # 딜 상세
│   ├── mypage/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts     # POST 회원가입 (auth+public 트랜잭션)
│       │   ├── login/route.ts      # POST 로그인 (쿠키 세션)
│       │   ├── logout/route.ts     # POST 로그아웃
│       │   └── me/route.ts         # GET 현재 사용자 + 프로필
│       └── deals/
│           ├── route.ts            # GET 목록/단건
│           ├── progress/route.ts   # GET 단건 진척도 (실시간 폴링)
│           ├── participate/route.ts# POST 참여 (RPC: participate_in_deal)
│           └── settle/route.ts     # POST 마감 정산 (Vercel Cron)
├── components/
│   ├── DealCard.tsx                # 실시간 진척도 + 구간 단가 테이블
│   ├── OrderPopup.tsx              # 수량 입력 + 절감액 + 에스크로
│   └── Navbar.tsx
├── lib/
│   ├── supabase.ts                 # 3종 클라이언트 + 타입 + 계산 헬퍼
│   ├── auth.ts                     # signup/login/logout/getCurrentUser
│   └── demoData.ts                 # 데모 시드
├── supabase/
│   ├── config.toml                 # Supabase CLI 로컬 개발 설정
│   ├── migrations/
│   │   ├── 20260101_init_b2buy_schema.sql   # ENUM/테이블/뷰/RPC/RLS/트리거
│   │   ├── 20260101_participate_rpc.sql     # participate_in_deal
│   │   ├── 20260102_auth_link_and_signup.sql# auth.users ↔ public.users FK
│   │   └── 20260103_storage_buckets.sql     # deal-images / user-uploads
│   └── seed.sql                    # HS코드 + 데모 딜 3건
├── SUPABASE_SETUP.md               # Supabase 셋업 상세 가이드
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vercel.json                     # /api/deals/settle cron
```

## 🧠 핵심 비즈니스 로직 (기획 정의서 §3)

| 함수 | 위치 | 역할 |
|------|------|------|
| `current_tier_price(deal_id, qty)` | SQL 함수 | price_tiers JSON에서 현재 단가 산출 |
| `participate_in_deal(...)` | SQL 함수 (트랜잭션) | participation INSERT + deals.current_qty 증가 원자 처리 |
| `settle_group_buy(deal_id)` | SQL 함수 | 마감 시 status/final_price/escrow_status 일괄 갱신 |
| `signup_b2buy_user(...)` | SQL RPC | auth.users + public.users 1회 트랜잭션 가입 |
| `handle_new_auth_user()` | SQL 트리거 | Supabase Auth 가입 시 public.users 백업 row |
| `calcTierPrice`, `calcAchievement`, `calcDDay` | `lib/supabase.ts` | 프론트/서버 공통 계산 |

## 🔐 인증 / RLS

- `public.users.id` ↔ `auth.users.id` 1:1 FK (마이그레이션 02)
- RLS 정책:
  - `users` / `group_buy_participations` → `auth.uid() = id/user_id` 본인만
  - `group_buy_deals` / `hs_codes` → anon 포함 모두 조회 가능
  - Storage `deal-images` → public read, `service_role` 만 쓰기
  - Storage `user-uploads` → `{auth.uid()}/...` 본인 폴더만
- Service Role은 `getAdminSupabase()` (서버 전용) — 클라이언트 번들 노출 금지

자세한 RLS/정책 요약은 `SUPABASE_SETUP.md` 참고.

## ⏱ 마감 스케줄러

`vercel.json`에서 `/api/deals/settle` 를 시간 단위로 cron 실행합니다.  
`CRON_SECRET` 환경변수가 설정돼 있으면 Vercel Cron Bearer 토큰으로 인증합니다.

```bash
# 시크릿 키 생성
npm run secret:gen
# → 64자리 hex 출력 → .env.local / Vercel env에 등록
```

## 🔐 환경변수

| 키 | 용도 |
|----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저/서버 공용 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저용 anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용(RPC, 정산). 클라이언트 노출 X |
| `CRON_SECRET` | (선택) /api/deals/settle Bearer 토큰 |
| `HANA_ESCROW_ENDPOINT` / `HANA_ESCROW_API_KEY` | (선택) 하나은행 에스크로 API |
| `NEXT_PUBLIC_SITE_URL` | (선택) 이메일 인증/리다이렉트 base |

## 📌 데모

- `.env.local` 없이도 `lib/demoData.ts` 의 샘플로 모든 UI 동작
- `/deals` 페이지에 "DEMO 데이터" 뱃지가 떠 있으면 Supabase 미연결 상태

## 🛣 다음 단계 (로드맵)

- [x] ~~Supabase Auth 연동 (login/page.tsx → users 테이블 매핑)~~
- [ ] 하나은행 가상계좌 발급 어댑터 (OpenAPI)
- [ ] WebSocket/Realtime 구독으로 카드 폴링 제거
- [ ] 어드민 페이지 (Deal 등록/관리)
- [ ] 마이페이지 - 입금대기→예치완료 자동 전환 알림
- [ ] Storage 업로드 UI (사업자등록증, 통장사본)
- [ ] 다국어 (en/ja) — 중국 수출용

## 📚 참고 문서

- `SUPABASE_SETUP.md` — 로컬/원격/수동 3가지 셋업 절차
- `reference/` — 기획 정의서, ERD, 화면설계 PPT
