import Link from "next/link";

export default function MyPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-b2buy-ink">마이페이지</h1>
        <p className="mt-1 text-sm text-b2buy-muted">
          내 신청 내역, 참여 현황, 에스크로 계좌 상태를 한눈에 확인합니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "참여중인 공동구매", value: "2건" },
          { label: "예치중인 금액", value: "4,320,000원" },
          { label: "누적 절감액", value: "1,820,000원" }
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-b2buy-line bg-white p-5">
            <p className="text-xs text-b2buy-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-b2buy-ink">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-5">
        <h2 className="text-base font-extrabold text-b2buy-ink">내 참여 내역 예시</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-b2buy-muted">
              <th className="py-2">상품</th>
              <th>수량</th>
              <th>단가</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {[
              { title: "50ml 에센스 용기", qty: 1500, price: 250, status: "예치완료" },
              { title: "24/410 펌프 캡", qty: 800, price: 420, status: "입금대기" }
            ].map((row) => (
              <tr key={row.title} className="border-t border-b2buy-line">
                <td className="py-2">{row.title}</td>
                <td>{row.qty.toLocaleString("ko-KR")}개</td>
                <td>{row.price.toLocaleString("ko-KR")}원</td>
                <td>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-b2buy-primary">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-center text-xs text-b2buy-muted">
        <Link href="/deals" className="font-bold text-b2buy-primary hover:underline">
          공동구매 보러가기
        </Link>
      </p>
    </div>
  );
}
