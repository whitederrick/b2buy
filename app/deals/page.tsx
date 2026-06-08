import DealCard from "@/components/DealCard";
import { DEMO_DEALS } from "@/lib/demoData";
import { getServerSupabase, calcTierPrice, calcAchievement, calcDDay, type DealRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DealsPage() {
  let deals = DEMO_DEALS;
  let usingDemo = true;

  // 1) Supabase 연결 시도 → 실패하면 데모 데이터로 폴백
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("group_buy_deals")
      .select("*")
      .order("end_date", { ascending: true })
      .returns<DealRow[]>();

    if (!error && data && data.length > 0) {
      deals = data as any;
      usingDemo = false;
    }
  } catch {
    // env 미설정/네트워크 오류 등은 데모 데이터로 진행
  }

  // KPI 요약 계산 (데모/실데이터 공통)
  const totalTarget = deals.reduce((s, d) => s + d.moq_target, 0);
  const totalCurrent = deals.reduce((s, d) => s + d.current_qty, 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const totalSavings = deals.reduce((s, d) => {
    const cur = calcTierPrice(d.price_tiers, d.current_qty);
    return s + (d.base_price - cur) * d.current_qty;
  }, 0);

  return (
    <div className="space-y-8">
      {/* 히어로 / KPI */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-b2buy-primary to-orange-400 p-6 text-white shadow-lg sm:p-10">
        <p className="text-xs font-bold opacity-90">B2BUY · 카테고리 C · 뷰티 공용기</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-4xl">
          모이면 모일수록 <br className="sm:hidden" />
          <u>단가가 계속 내려가는</u> <br className="sm:hidden" />
          1688 공장 직소싱 공동구매
        </h1>
        <p className="mt-2 text-sm opacity-90 sm:text-base">
          1만 개 미만 250원 → 3만 개 달성 시 200원 → 5만 개 이상 180원.
          <br className="hidden sm:block" />
          도매가는 그대로, <b>B2BUY</b>에서만 모이는 펀딩 단가.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
          <Kpi label="누적 누적 모금" value={`${totalCurrent.toLocaleString("ko-KR")}개`} />
          <Kpi label="전체 목표" value={`${totalTarget.toLocaleString("ko-KR")}개`} />
          <Kpi label="전체 평균 달성률" value={`${overallPct.toFixed(1)}%`} />
          <Kpi
            label="지금까지 소상공인이 아낀 돈"
            value={`${(totalSavings / 10000).toFixed(0)}만원`}
            accent
          />
        </div>
      </section>

      {/* 섹션 헤더 */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold text-b2buy-ink sm:text-2xl">모집중인 공동구매</h2>
        {usingDemo && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            DEMO 데이터 (.env.local / Supabase 연결 시 자동 교체)
          </span>
        )}
      </div>

      {/* 카드 그리드 */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d) => (
          <DealCard
            key={d.id}
            deal={{
              id: d.id,
              title: d.title,
              product_name: d.product_name,
              image_url: d.image_url,
              moq_target: d.moq_target,
              current_qty: d.current_qty,
              end_date: d.end_date,
              status: d.status,
              price_tiers: d.price_tiers,
              base_price: d.base_price,
              product_url: d.product_url,
              min_buy_qty: d.min_buy_qty,
              max_buy_qty: d.max_buy_qty,
              escrow_fee_rate: d.escrow_fee_rate,
              platform_fee: d.platform_fee
            }}
            // SSR 단계에서 폴링 시작 시점이 깜빡임 방지: 7초 간격 유지
            pollingMs={7000}
            currentUser={{
              id: "00000000-0000-0000-0000-000000000001",
              name: "테스트 소상공인"
            }}
          />
        ))}
      </section>

      {/* 가격 변동 시뮬레이션 예시 (학습용) */}
      <section className="rounded-2xl border border-b2buy-line bg-white p-5 sm:p-7">
        <h3 className="text-base font-extrabold text-b2buy-ink sm:text-lg">
          💡 가격 구간 시뮬레이션 (1번 딜 기준)
        </h3>
        <p className="mt-1 text-xs text-b2buy-muted">
          누적 수량에 따라 현재 단가가 자동으로 떨어지는 구조를 확인해 보세요.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-b2buy-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-b2buy-bg text-b2buy-muted">
                <th className="px-3 py-2 text-left">누적 수량</th>
                <th className="px-3 py-2 text-right">현재 단가</th>
                <th className="px-3 py-2 text-right">5,000개 결제 시</th>
                <th className="px-3 py-2 text-right">국내 도매가 대비</th>
              </tr>
            </thead>
            <tbody>
              {[
                { qty: 3_000 },
                { qty: 8_000 },
                { qty: 15_000 },
                { qty: 25_000 },
                { qty: 35_000 }
              ].map((row) => {
                const tiers = deals[0]?.price_tiers ?? [];
                const base = deals[0]?.base_price ?? 0;
                const price = calcTierPrice(tiers, row.qty);
                const total = price * 5_000;
                const baseTotal = base * 5_000;
                const saved = baseTotal - total;
                const savedPct = baseTotal > 0 ? (saved / baseTotal) * 100 : 0;
                return (
                  <tr key={row.qty} className="border-t border-b2buy-line">
                    <td className="px-3 py-2">{row.qty.toLocaleString("ko-KR")}개</td>
                    <td className="px-3 py-2 text-right font-bold text-b2buy-primary">
                      {price.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right">
                      {total.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right text-b2buy-accent">
                      {saved.toLocaleString("ko-KR")}원 ↓ ({(savedPct).toFixed(1)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white/15 p-3 backdrop-blur sm:p-4 ${accent ? "ring-2 ring-white" : ""}`}>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className={`mt-1 text-lg font-extrabold sm:text-2xl ${accent ? "text-yellow-100" : ""}`}>
        {value}
      </p>
    </div>
  );
}
