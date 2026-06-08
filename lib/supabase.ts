/**
 * lib/supabase.ts
 * ------------------------------------------------------------------
 * B2BUY Supabase 클라이언트 통합 모듈
 *  - 브라우저(클라이언트 컴포넌트) / 서버(Route Handler, RSC) / Admin
 *    3가지 클라이언트를 환경별로 export.
 *
 * 사용 규칙:
 *  - 페이지/컴포넌트:        getBrowserSupabase() 또는 getServerSupabase()
 *  - Route Handler(API):     getServerSupabase()  (RSC 쿠키 공유)
 *  - Service Role(RPC 등):   getAdminSupabase()   -- 서버 전용, 절대 클라 노출 X
 * ------------------------------------------------------------------
 */
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type PriceTier = {
  min_qty: number;        // inclusive
  max_qty: number | null; // exclusive; null = 무한대
  price: number;          // 원/개
};

export type DealStatus =
  | "모집중" | "공구성공" | "공구실패" | "배송중" | "완료";

export type EscrowStatus =
  | "입금대기" | "예치완료" | "정산완료" | "환불완료";

export type ShippingType = "사무실" | "창고" | "공장" | "기타";

export interface DealRow {
  id: string;
  title: string;
  hs_code: string | null;
  product_name: string;
  product_url: string | null;
  image_url: string | null;
  category: string;
  moq_target: number;
  current_qty: number;
  min_buy_qty: number;
  max_buy_qty: number | null;
  start_date: string;
  end_date: string;
  status: DealStatus;
  price_tiers: PriceTier[];
  base_price: number;
  escrow_fee_rate: number;
  platform_fee: number;
  shipping_cost: number;
  created_at: string;
  updated_at: string;
}

export interface ParticipationRow {
  id: string;
  user_id: string;
  deal_id: string;
  requested_qty: number;
  initial_price: number;
  final_price: number | null;
  escrow_status: EscrowStatus;
  shipping_addr: string;
  shipping_type: ShippingType;
  escrow_vacct: string | null;
  participated_at: string;
  settled_at: string | null;
}

// -----------------------------------------------------------------------------
// 1) Browser Client
// -----------------------------------------------------------------------------
export function getBrowserSupabase(): SupabaseClient {
  return createBrowserClient(
    must("NEXT_PUBLIC_SUPABASE_URL"),
    must("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

// -----------------------------------------------------------------------------
// 2) Server Client (RSC / Route Handler / Server Action)
//   - Next.js 14: cookies()는 동기 (RSC) / Route Handler 양쪽 사용 가능
//   - 15+에서는 async 가능. 두 케이스 모두 안전하게 처리.
// -----------------------------------------------------------------------------
export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    must("NEXT_PUBLIC_SUPABASE_URL"),
    must("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // RSC 컨텍스트에서 set이 실패하는 경우가 있음(읽기 전용).
            // Route Handler에서는 정상 동작.
          }
        }
      }
    }
  );
}

// -----------------------------------------------------------------------------
// 3) Admin Client (Service Role)
//   - RLS 우회, 서버 전용. 클라이언트 번들에 절대 import 하지 말 것.
// -----------------------------------------------------------------------------
let _admin: SupabaseClient | null = null;
export function getAdminSupabase(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(
    must("NEXT_PUBLIC_SUPABASE_URL"),
    must("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
  return _admin;
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
function must(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `[supabase] 환경변수 ${name} 가 설정되지 않았습니다. .env.local 을 확인하세요.`
    );
  }
  return v;
}

/**
 * price_tiers + 누적 수량(qty) → 현재 구간 단가
 *  - tiers: 작은 min_qty부터 정렬되어 있다고 가정
 *  - max_qty === null 이면 그 이상 전체 적용
 */
export function calcTierPrice(
  tiers: PriceTier[],
  qty: number
): number {
  if (!tiers?.length) return 0;
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  for (const t of sorted) {
    const inLower = qty >= t.min_qty;
    const inUpper = t.max_qty === null || qty < t.max_qty;
    if (inLower && inUpper) return t.price;
  }
  return sorted[sorted.length - 1].price;
}

/** moq_target 대비 달성률(%) */
export function calcAchievement(
  currentQty: number,
  moqTarget: number
): number {
  if (moqTarget <= 0) return 0;
  return Math.min(100, Math.round((currentQty / moqTarget) * 10000) / 100);
}

/** D-Day 계산 (end_date가 미래면 양수, 지났으면 0) */
export function calcDDay(endDate: string | Date): number {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}
