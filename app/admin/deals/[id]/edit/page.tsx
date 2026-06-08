import Link from "next/link";
import { notFound } from "next/navigation";
import AdminDealForm from "@/components/AdminDealForm";
import { getAdminSupabase, type DealRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditAdminDealPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await loadDeal(id);
  if (!deal) return notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-b2buy-primary">
            Admin Deal
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-b2buy-ink sm:text-3xl">
            공동구매 딜 수정
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-b2buy-muted">
            모집 조건, 단가 구간, 운영 상태를 수정합니다. 참여자가 이미 있는 딜은 수량과 단가
            변경이 구매자 경험에 영향을 줄 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/deals/${deal.id}`}
            className="rounded-xl border border-b2buy-line bg-white px-4 py-2 text-sm font-bold text-b2buy-ink hover:bg-b2buy-bg"
          >
            딜 상세 보기
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-b2buy-line bg-white px-4 py-2 text-sm font-bold text-b2buy-ink hover:bg-b2buy-bg"
          >
            운영자 대시보드로
          </Link>
        </div>
      </header>

      <AdminDealForm mode="edit" initialDeal={deal} />
    </div>
  );
}

async function loadDeal(id: string): Promise<DealRow | null> {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("group_buy_deals")
      .select("*")
      .eq("id", id)
      .single<DealRow>();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
