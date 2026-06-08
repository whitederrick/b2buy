import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-b2buy-primary to-orange-400 p-8 text-white shadow-lg sm:p-16">
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
          사업자 맞춤 공동구매
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
          우리 사업에 필요한 구매 기회만,
          <br />
          <u>더 나은 조건</u>으로 연결합니다.
        </h1>
        <p className="mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
          B2BUY는 회원의 업태와 업종을 기준으로 관련 공동구매를 선별합니다. 검증된 공급
          기회에 필요한 수량만 참여하고, 수요가 모일수록 개선되는 단가를 확인하세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/deals"
            className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-b2buy-primary shadow hover:bg-orange-50"
          >
            맞춤 공동구매 보기
          </Link>
          <Link
            href="/login"
            className="rounded-xl border-2 border-white/80 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur hover:bg-white/20"
          >
            회원가입 / 로그인
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: "사업자 맞춤 제안",
            body: "가입 시 등록한 업태와 업종을 기준으로 현재 사업과 관련된 공동구매를 우선 연결합니다."
          },
          {
            title: "공동 수요 기반 조건",
            body: "참여 수량이 모일수록 구간 단가가 조정되어 구매 조건의 변화를 투명하게 확인할 수 있습니다."
          },
          {
            title: "검증된 공급 기회",
            body: "운영자가 상품 정보와 공급 조건을 검토한 뒤 사업자 회원에게 적합한 모집만 공개합니다."
          }
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-b2buy-line bg-white p-5 shadow-sm"
          >
            <h3 className="text-base font-extrabold text-b2buy-ink">{item.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-b2buy-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-6 sm:p-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold text-b2buy-ink sm:text-2xl">
            현재 운영 카테고리
          </h2>
          <Link href="/deals" className="text-sm font-bold text-b2buy-primary hover:underline">
            모집 보기
          </Link>
        </div>
        <p className="mt-1 text-xs text-b2buy-muted">
          초기 운영 카테고리는 뷰티 브랜드의 용기 및 패키징 부자재입니다.
        </p>

        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { name: "에센스·세럼 용기", moq: "목표 30,000개" },
            { name: "펌프·캡 부자재", moq: "목표 50,000개" },
            { name: "토너·미스트 용기", moq: "목표 20,000개" }
          ].map((category) => (
            <li
              key={category.name}
              className="rounded-xl border border-b2buy-line bg-b2buy-bg/40 p-4"
            >
              <p className="text-sm font-bold text-b2buy-ink">{category.name}</p>
              <p className="mt-1 text-xs text-b2buy-muted">{category.moq}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
