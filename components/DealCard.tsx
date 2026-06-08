"use client";

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
    min_buy_qty?: number;
    max_buy_qty?: number | null;
    escrow_fee_rate?: number;
    platform_fee?: number;
  };
  pollingMs?: number;
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
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProgressData>(() => ({
    current_qty: deal.current_qty,
    currentUnitPrice: calcTierPrice(deal.price_tiers, deal.current_qty),
    achievementPct: calcAchievement(deal.current_qty, deal.moq_target),
    dDay: ddayFrom(deal.end_date),
    nextTier: nextTierOf(deal.price_tiers, deal.current_qty),
    remainingToNext: remainingToNext(deal.price_tiers, deal.current_qty),
    status: deal.status
  }));

  useEffect(() => {
    if (!pollingMs) return;
    let aborted = false;

    const fetchProgress = async () => {
      try {
        const r = await fetch(`/api/deals/progress?id=${deal.id}`, { cache: "no-store" });
        const j = await r.json();
        if (aborted || !j.ok) return;
        setData({
          current_qty: j.data.current_qty,
          currentUnitPrice: j.data.currentUnitPrice,
          achievementPct: j.data.achievementPct,
          dDay: j.data.dDay,
          nextTier: j.data.nextTier ?? null,
          remainingToNext: j.data.remainingToNext,
          status: j.data.status
        });
      } catch {
        // 일시적인 네트워크 오류는 다음 폴링에서 복구됩니다.
      }
    };

    const timer = setInterval(fetchProgress, pollingMs);
    return () => {
      aborted = true;
      clearInterval(timer);
    };
  }, [deal.id, pollingMs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) => ({ ...prev, dDay: ddayFrom(deal.end_date) }));
    }, 60_000);
    return () => clearInterval(timer);
  }, [deal.end_date]);

  const isClosed = data.status !== "모집중";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-b2buy-line bg-white shadow-sm transition hover:shadow-lg">
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

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow ${
            isClosed
              ? "bg-gray-500 text-white"
              : data.dDay <= 2
                ? "animate-pulseSoft bg-red-500 text-white"
                : "bg-b2buy-primary text-white"
          }`}
        >
          {isClosed ? "마감" : data.dDay > 0 ? `D-${data.dDay}` : "D-DAY"}
        </span>

        <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          1688 공장 직소싱
        </span>

        <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-b2buy-ink shadow">
          카테고리 C · 뷰티 공용기
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-b2buy-ink">{deal.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-b2buy-muted">상품 {deal.product_name}</p>
        </div>

        <ProgressBar current={data.current_qty} target={deal.moq_target} pct={data.achievementPct} />

        <div className="rounded-xl border border-b2buy-line bg-gradient-to-r from-orange-50 to-white p-3">
          <div className="flex items-end justify-between gap-3">
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
                </span>{" "}
                더 모이면
                <br />
                <span className="font-bold text-b2buy-ink">
                  {data.nextTier.price.toLocaleString("ko-KR")}원
                </span>
                으로 하락
              </p>
            )}
          </div>
        </div>

        <PriceTierTable
          tiers={deal.price_tiers}
          currentQty={data.current_qty}
          currentPrice={data.currentUnitPrice}
        />

        <button
          onClick={() => setOpen(true)}
          disabled={isClosed}
          className={`mt-auto w-full rounded-xl py-3 text-sm font-bold transition ${
            isClosed
              ? "cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-b2buy-primary text-white hover:bg-b2buy-primaryDark active:scale-[0.98]"
          }`}
        >
          {isClosed ? "공동구매 마감" : "공동구매 참여하기"}
        </button>
      </div>

      {open && (
        <OrderPopup
          deal={{
            ...deal,
            min_buy_qty: deal.min_buy_qty ?? 1,
            max_buy_qty: deal.max_buy_qty ?? null,
            escrow_fee_rate: deal.escrow_fee_rate ?? 1.5,
            platform_fee: deal.platform_fee ?? 5.0
          }}
          currentTierPrice={data.currentUnitPrice}
          currentQty={data.current_qty}
          dDay={data.dDay}
          onClose={() => setOpen(false)}
          currentUser={currentUser}
        />
      )}
    </article>
  );
}

function ProgressBar({ current, target, pct }: { current: number; target: number; pct: number }) {
  const safePct = Math.max(0, Math.min(100, pct));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-b2buy-muted">실시간 모집률</span>
        <span className="text-sm font-bold text-b2buy-ink">{safePct.toFixed(1)}%</span>
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

function PriceTierTable({
  tiers,
  currentQty,
  currentPrice
}: {
  tiers: PriceTier[];
  currentQty: number;
  currentPrice: number;
}) {
  const sorted = useMemo(() => [...tiers].sort((a, b) => a.min_qty - b.min_qty), [tiers]);

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
          {sorted.map((tier, idx) => {
            const isCurrent = currentPrice === tier.price;
            const isPassed = currentQty >= (tier.max_qty ?? Infinity);
            const range =
              tier.max_qty == null
                ? `${tier.min_qty.toLocaleString("ko-KR")}개 이상`
                : `${tier.min_qty.toLocaleString("ko-KR")} ~ ${(tier.max_qty - 1).toLocaleString("ko-KR")}개`;

            return (
              <tr
                key={idx}
                className={`border-t border-b2buy-line transition ${
                  isCurrent
                    ? "bg-orange-50 font-bold text-b2buy-primary"
                    : isPassed
                      ? "text-gray-400 line-through"
                      : "text-b2buy-ink"
                }`}
              >
                <td className="px-2 py-1.5">{range}</td>
                <td className="px-2 py-1.5 text-right">{tier.price.toLocaleString("ko-KR")}원</td>
                <td className="px-2 py-1.5 text-right">
                  {isCurrent ? (
                    <span className="rounded bg-b2buy-primary px-1.5 py-0.5 text-[10px] text-white">
                      현재
                    </span>
                  ) : isPassed ? (
                    <span className="text-[10px] text-gray-400">달성</span>
                  ) : (
                    <span className="text-[10px] text-b2buy-muted">대기</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ddayFrom(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

function nextTierOf(tiers: PriceTier[], qty: number): PriceTier | null {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  return sorted.find((tier) => tier.min_qty > qty) ?? null;
}

function remainingToNext(tiers: PriceTier[], qty: number): number {
  const nextTier = nextTierOf(tiers, qty);
  return nextTier ? nextTier.min_qty - qty : 0;
}
