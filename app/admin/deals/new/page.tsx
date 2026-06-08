import Link from "next/link";
import AdminDealForm from "@/components/AdminDealForm";

export const dynamic = "force-dynamic";

export default function NewAdminDealPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-b2buy-primary">
            Admin Deal
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-b2buy-ink sm:text-3xl">
            공동구매 딜 등록
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-b2buy-muted">
            1688 원천 상품, MoQ, 구간 단가, 에스크로 수수료를 입력해 새 모집 딜을 엽니다.
          </p>
        </div>
        <Link
          href="/admin"
          className="w-fit rounded-xl border border-b2buy-line bg-white px-4 py-2 text-sm font-bold text-b2buy-ink hover:bg-b2buy-bg"
        >
          운영자 대시보드로
        </Link>
      </header>

      <AdminDealForm />
    </div>
  );
}
