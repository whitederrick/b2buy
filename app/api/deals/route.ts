/**
 * app/api/deals/route.ts
 * ------------------------------------------------------------------
 * B2BUY 공동구매 딜 API
 *  - GET  /api/deals                  : 딜 목록(필터: status, category)
 *  - GET  /api/deals?id={uuid}        : 단일 딜 + 현재 구간 단가/달성률
 *  - POST /api/deals                  : 딜 생성(Admin, 생략 가능)
 *
 *  - GET  /api/deals/progress?id={uuid}  : 현재 누적 수량/달성률/현재구간 단가
 *
 * 핵심 비즈니스 로직(기획 정의서 3.1):
 *   achievementPct = (current_qty / moq_target) * 100
 *   currentUnitPrice = price_tiers JSON에서 누적수량이 속한 구간의 price
 * ------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, calcTierPrice, calcAchievement, calcDDay, type DealRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
function err(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}
function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** 단일 딜에 대해 클라이언트에 보낼 "확장" 객체로 가공 */
function enrichDeal(d: DealRow) {
  const currentUnitPrice = calcTierPrice(d.price_tiers, d.current_qty);
  const achievementPct  = calcAchievement(d.current_qty, d.moq_target);
  const dDay            = calcDDay(d.end_date);

  return {
    ...d,
    currentUnitPrice,                              // 현재 구간 단가
    achievementPct,                                // 달성률(%)
    dDay,                                          // D-N
    nextTier: nextTierInfo(d.price_tiers, d.current_qty) // 다음 구간 정보
  };
}

/** 다음 단계의 단가/잔여 수량 안내 */
function nextTierInfo(
  tiers: DealRow["price_tiers"],
  currentQty: number
): null | { remainingQty: number; nextPrice: number; savingPerUnit: number } {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const current = calcTierPrice(sorted, currentQty);
  const next = sorted.find((t) => t.min_qty > currentQty);
  if (!next) return null;
  return {
    remainingQty:   next.min_qty - currentQty,
    nextPrice:      next.price,
    savingPerUnit:  current - next.price
  };
}

// -----------------------------------------------------------------------------
// GET /api/deals
//   - ?id=uuid         : 단건 조회(진척도 포함)
//   - 그 외            : 목록 조회
// -----------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status") as DealRow["status"] | null;
  const category = searchParams.get("category");

  const supabase = await getServerSupabase();

  if (id) {
    const { data, error } = await supabase
      .from("group_buy_deals")
      .select("*")
      .eq("id", id)
      .single<DealRow>();

    if (error || !data) return err("deal not found", 404);
    return ok(enrichDeal(data));
  }

  let q = supabase.from("group_buy_deals").select("*").order("end_date", { ascending: true });
  if (status)   q = q.eq("status", status);
  if (category) q = q.eq("category", category);

  const { data, error } = await q.returns<DealRow[]>();
  if (error) return err(error.message, 500);
  return ok((data ?? []).map(enrichDeal));
}
