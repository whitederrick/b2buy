import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserOrNull } from "@/lib/auth";
import {
  calcAchievement,
  calcDDay,
  calcTierPrice,
  getAdminSupabase,
  type DealRow,
  type ShippingType
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ParticipateBody {
  deal_id: string;
  requested_qty: number;
  shipping_addr: string;
  shipping_type: ShippingType;
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUserOrNull();
  if (!currentUser) {
    return NextResponse.json(
      { ok: false, error: "로그인 후 공동구매에 참여해 주세요." },
      { status: 401 }
    );
  }

  let body: ParticipateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const validation = validate(body);
  if (validation) {
    return NextResponse.json({ ok: false, error: validation }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data: deal, error: dealError } = await admin
    .from("group_buy_deals")
    .select("*")
    .eq("id", body.deal_id)
    .single<DealRow>();

  if (dealError || !deal) {
    return NextResponse.json({ ok: false, error: "공동구매 딜을 찾을 수 없습니다." }, { status: 404 });
  }

  if (deal.status !== "모집중") {
    return NextResponse.json(
      { ok: false, error: `현재 딜은 참여가 마감되었습니다. (상태: ${deal.status})` },
      { status: 409 }
    );
  }
  if (new Date(deal.end_date).getTime() <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "공동구매 모집 기간이 종료되었습니다." },
      { status: 409 }
    );
  }
  if (body.requested_qty < deal.min_buy_qty) {
    return NextResponse.json(
      { ok: false, error: `최소 구매 수량은 ${deal.min_buy_qty}개입니다.` },
      { status: 400 }
    );
  }
  if (deal.max_buy_qty && body.requested_qty > deal.max_buy_qty) {
    return NextResponse.json(
      { ok: false, error: `1회 최대 구매 수량은 ${deal.max_buy_qty}개입니다.` },
      { status: 400 }
    );
  }

  const unitPrice = calcTierPrice(deal.price_tiers, deal.current_qty + body.requested_qty);
  const { data: rpcResult, error: rpcError } = await admin.rpc("participate_in_deal", {
    p_deal_id: body.deal_id,
    p_user_id: currentUser.id,
    p_qty: body.requested_qty,
    p_unit_price: unitPrice,
    p_shipping_addr: body.shipping_addr,
    p_shipping_type: body.shipping_type
  });

  if (rpcError) {
    const duplicate = /duplicate|unique/i.test(rpcError.message);
    return NextResponse.json(
      {
        ok: false,
        error: duplicate
          ? "이미 이 공동구매에 참여했습니다."
          : `참여 처리에 실패했습니다: ${rpcError.message}`
      },
      { status: duplicate ? 409 : 500 }
    );
  }

  const result = rpcResult?.[0] ?? rpcResult;
  const newCurrentQty = Number(
    result?.new_current_qty ?? deal.current_qty + body.requested_qty
  );

  return NextResponse.json({
    ok: true,
    data: {
      participation_id: result?.participation_id,
      unitPrice: Number(result?.unit_price ?? unitPrice),
      newCurrentQty,
      achievementPct: calcAchievement(newCurrentQty, deal.moq_target),
      dDay: calcDDay(deal.end_date),
      hint: buildHint(deal.price_tiers, newCurrentQty, unitPrice)
    }
  });
}

function validate(body: Partial<ParticipateBody>): string | null {
  if (!body.deal_id) return "deal_id is required";
  if (!body.requested_qty || body.requested_qty <= 0) return "requested_qty must be > 0";
  if (!body.shipping_addr?.trim()) return "shipping_addr is required";
  if (!body.shipping_type) return "shipping_type is required";
  return null;
}

function buildHint(
  tiers: DealRow["price_tiers"],
  qty: number,
  currentPrice: number
): string | null {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const next = sorted.find((tier) => tier.min_qty > qty);
  if (!next) return "현재 최저 단가 구간입니다.";

  return `${(next.min_qty - qty).toLocaleString("ko-KR")}개 더 모이면 개당 ${next.price.toLocaleString("ko-KR")}원입니다. 현재 ${currentPrice.toLocaleString("ko-KR")}원`;
}
