import Link from "next/link";
import { DEMO_DEALS } from "@/lib/demoData";
import {
  calcAchievement,
  calcDDay,
  calcTierPrice,
  getAdminSupabase,
  type DealRow,
  type ParticipationRow
} from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminDeal = DealRow | (typeof DEMO_DEALS)[number];

type AdminParticipation = ParticipationRow & {
  users?: {
    company_name?: string | null;
    manager_name?: string | null;
    email?: string | null;
  } | null;
  group_buy_deals?: {
    title?: string | null;
  } | null;
};

export default async function AdminPage() {
  const { deals, participations, usingDemo } = await loadAdminData();

  const activeDeals = deals.filter((deal) => deal.status === "모집중");
  const closedDeals = deals.filter((deal) => deal.status !== "모집중");
  const totalTarget = deals.reduce((sum, deal) => sum + deal.moq_target, 0);
  const totalCurrent = deals.reduce((sum, deal) => sum + deal.current_qty, 0);
  const totalEscrow = participations.reduce(
    (sum, part) => sum + part.requested_qty * part.initial_price,
    0
  );
  const pendingPayments = participations.filter((part) => part.escrow_status === "입금대기");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-b2buy-ink p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-200">
              B2BUY Admin
            </p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-4xl">
              운영자가 오늘 확인해야 할 공동구매 현황
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              모집량, 참여 금액, 입금 대기, 마감 예정 딜을 한 화면에서 확인합니다. 아직은
              읽기 중심의 운영 콘솔이며, 딜 생성/수정 액션은 다음 단계에서 붙이면 됩니다.
            </p>
          </div>
          {usingDemo && (
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Supabase 데이터 없음 · 데모 데이터 표시 중
            </span>
          )}
          <Link
            href="/admin/deals/new"
            className="w-fit rounded-xl bg-b2buy-primary px-4 py-2 text-sm font-extrabold text-white hover:bg-b2buy-primaryDark"
          >
            새 딜 등록
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="운영 중 딜" value={`${activeDeals.length}건`} />
        <Kpi label="전체 누적 수량" value={`${totalCurrent.toLocaleString("ko-KR")}개`} />
        <Kpi
          label="목표 대비 달성률"
          value={`${calcAchievement(totalCurrent, totalTarget).toFixed(1)}%`}
        />
        <Kpi label="참여 예치 예정액" value={`${totalEscrow.toLocaleString("ko-KR")}원`} accent />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-b2buy-line bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-b2buy-ink">딜 운영 현황</h2>
              <p className="mt-1 text-xs text-b2buy-muted">
                마감이 가까운 순서로 모집률과 현재 구간 단가를 확인합니다.
              </p>
            </div>
            <Link href="/deals" className="text-xs font-bold text-b2buy-primary hover:underline">
              구매자 화면 보기
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-b2buy-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-b2buy-bg text-b2buy-muted">
                  <th className="px-3 py-2 text-left">딜</th>
                  <th className="px-3 py-2 text-right">모집률</th>
                  <th className="px-3 py-2 text-right">현재 단가</th>
                  <th className="px-3 py-2 text-right">마감</th>
                  <th className="px-3 py-2 text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const pct = calcAchievement(deal.current_qty, deal.moq_target);
                  const unitPrice = calcTierPrice(deal.price_tiers, deal.current_qty);
                  const dDay = calcDDay(deal.end_date);

                  return (
                    <tr key={deal.id} className="border-t border-b2buy-line">
                      <td className="px-3 py-3">
                        <Link
                          href={`/deals/${deal.id}`}
                          className="font-bold text-b2buy-ink hover:text-b2buy-primary"
                        >
                          {deal.title}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-b2buy-muted">
                          {deal.current_qty.toLocaleString("ko-KR")} /{" "}
                          {deal.moq_target.toLocaleString("ko-KR")}개
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{pct.toFixed(1)}%</td>
                      <td className="px-3 py-3 text-right font-bold text-b2buy-primary">
                        {unitPrice.toLocaleString("ko-KR")}원
                      </td>
                      <td className="px-3 py-3 text-right">
                        {dDay > 0 ? `D-${dDay}` : "마감일"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <StatusBadge status={deal.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="운영 알림">
            <AlertRow
              title="입금 대기"
              body={`${pendingPayments.length}건의 참여 건이 입금 확인을 기다립니다.`}
            />
            <AlertRow
              title="마감 완료"
              body={`${closedDeals.length}건의 딜은 정산 또는 환불 상태 확인이 필요합니다.`}
            />
            <AlertRow
              title="자동 정산"
              body="/api/deals/settle 크론이 마감 딜을 일괄 정산합니다."
            />
          </Panel>

          <Panel title="다음 운영 기능">
            <ul className="space-y-2 text-sm text-b2buy-muted">
              <li>딜 등록/수정 폼</li>
              <li>참여자별 입금 상태 변경</li>
              <li>성공 딜 정산/실패 딜 환불 처리</li>
              <li>사업자 회원 승인 관리</li>
            </ul>
          </Panel>
        </aside>
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-5">
        <h2 className="text-lg font-extrabold text-b2buy-ink">최근 참여 내역</h2>
        <p className="mt-1 text-xs text-b2buy-muted">
          구매자가 공동구매에 참여하면 수량, 최초 단가, 에스크로 상태가 여기에 쌓입니다.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-b2buy-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-b2buy-bg text-b2buy-muted">
                <th className="px-3 py-2 text-left">참여자</th>
                <th className="px-3 py-2 text-left">딜</th>
                <th className="px-3 py-2 text-right">수량</th>
                <th className="px-3 py-2 text-right">최초 단가</th>
                <th className="px-3 py-2 text-right">에스크로</th>
              </tr>
            </thead>
            <tbody>
              {participations.length > 0 ? (
                participations.slice(0, 8).map((part) => (
                  <tr key={part.id} className="border-t border-b2buy-line">
                    <td className="px-3 py-3">
                      <p className="font-bold text-b2buy-ink">
                        {part.users?.company_name ?? part.users?.manager_name ?? "참여자"}
                      </p>
                      <p className="text-[11px] text-b2buy-muted">
                        {part.users?.email ?? part.user_id}
                      </p>
                    </td>
                    <td className="px-3 py-3">{part.group_buy_deals?.title ?? part.deal_id}</td>
                    <td className="px-3 py-3 text-right">
                      {part.requested_qty.toLocaleString("ko-KR")}개
                    </td>
                    <td className="px-3 py-3 text-right">
                      {part.initial_price.toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-3 text-right">
                      <StatusBadge status={part.escrow_status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-b2buy-muted">
                    아직 참여 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function loadAdminData(): Promise<{
  deals: AdminDeal[];
  participations: AdminParticipation[];
  usingDemo: boolean;
}> {
  try {
    const supabase = getAdminSupabase();
    const [{ data: dealRows, error: dealError }, { data: partRows, error: partError }] =
      await Promise.all([
        supabase
          .from("group_buy_deals")
          .select("*")
          .order("end_date", { ascending: true })
          .returns<DealRow[]>(),
        supabase
          .from("group_buy_participations")
          .select("*, users(company_name, manager_name, email), group_buy_deals(title)")
          .order("participated_at", { ascending: false })
          .limit(20)
          .returns<AdminParticipation[]>()
      ]);

    if (!dealError && dealRows && dealRows.length > 0) {
      return {
        deals: dealRows,
        participations: partError ? [] : partRows ?? [],
        usingDemo: false
      };
    }
  } catch {
    // 운영 환경 변수가 없거나 DB 연결이 실패하면 데모 데이터로 콘솔 형태를 유지합니다.
  }

  return { deals: DEMO_DEALS, participations: [], usingDemo: true };
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-b2buy-line bg-white p-4 ${
        accent ? "ring-2 ring-b2buy-accent" : ""
      }`}
    >
      <p className="text-xs font-medium text-b2buy-muted">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${accent ? "text-b2buy-accent" : "text-b2buy-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-b2buy-line bg-white p-5">
      <h2 className="text-base font-extrabold text-b2buy-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function AlertRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-b2buy-bg p-3">
      <p className="text-sm font-bold text-b2buy-ink">{title}</p>
      <p className="mt-0.5 text-xs text-b2buy-muted">{body}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "모집중" || status === "예치완료"
      ? "bg-emerald-50 text-emerald-700"
      : status === "입금대기"
        ? "bg-amber-50 text-amber-700"
        : status.includes("실패") || status.includes("환불")
          ? "bg-red-50 text-red-700"
          : "bg-b2buy-bg text-b2buy-ink";

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{status}</span>;
}
