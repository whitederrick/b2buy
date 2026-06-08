import Link from "next/link";
import DealCard from "@/components/DealCard";
import { DEMO_DEALS, type DemoDeal } from "@/lib/demoData";
import { getCurrentUserOrNull } from "@/lib/auth";
import { filterDealsForProfile, profileAudienceLabel } from "@/lib/dealAudience";
import { calcTierPrice, getServerSupabase, type DealRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DisplayDeal = DealRow | DemoDeal;

export default async function DealsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const currentUser = await getCurrentUserOrNull();
  let allDeals: DisplayDeal[] = DEMO_DEALS;
  let usingDemo = true;

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("group_buy_deals")
      .select("*")
      .order("end_date", { ascending: true })
      .returns<DealRow[]>();

    if (!error && data && data.length > 0) {
      allDeals = data;
      usingDemo = false;
    }
  } catch {
    // 연결 오류 시 데모 데이터로 화면 구조를 유지합니다.
  }

  const audienceDeals = filterDealsForProfile(allDeals, currentUser);
  const deals = status
    ? audienceDeals.filter((deal) => deal.status === status)
    : audienceDeals;
  const audienceLabel = profileAudienceLabel(currentUser);

  const totalTarget = deals.reduce((sum, deal) => sum + deal.moq_target, 0);
  const totalCurrent = deals.reduce((sum, deal) => sum + deal.current_qty, 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const totalSavings = deals.reduce((sum, deal) => {
    const currentPrice = calcTierPrice(deal.price_tiers, deal.current_qty);
    return sum + Math.max(0, deal.base_price - currentPrice) * deal.current_qty;
  }, 0);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-b2buy-primary to-orange-400 p-6 text-white shadow-lg sm:p-10">
        <p className="text-xs font-bold opacity-90">
          {audienceLabel ? `${audienceLabel} 맞춤 제안` : "사업자 전용 공동구매"}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-4xl">
          우리 사업과 관련된 모집만
          <br className="sm:hidden" /> <u>선별해서 보여드립니다.</u>
        </h1>
        <p className="mt-2 max-w-2xl text-sm opacity-90 sm:text-base">
          회원의 업태와 업종, 상품 카테고리를 기준으로 관련 공동구매를 연결합니다. 필요한
          수량만 참여하고 모집량에 따라 달라지는 조건을 확인하세요.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
          <Kpi label="현재 누적 수량" value={`${totalCurrent.toLocaleString("ko-KR")}개`} />
          <Kpi label="전체 목표 수량" value={`${totalTarget.toLocaleString("ko-KR")}개`} />
          <Kpi label="평균 달성률" value={`${overallPct.toFixed(1)}%`} />
          <Kpi
            label="누적 절감 추정액"
            value={`${Math.round(totalSavings / 10_000).toLocaleString("ko-KR")}만원`}
            accent
          />
        </div>
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-b2buy-ink sm:text-2xl">
            {status ?? "맞춤 공동구매"}
          </h2>
          {currentUser && !audienceLabel && (
            <p className="mt-1 text-xs text-b2buy-muted">
              회원정보에 업태·업종을 등록하면 관련 모집만 선별됩니다.
            </p>
          )}
        </div>
        {usingDemo && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            데모 데이터
          </span>
        )}
      </div>

      {deals.length > 0 ? (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={{
                id: deal.id,
                title: deal.title,
                product_name: deal.product_name,
                category: deal.category,
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
              currentUser={
                currentUser
                  ? { id: currentUser.id, name: currentUser.manager_name }
                  : null
              }
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-b2buy-line bg-white px-6 py-14 text-center">
          <h3 className="text-lg font-extrabold text-b2buy-ink">현재 맞는 공동구매가 없습니다.</h3>
          <p className="mt-2 text-sm text-b2buy-muted">
            등록된 업태·업종에 맞는 모집이 열리면 이 화면에 표시됩니다.
          </p>
          {!currentUser && (
            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-b2buy-primary px-5 py-3 text-sm font-bold text-white"
            >
              회원가입하고 맞춤 제안 받기
            </Link>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-b2buy-line bg-white p-5 sm:p-7">
        <h3 className="text-base font-extrabold text-b2buy-ink sm:text-lg">조건 변화 예시</h3>
        <p className="mt-1 text-xs text-b2buy-muted">
          공동 수요가 모이면 구간별 단가가 어떻게 달라지는지 확인할 수 있습니다.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-b2buy-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-b2buy-bg text-b2buy-muted">
                <th className="px-3 py-2 text-left">누적 수량</th>
                <th className="px-3 py-2 text-right">적용 단가</th>
                <th className="px-3 py-2 text-right">5,000개 구매액</th>
                <th className="px-3 py-2 text-right">기준가 대비</th>
              </tr>
            </thead>
            <tbody>
              {[3_000, 8_000, 15_000, 25_000, 35_000].map((qty) => {
                const tiers = deals[0]?.price_tiers ?? [];
                const base = deals[0]?.base_price ?? 0;
                const price = calcTierPrice(tiers, qty);
                const total = price * 5_000;
                const baseTotal = base * 5_000;
                const saved = Math.max(0, baseTotal - total);
                const savedPct = baseTotal > 0 ? (saved / baseTotal) * 100 : 0;

                return (
                  <tr key={qty} className="border-t border-b2buy-line">
                    <td className="px-3 py-2">{qty.toLocaleString("ko-KR")}개</td>
                    <td className="px-3 py-2 text-right font-bold text-b2buy-primary">
                      {price.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 text-right">{total.toLocaleString("ko-KR")}원</td>
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
    <div
      className={`rounded-2xl bg-white/15 p-3 backdrop-blur sm:p-4 ${
        accent ? "ring-2 ring-white" : ""
      }`}
    >
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className={`mt-1 text-lg font-extrabold sm:text-2xl ${accent ? "text-yellow-100" : ""}`}>
        {value}
      </p>
    </div>
  );
}
