/**
 * app/api/deals/settle/route.ts
 * ------------------------------------------------------------------
 * 마감 스케줄러 트리거 (Task 2 - 3.2)
 *
 * 호출 방법:
 *   - Vercel Cron Jobs (vercel.json) → 매일 1회
 *   - GitHub Actions cron
 *   - Supabase Edge Function + schedule trigger
 *   - 또는 수동: POST { "deal_id": "uuid" } 또는 { "all": true }
 *
 *  - all=true 이면 status='모집중' 이고 end_date <= now() 인 딜을 일괄 정산
 *  - deal_id 지정 시 해당 딜만 정산
 * ------------------------------------------------------------------
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, type DealRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 토큰 검증 (Vercel Cron은 Authorization: Bearer ${CRON_SECRET} 헤더 전송)
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await safeJson(req);
  const admin = getAdminSupabase();

  let targetIds: string[] = [];

  if (body?.deal_id) {
    targetIds = [body.deal_id];
  } else if (body?.all === true) {
    const { data, error } = await admin
      .from("group_buy_deals")
      .select("id")
      .eq("status", "모집중")
      .lte("end_date", new Date().toISOString())
      .returns<Pick<DealRow, "id">[]>();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    targetIds = (data ?? []).map((d) => d.id);
  } else {
    return NextResponse.json(
      { ok: false, error: "deal_id 또는 { all: true } 가 필요합니다." },
      { status: 400 }
    );
  }

  const results: Array<{
    deal_id: string;
    final_status: string;
    final_price: number | null;
    updated_rows: number;
  }> = [];

  for (const id of targetIds) {
    const { data, error } = await admin.rpc("settle_group_buy", { p_deal_id: id });
    if (error) {
      results.push({ deal_id: id, final_status: "ERROR", final_price: null, updated_rows: 0 });
      continue;
    }
    const r = Array.isArray(data) ? data[0] : data;
    results.push({
      deal_id:      r?.deal_id      ?? id,
      final_status: r?.final_status ?? "UNKNOWN",
      final_price:  r?.final_price  ?? null,
      updated_rows: r?.updated_rows ?? 0
    });

    // 공구성공이면 (프로덕션) 여기서 하나은행 에스크로 시스템에 발주 트리거
    if (r?.final_status === "공구성공") {
      await triggerHanaEscrowOrder(id, r.final_price);
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}

async function safeJson(req: NextRequest): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

/** (데모) 하나은행 에스크로 발주 트리거 훅 — 실 연동은 별도 API 라우터로 분리 */
async function triggerHanaEscrowOrder(dealId: string, finalPrice: number | null) {
  // TODO: 하나은행 오픈API / 내부 에스크로 게이트웨이로 POST
  // 예: await fetch(process.env.HANA_ESCROW_ENDPOINT!, { method:'POST', body: JSON.stringify({ dealId, finalPrice }) })
  console.log(`[escrow] trigger hana order: deal=${dealId}, finalPrice=${finalPrice}`);
}

// Vercel Cron 도움말: vercel.json 예시
// { "crons": [{ "path": "/api/deals/settle", "schedule": "0 * * * *" }] }
