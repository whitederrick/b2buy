/**
 * app/api/deals/participate/route.ts
 * ------------------------------------------------------------------
 * 소상공인이 특정 딜에 수량을 입력해 "참여"할 때 호출되는 API.
 *
 * 처리 흐름(데이터 일관성 보장: Supabase RPC + Postgres Function 트랜잭션):
 *   1) 입력값 검증  (deal_id, user_id, requested_qty, shipping_*)
 *   2) deals row 잠금 + 누적 수량 재계산
 *   3) price_tiers → 현재 구간 단가 산출
 *   4) participations INSERT (initial_price = 현재 구간 단가)
 *   5) deals.current_qty = 기존 + requested_qty 로 갱신
 *   6) 응답: { currentQty, achievementPct, currentUnitPrice, dDay, ... }
 * ------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getServerSupabase,
  getAdminSupabase,
  calcTierPrice,
  calcAchievement,
  calcDDay,
  type DealRow,
  type ShippingType
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ParticipateBody {
  deal_id:        string;
  user_id:        string;
  requested_qty:  number;
  shipping_addr:  string;
  shipping_type:  ShippingType;
}

export async function POST(req: NextRequest) {
  let body: ParticipateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // 1) 입력값 검증
  const validation = validate(body);
  if (validation) return NextResponse.json({ ok: false, error: validation }, { status: 400 });

  // Service Role 사용 → RLS 무시, 원자적 트랜잭션 보장
  const admin = getAdminSupabase();

  // 2) Deal 행 잠금
  const { data: deal, error: dealErr } = await admin
    .from("group_buy_deals")
    .select("*")
    .eq("id", body.deal_id)
    .single<DealRow>();

  if (dealErr || !deal) {
    return NextResponse.json({ ok: false, error: "deal not found" }, { status: 404 });
  }

  // 마감/완료 딜에는 참여 불가
  if (deal.status !== "모집중") {
    return NextResponse.json(
      { ok: false, error: `현재 딜은 참여가 마감되었습니다 (status=${deal.status})` },
      { status: 409 }
    );
  }
  if (new Date(deal.end_date).getTime() <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "공동구매가 이미 종료되었습니다." },
      { status: 409 }
    );
  }

  // min/max 검증
  if (body.requested_qty < deal.min_buy_qty) {
    return NextResponse.json(
      { ok: false, error: `최소 구매 수량은 ${deal.min_buy_qty}개 입니다.` },
      { status: 400 }
    );
  }
  if (deal.max_buy_qty && body.requested_qty > deal.max_buy_qty) {
    return NextResponse.json(
      { ok: false, error: `1인 최대 구매 수량은 ${deal.max_buy_qty}개 입니다.` },
      { status: 400 }
    );
  }

  // 3) 현재 구간 단가 산출 (누적되기 전 수량 기준)
  const unitPrice = calcTierPrice(deal.price_tiers, deal.current_qty + body.requested_qty);

  // 4) participation insert + 5) deals current_qty 증가 를 RPC로 원자 처리
  const { data: rpcResult, error: rpcErr } = await admin.rpc("participate_in_deal", {
    p_deal_id:      body.deal_id,
    p_user_id:      body.user_id,
    p_qty:          body.requested_qty,
    p_unit_price:   unitPrice,
    p_shipping_addr: body.shipping_addr,
    p_shipping_type: body.shipping_type
  });

  if (rpcErr) {
    return NextResponse.json(
      { ok: false, error: `참여 처리 실패: ${rpcErr.message}` },
      { status: 500 }
    );
  }

  // 6) 응답 가공
  const r = rpcResult?.[0] ?? rpcResult;
  const newCurrentQty = Number(r?.new_current_qty ?? deal.current_qty + body.requested_qty);
  const achievement   = calcAchievement(newCurrentQty, deal.moq_target);
  const dDay          = calcDDay(deal.end_date);

  return NextResponse.json({
    ok: true,
    data: {
      participation_id: r?.participation_id,
      unitPrice:        Number(r?.unit_price ?? unitPrice),
      newCurrentQty,
      achievementPct:   achievement,
      dDay,
      // 사용자에게 보여줄 "이 구간에서 더 모이면 ~원!" 메시지
      hint:              buildHint(deal.price_tiers, newCurrentQty, unitPrice)
    }
  });
}

function validate(b: Partial<ParticipateBody>): string | null {
  if (!b.deal_id)     return "deal_id is required";
  if (!b.user_id)     return "user_id is required";
  if (!b.requested_qty || b.requested_qty <= 0) return "requested_qty must be > 0";
  if (!b.shipping_addr) return "shipping_addr is required";
  if (!b.shipping_type) return "shipping_type is required";
  return null;
}

function buildHint(
  tiers: DealRow["price_tiers"],
  qty: number,
  currentPrice: number
): string | null {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const next = sorted.find((t) => t.min_qty > qty);
  if (!next) return "최저 단가 구간입니다!";
  return `${(next.min_qty - qty).toLocaleString("ko-KR")}개 더 모이면 개당 ${next.price.toLocaleString("ko-KR")}원 (현재 ${currentPrice.toLocaleString("ko-KR")}원)`;
}
