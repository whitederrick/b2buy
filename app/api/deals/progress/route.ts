/**
 * app/api/deals/progress/route.ts
 * ------------------------------------------------------------------
 * 특정 딜의 "실시간 진척도" 가공 데이터만 빠르게 반환
 *  - 5초~10초 폴링으로 DealCard에서 사용
 * ------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabase,
  calcTierPrice,
  calcAchievement,
  calcDDay,
  type DealRow
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("group_buy_deals")
    .select("*")
    .eq("id", id)
    .single<DealRow>();

  if (error || !data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const currentUnitPrice = calcTierPrice(data.price_tiers, data.current_qty);
  const achievementPct  = calcAchievement(data.current_qty, data.moq_target);
  const dDay            = calcDDay(data.end_date);

  // 다음 구간까지 남은 수량
  const sortedTiers = [...data.price_tiers].sort((a, b) => a.min_qty - b.min_qty);
  const nextTier = sortedTiers.find((t) => t.min_qty > data.current_qty) ?? null;
  const remainingToNext = nextTier ? nextTier.min_qty - data.current_qty : 0;

  return NextResponse.json({
    ok: true,
    data: {
      deal_id:            data.id,
      title:              data.title,
      product_name:       data.product_name,
      image_url:          data.image_url,
      moq_target:         data.moq_target,
      current_qty:        data.current_qty,
      achievementPct,
      currentUnitPrice,
      dDay,
      status:             data.status,
      price_tiers:        data.price_tiers,
      base_price:         data.base_price,
      nextTier,
      remainingToNext
    }
  });
}
