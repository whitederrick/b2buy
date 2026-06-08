"use client";

/**
 * components/DealCard.tsx
 * ------------------------------------------------------------------
 * 메인 페이지에 표시되는 공동구매 딜 카드 (기획 정의서 4.1 + 화면설계 p.12)
 *
 *  - 카드 상단: 디데이 배지(D-5), 1688 공장 직소싱 마크
 *  - 카드 중앙: 실시간 Progress Bar (현재 모집율/목표 수량)
 *  - 카드 하단: 구간별 단가 테이블(현재 구간 하이라이트)
 *  - "공동구매 참여하기" 버튼 → OrderPopup 오픈
 *  - 7초 간격으로 /api/deals/progress 폴링하여 실시간 동기화
 * ------------------------------------------------------------------
 */
import { useEffect, useMemo, useState } from "react";
import OrderPopup from "./OrderPopup";
import { calcAchievement, calcTierPrice, type PriceTier } from "@/lib/supabase";

export interface DealCardProps {
  deal: {
    id: string;
    title: string;
    product_name: string;
    image_url: string | null;
    moq_target: number;
    current_qty: number;
    end_date: string;
    status: string;
    price_tiers: PriceTier[];
    base_price: number;
    product_url?: string | null;
    // OrderPopup에서 필요로 하는 필드 (없으면 기본값 사용)
    min_buy_qty?: number;
    max_buy_qty?: number | null;
    escrow_fee_rate?: number;
    platform_fee?: number;
  };
  /** 데모/SSR 단계에서 서버 데이터로만 카드 표시하고 폴링 비활성 */
  pollingMs?: number;
  /** 로그인 사용자 (OrderPopup에서 필요) */
  currentUser?: { id: string; name: string } | null;
}

type ProgressData = {
  current_qty: number;
  currentUnitPrice: number;
  achievementPct: number;
  dDay: number;
  nextTier: PriceTier | null;
  remainingToNext: number;
  status: string;
};

export default function DealCard({ deal, pollingMs = 7000, currentUser = null }: DealCardProps) {
  // 초기값은 props로 받은 값으로 세팅(SSR/SSG 호환)
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProgressData>(() => ({
    current_qty:      deal.current_qty,
    currentUnitPrice: calcTierPrice(deal.price_tiers, deal.current_qty),
    achievementPct:   calcAchievement(deal.current_qty, deal.moq_target),
    dDay:             ddayFrom(deal.end_date),
    nextTier:         nextTierOf(deal.price_tiers, deal.current_qty),
    remainingToNext:  remainingToNext(deal.price_tiers, deal.current_qty),
    status:           deal.status
  }));

  // 7초마다 진척도 폴링
  useEffect(() => {
    if (!pollingMs) return;
    let aborted = false;
    const fetchProgress = async () => {
      try {
        const r = await fetch(`/api/deals/progress?id=${deal.id}`, { cache: "no-store" });
        const j = await r.json();
        if (aborted || !j.ok) return;
        setData({
          current_qty:      j.data.current_qty,
          currentUnitPrice: j.data.currentUnitPrice,
          achievementPct:   j.data.achievementPct,
          dDay:             j.data.dDay,
          nextTier:         j.data.nextTier ?? null,
          remainingToNext:  j.data.remainingToNext,
          status:           j.data.status
        });
      } catch {
        /* 네트워크 일시 오류는 무시 */
      }
    };
    const t = setInterval(fetchProgress, pollingMs);
    return () => { aborted = true; clearInterval(t); };
  }, [deal.id, pollingMs]);

  // 1초마다 D-Day 미세 갱신(자정 기준)
  useEffect(() => {
    const t = setInterval(() => {
      setData((prev) => ({ ...prev, dDay: ddayFrom(deal.end_date) }));
    }, 60_000);
    return () => clearInterval(t);
  }, [deal.end_date]);

  const isClosed = data.status !== "모집중";

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-b2buy-line bg-white shadow-sm transition hover:shadow-lg"
    >
      {/* ----------------------------- 헤더 ----------------------------- */}
      <header className="relative aspect-[4/3] w-full overflow-hidden bg-b2buy-bg">
        {deal.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deal.image_url}
            alt={deal.product_name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-b2buy-muted">
            이미지 준비중
          </div>
        )}

        {/* 디데이 배지 */}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow
          ${isClosed ? "bg-gray-500 text-white"
            : data.dDay <= 2 ? "bg-red-500 text-white animate-pulseSoft"
            : "bg-b2buy-primary text-white"}`}>
          {isClosed ? "마감" : data.dDay > 0 ? `D-${data.dDay}` : "D-DAY"}
        </span>

        {/* 1688 공장 직소싱 마크 */}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <span aria-hidden>🏭</span> 1688 공장 직소싱
        </span>

        {/* 카테고리 C 라벨 */}
        <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-b2buy-ink shadow">
          카테고리 C · 뷰티 공용기
        </span>
      </header>

      {/* ----------------------------- 본문 ----------------------------- */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-b2buy-ink">{deal.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-b2buy-muted">HS {deal.product_name}</p>
        </div>

        {/* ===== 실시간 진행 바 ===== */}
        <ProgressBar
          current={data.current_qty}
          target={deal.moq_target}
          pct={data.achievementPct}
        />

        {/* 현재 구간 단가 강조 */}
        <div className="rounded-xl border border-b2buy-line bg-gradient-to-r from-orange-50 to-white p-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-b2buy-muted">현재 단가</p>
              <p className="text-2xl font-extrabold leading-none text-b2buy-primary">
                {data.currentUnitPrice.toLocaleString("ko-KR")}
                <span className="ml-1 text-sm font-medium text-b2buy-ink">원/개</span>
              </p>
            </div>
            {data.nextTier && (
              <p className="text-right text-[11px] leading-tight text-b2buy-muted">
                <span className="font-bold text-b2buy-accent">
                  {data.remainingToNext.toLocaleString("ko-KR")}개
                </span>{" "}더 모이면<br />
                <span className="font-bold text-b2buy-ink">
                  {data.nextTier.price.toLocaleString("ko-KR")}원
                </span>으로 하락
              </p>
            )}
          </div>
        </div>

        {/* ===== 구간별 단가 테이블 ===== */}
        <PriceTierTable
          tiers={deal.price_tiers}
          currentQty={data.current_qty}
          currentPrice={data.currentUnitPrice}
        />

        {/* CTA */}
        <button
          onClick={() => setOpen(true)}
          disabled={isClosed}
          className={`mt-auto w-full rounded-xl py-3 text-sm font-bold transition
            ${isClosed
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-b2buy-primary text-white hover:bg-b2buy-primaryDark active:scale-[0.98]"}`}
        >
          {isClosed ? "공동구매 마감" : "공동구매 참여하기"}
        </button>
      </div>

      {/* 팝업 */}
      {open && (
        <OrderPopup
          deal={{
            ...deal,
            min_buy_qty:    deal.min_buy_qty    ?? 1,
            max_buy_qty:    deal.max_buy_qty    ?? null,
            escrow_fee_rate:deal.escrow_fee_rate ?? 1.5,
            platform_fee:   deal.platform_fee   ?? 5.0
          }}
          currentTierPrice={data.currentUnitPrice}
          currentQty={data.current_qty}
          dDay={data.dDay}
          onClose={() => setOpen(false)}
          currentUser={currentUser}
          onParticipated={() => {
            // 참여 직후 즉시 한 번 더 폴링 → 다음 setInterval에서 갱신됨
          }}
        />
      )}
    </article>
  );
}

// =============================================================================
// ProgressBar
// =============================================================================
function ProgressBar({
  current, target, pct
}: { current: number; target: number; pct: number }) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-b2buy-muted">실시간 모집율</span>
        <span className="text-sm font-bold text-b2buy-ink">
          {safePct.toFixed(1)}%
        </span>
      </div>
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-b2buy-line"
        role="progressbar"
        aria-valuenow={Math.round(safePct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-b2buy-primary to-orange-400 transition-[width] duration-700 ease-out"
          style={{ width: `${safePct}%` }}
        />
        {/* 눈금자 표시 (50% 위치) */}
        <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-b2buy-muted">
        <span>
          현재 <b className="text-b2buy-ink">{current.toLocaleString("ko-KR")}</b>개
        </span>
        <span>
          목표 <b className="text-b2buy-ink">{target.toLocaleString("ko-KR")}</b>개
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// PriceTierTable
// =============================================================================
function PriceTierTable({
  tiers, currentQty, currentPrice
}: { tiers: PriceTier[]; currentQty: number; currentPrice: number }) {
  const sorted = useMemo(
    () => [...tiers].sort((a, b) => a.min_qty - b.min_qty),
    [tiers]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-b2buy-line">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-b2buy-bg text-b2buy-muted">
            <th className="px-2 py-2 text-left font-medium">구간</th>
            <th className="px-2 py-2 text-right font-medium">단가</th>
            <th className="px-2 py-2 text-right font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, idx) => {
            const isCurrent = currentPrice === t.price;
            const isPassed  = currentQty >= (t.max_qty ?? Infinity);
            const range =
              t.max_qty == null
                ? `${t.min_qty.toLocaleString("ko-KR")}개 이상`
                : `${t.min_qty.toLocaleString("ko-KR")} ~ ${(t.max_qty - 1).toLocaleString("ko-KR")}개`;
            return (
              <tr
                key={idx}
                className={`border-t border-b2buy-line transition
                  ${isCurrent ? "bg-orange-50 font-bold text-b2buy-primary"
                    : isPassed ? "text-gray-400 line-through"
                    : "text-b2buy-ink"}`}
              >
                <td className="px-2 py-1.5">{range}</td>
                <td className="px-2 py-1.5 text-right">
                  {t.price.toLocaleString("ko-KR")}원
                </td>
                <td className="px-2 py-1.5 text-right">
                  {isCurrent
                    ? <span className="rounded bg-b2buy-primary px-1.5 py-0.5 text-[10px] text-white">현재</span>
                    : isPassed
                      ? <span className="text-[10px] text-gray-400">달성</span>
                      : <span className="text-[10px] text-b2buy-muted">대기</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// utils
// =============================================================================
function ddayFrom(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}
function nextTierOf(tiers: PriceTier[], qty: number): PriceTier | null {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  return sorted.find((t) => t.min_qty > qty) ?? null;
}
function remainingToNext(tiers: PriceTier[], qty: number): number {
  const n = nextTierOf(tiers, qty);
  return n ? n.min_qty - qty : 0;
}
