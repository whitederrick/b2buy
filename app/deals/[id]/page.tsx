import { notFound } from "next/navigation";
import DealCard from "@/components/DealCard";
import {
  getServerSupabase,
  calcTierPrice,
  calcAchievement,
  calcDDay,
  type DealRow
} from "@/lib/supabase";
import { DEMO_DEALS } from "@/lib/demoData";
import { getCurrentUserOrNull } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DealDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUserOrNull();
  let deal: DealRow | (typeof DEMO_DEALS)[number] | null = null;

  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("group_buy_deals")
      .select("*")
      .eq("id", id)
      .single<DealRow>();
    if (!error && data) deal = data;
  } catch {
    // Supabase 설정이 없거나 일시 오류가 있으면 데모 데이터로 폴백합니다.
  }

  if (!deal) {
    deal = DEMO_DEALS.find((d) => d.id === id) ?? null;
  }
  if (!deal) return notFound();

  const tiers = deal.price_tiers;
  const currentUnitPrice = calcTierPrice(tiers, deal.current_qty);
  const achievementPct = calcAchievement(deal.current_qty, deal.moq_target);
  const dDay = calcDDay(deal.end_date);
  const hsCode = "hs_code" in deal ? deal.hs_code : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-b2buy-muted">상품 {deal.product_name}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-b2buy-ink sm:text-3xl">{deal.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-b2buy-primary px-2.5 py-1 font-bold text-white">
            {dDay > 0 ? `D-${dDay}` : "D-DAY"}
          </span>
          <span className="rounded-full bg-b2buy-bg px-2.5 py-1 font-bold text-b2buy-ink">
            달성률 {achievementPct.toFixed(1)}%
          </span>
          <span className="rounded-full bg-b2buy-bg px-2.5 py-1 font-bold text-b2buy-ink">
            현재 {currentUnitPrice.toLocaleString("ko-KR")}원/개
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DealCard
          deal={{
            id: deal.id,
            title: deal.title,
            product_name: deal.product_name,
            image_url: deal.image_url,
            moq_target: deal.moq_target,
            current_qty: deal.current_qty,
            end_date: deal.end_date,
            status: deal.status,
            price_tiers: tiers,
            base_price: deal.base_price,
            product_url: deal.product_url,
            min_buy_qty: deal.min_buy_qty ?? 1,
            max_buy_qty: deal.max_buy_qty ?? null,
            escrow_fee_rate: deal.escrow_fee_rate ?? 1.5,
            platform_fee: deal.platform_fee ?? 5.0
          }}
          currentUser={
            currentUser
              ? { id: currentUser.id, name: currentUser.manager_name }
              : null
          }
        />

        <section className="rounded-2xl border border-b2buy-line bg-white p-5">
          <h2 className="text-base font-extrabold text-b2buy-ink">상세 정보</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Spec k="HS 코드" v={hsCode ?? "-"} />
            <Spec k="MoQ 목표" v={`${deal.moq_target.toLocaleString("ko-KR")}개`} />
            <Spec k="현재 누적" v={`${deal.current_qty.toLocaleString("ko-KR")}개`} />
            <Spec k="국내 도매 기준가" v={`${deal.base_price.toLocaleString("ko-KR")}원`} />
            <Spec k="모집 시작" v={new Date(deal.start_date).toLocaleDateString("ko-KR")} />
            <Spec k="모집 마감" v={new Date(deal.end_date).toLocaleDateString("ko-KR")} />
          </dl>

          {deal.product_url && (
            <a
              href={deal.product_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs font-bold text-b2buy-primary hover:underline"
            >
              1688 원천 페이지 보기
            </a>
          )}
        </section>
      </div>
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] text-b2buy-muted">{k}</dt>
      <dd className="font-bold text-b2buy-ink">{v}</dd>
    </div>
  );
}
