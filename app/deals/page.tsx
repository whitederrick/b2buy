import DealCard from "@/components/DealCard";
import { DEMO_DEALS } from "@/lib/demoData";
import { getServerSupabase, calcTierPrice, type DealRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DealsPage() {
  let deals = DEMO_DEALS;
  let usingDemo = true;

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
    // Supabase 연결이 아직 준비되지 않은 경우 데모 데이터로 화면을 유지합니다.
  }

  const totalTarget = deals.reduce((sum, deal) => sum + deal.moq_target, 0);
  const totalCurrent = deals.reduce((sum, deal) => sum + deal.current_qty, 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const totalSavings = deals.reduce((sum, deal) => {
    const currentPrice = calcTierPrice(deal.price_tiers, deal.current_qty);
    return sum + (deal.base_price - currentPrice) * deal.current_qty;
  }, 0);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-b2buy-primary to-orange-400 p-6 text-white shadow-lg sm:p-10">
        <p className="text-xs font-bold opacity-90">B2BUY · 카테고리 C · 뷰티 공용기</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-4xl">
          모이면 모일수록 <br className="sm:hidden" />
          <u>단가가 내려가는</u> 1688 공장 직소싱 공동구매
        </h1>
        <p className="mt-2 text-sm opacity-90 sm:text-base">
          목표 수량에 가까워질수록 구간 단가가 낮아집니다. 현재 모집량과
          예상 절감액을 확인하고 필요한 수량만큼 참여하세요.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
          <Kpi label="현재 누적 수량" value={`${totalCurrent.toLocaleString("ko-KR")}개`} />
          <Kpi label="전체 목표 수량" value={`${totalTarget.toLocaleString("ko-KR")}개`} />
          <Kpi label="전체 평균 달성률" value={`${overallPct.toFixed(1)}%`} />
          <Kpi
            label="누적 절감 추정액"
            value={`${(totalSavings / 10000).toFixed(0)}만원`}
            accent
          />
        </div>
      </section>

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold text-b2buy-ink sm:text-2xl">
          모집중인 공동구매
        </h2>
        {usingDemo && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            데모 데이터
          </span>
        )}
      </div>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={{
              id: deal.id,
              title: deal.title,
              product_name: deal.product_name,
              image_url: deal.image_url,
              moq_target: deal.moq_target,
              current_qty: deal.current_qty,
              end_date: deal.end_date,
              status: deal.status,
              price_tiers: deal.price_tiers,
              base_price: deal.base_price,
              product_url: deal.product_url,
              min_buy_qty: deal.min_buy_qty,
              max_buy_qty: deal.max_buy_qty,
              escrow_fee_rate: deal.escrow_fee_rate,
              platform_fee: deal.platform_fee
            }}
            pollingMs={7000}
            currentUser={{
              id: "00000000-0000-0000-0000-000000000001",
              name: "테스트 소상공인"
            }}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-5 sm:p-7">
        <h3 className="text-base font-extrabold text-b2buy-ink sm:text-lg">
          가격 구간 시뮬레이션
        </h3>
        <p className="mt-1 text-xs text-b2buy-muted">
          누적 수량이 늘어날수록 현재 단가와 5,000개 기준 예상 결제액이 어떻게
          달라지는지 확인하세요.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-b2buy-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-b2buy-bg text-b2buy-muted">
                <th className="px-3 py-2 text-left">누적 수량</th>
                <th className="px-3 py-2 text-right">현재 단가</th>
                <th className="px-3 py-2 text-right">5,000개 결제액</th>
                <th className="px-3 py-2 text-right">국내 도매가 대비</th>
              </tr>
            </thead>
            <tbody>
              {[3_000, 8_000, 15_000, 25_000, 35_000].map((qty) => {
                const tiers = deals[0]?.price_tiers ?? [];
                const base = deals[0]?.base_price ?? 0;
                const price = calcTierPrice(tiers, qty);
                const total = price * 5_000;
                const baseTotal = base * 5_000;
                const saved = baseTotal - total;
                const savedPct = baseTotal > 0 ? (saved / baseTotal) * 100 : 0;

                return (
                  <tr key={qty} className="border-t border-b2buy-line">
                    <td className="px-3 py-2">{qty.toLocaleString("ko-KR")}개</td>
                    <td className="px-3 py-2 text-right font-bold text-b2buy-primary">
                      {price.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right">
                      {total.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right text-b2buy-accent">
                      {saved.toLocaleString("ko-KR")}원 절감 ({savedPct.toFixed(1)}%)
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
