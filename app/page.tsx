import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* 히어로 */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-b2buy-primary to-orange-400 p-8 text-white shadow-lg sm:p-16">
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
          예비창업패키지 · 2026
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
          뷰티 부자재(공용기), <br />
          <u>1개 단가 250원 → 180원</u>으로 <br className="sm:hidden" />
          떨어뜨리는 공동구매.
        </h1>
        <p className="mt-3 max-w-xl text-sm opacity-90 sm:text-base">
          B2BUY는 인디 브랜드·소상공인을 위한 <b>중국 1688 공장 직소싱 펀딩형 공동구매</b> 플랫폼입니다.
          다 같이 모이면 모일수록, 1688 공장 원가 기반 구간 단가가 실시간으로 떨어집니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/deals"
            className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-b2buy-primary shadow hover:bg-orange-50"
          >
            공동구매 보러가기 →
          </Link>
          <Link
            href="/login"
            className="rounded-xl border-2 border-white/80 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur hover:bg-white/20"
          >
            회원가입 / 로그인
          </Link>
        </div>
      </section>

      {/* 핵심 3대 가치 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: "🏭",
            title: "1688 공장 직소싱",
            body: "중간 도매상 없는 1차 공가. HS 코드 3923.30 화장품 용기 카테고리."
          },
          {
            icon: "📉",
            title: "모일수록 단가 하락",
            body: "1만 개 미만 250원 → 3만 개 200원 → 5만 개 이상 180원. 실시간 진척도."
          },
          {
            icon: "🛡️",
            title: "하나은행 에스크로",
            body: "공동구매 성공 시에만 공장에 정산. 실패 시 자동 전액 환불."
          }
        ].map((v) => (
          <div
            key={v.title}
            className="rounded-2xl border border-b2buy-line bg-white p-5 shadow-sm"
          >
            <div className="text-3xl">{v.icon}</div>
            <h3 className="mt-2 text-base font-extrabold text-b2buy-ink">{v.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-b2buy-muted">{v.body}</p>
          </div>
        ))}
      </section>

      {/* 카테고리 C 미리보기 */}
      <section className="rounded-2xl border border-b2buy-line bg-white p-6 sm:p-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold text-b2buy-ink sm:text-2xl">
            카테고리 C · 뷰티 공용기
          </h2>
          <Link href="/deals" className="text-sm font-bold text-b2buy-primary hover:underline">
            전체 보기 →
          </Link>
        </div>
        <p className="mt-1 text-xs text-b2buy-muted">
          HS 3923.30 (화장품·향수·세제용 플라스틱 용기)
        </p>

        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { name: "50ml 유리에센스 병", moq: "3만 개" },
            { name: "24/410 펌프 캡",      moq: "5만 개" },
            { name: "30ml PET 토너 병",    moq: "2만 개" }
          ].map((c) => (
            <li
              key={c.name}
              className="rounded-xl border border-b2buy-line bg-b2buy-bg/40 p-4"
            >
              <p className="text-sm font-bold text-b2buy-ink">{c.name}</p>
              <p className="mt-1 text-xs text-b2buy-muted">목표 MoQ {c.moq}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
