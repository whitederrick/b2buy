"use client";

import { useEffect, useMemo, useState } from "react";
import type { PriceTier, ShippingType } from "@/lib/supabase";
import { calcTierPrice } from "@/lib/supabase";

export interface OrderPopupProps {
  deal: {
    id: string;
    title: string;
    product_name: string;
    image_url: string | null;
    moq_target: number;
    current_qty: number;
    min_buy_qty: number;
    max_buy_qty: number | null;
    end_date: string;
    price_tiers: PriceTier[];
    base_price: number;
    escrow_fee_rate: number;
    platform_fee: number;
  };
  currentTierPrice: number;
  currentQty: number;
  dDay: number;
  currentUser?: {
    id: string;
    name: string;
    default_address?: string;
    default_shipping_type?: ShippingType;
  } | null;
  onClose: () => void;
  onParticipated?: (result: { newCurrentQty: number; unitPrice: number }) => void;
}

const SHIPPING_OPTIONS: { value: ShippingType; label: string; desc: string }[] = [
  { value: "사무실", label: "사무실", desc: "기본 사업장 주소로 배송" },
  { value: "창고", label: "창고", desc: "물류센터 또는 3PL 창고 주소" },
  { value: "공장", label: "공장", desc: "자체 생산라인으로 직송" },
  { value: "기타", label: "직접입력", desc: "새 주소를 직접 입력" }
];

export default function OrderPopup(props: OrderPopupProps) {
  const { deal, currentTierPrice, currentQty, dDay, currentUser, onClose, onParticipated } = props;

  const [qty, setQty] = useState<number>(deal.min_buy_qty);
  const [shippingType, setShippingType] = useState<ShippingType>(
    currentUser?.default_shipping_type ?? "사무실"
  );
  const [shippingAddr, setShippingAddr] = useState<string>(currentUser?.default_address ?? "");
  const [agreedEscrow, setAgreedEscrow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    newCurrentQty: number;
    unitPrice: number;
    hint: string | null;
  }>(null);

  const newCurrentQty = currentQty + qty;
  const effectiveUnitPrice = useMemo(
    () => Math.min(currentTierPrice, calcTierPrice(deal.price_tiers, newCurrentQty)),
    [currentTierPrice, newCurrentQty, deal.price_tiers]
  );

  const totalPayment = effectiveUnitPrice * qty;
  const baseTotal = deal.base_price * qty;
  const savingAmount = Math.max(0, baseTotal - totalPayment);
  const savingPercent = baseTotal > 0 ? (savingAmount / baseTotal) * 100 : 0;
  const escrowFee = Math.round(totalPayment * (deal.escrow_fee_rate / 100));
  const platformFee = Math.round(totalPayment * (deal.platform_fee / 100));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const canSubmit =
    qty >= deal.min_buy_qty &&
    (deal.max_buy_qty == null || qty <= deal.max_buy_qty) &&
    shippingAddr.trim().length > 0 &&
    agreedEscrow &&
    !submitting;

  async function handleSubmit() {
    if (!currentUser) {
      setError("로그인이 필요합니다. 현재 화면에서는 테스트 사용자를 연결해 주세요.");
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/deals/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: deal.id,
          requested_qty: qty,
          shipping_addr: shippingAddr,
          shipping_type: shippingType
        })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "참여 처리에 실패했습니다.");

      setSuccess({
        newCurrentQty: j.data.newCurrentQty,
        unitPrice: j.data.unitPrice,
        hint: j.data.hint
      });
      onParticipated?.({ newCurrentQty: j.data.newCurrentQty, unitPrice: j.data.unitPrice });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow hover:bg-white"
        >
          ×
        </button>

        <header className="flex gap-3 border-b border-b2buy-line bg-gradient-to-r from-orange-50 to-white p-4 pr-12">
          {deal.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.image_url} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-1 text-base font-bold text-b2buy-ink">{deal.title}</h2>
            <p className="mt-0.5 text-xs text-b2buy-muted">상품 {deal.product_name}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[11px]">
              <span className="rounded-full bg-b2buy-primary px-2 py-0.5 font-bold text-white">
                {dDay > 0 ? `D-${dDay}` : "D-DAY"}
              </span>
              <span className="text-b2buy-muted">
                현재 {currentQty.toLocaleString("ko-KR")}개 모집
              </span>
            </div>
          </div>
        </header>

        {success ? (
          <SuccessPanel success={success} unitPrice={effectiveUnitPrice} onClose={onClose} />
        ) : (
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <section>
              <label className="mb-1.5 block text-sm font-bold text-b2buy-ink">구매 수량</label>
              <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-b2buy-primary">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(deal.min_buy_qty, q - 100))}
                  className="px-4 text-lg font-bold text-b2buy-primary hover:bg-orange-50"
                >
                  -
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={deal.min_buy_qty}
                  max={deal.max_buy_qty ?? undefined}
                  step={100}
                  value={qty}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^\d]/g, "")) || 0;
                    setQty(v);
                  }}
                  className="flex-1 bg-white text-center text-lg font-bold text-b2buy-ink outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 100)}
                  className="px-4 text-lg font-bold text-b2buy-primary hover:bg-orange-50"
                >
                  +
                </button>
                <span className="flex items-center bg-b2buy-bg px-3 text-xs text-b2buy-muted">개</span>
              </div>
              <p className="mt-1 text-[11px] text-b2buy-muted">
                최소 {deal.min_buy_qty.toLocaleString("ko-KR")}개
                {deal.max_buy_qty &&
                  ` · 1회 최대 ${deal.max_buy_qty.toLocaleString("ko-KR")}개`}
              </p>
            </section>

            <section className="mt-4 rounded-xl border border-b2buy-line bg-b2buy-bg p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-b2buy-muted">현재 구간 단가</span>
                <span className="text-sm font-bold text-b2buy-ink">
                  {effectiveUnitPrice.toLocaleString("ko-KR")}원/개
                  {effectiveUnitPrice < currentTierPrice && (
                    <span className="ml-1 rounded bg-b2buy-accent px-1 py-0.5 text-[10px] font-bold text-white">
                      단가 하락
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-b2buy-ink">최종 결제 금액</span>
                <span className="text-2xl font-extrabold text-b2buy-primary">
                  {totalPayment.toLocaleString("ko-KR")}원
                </span>
              </div>
              <p className="mt-1 text-[10px] text-b2buy-muted">
                수량 {qty.toLocaleString("ko-KR")}개 × 단가{" "}
                {effectiveUnitPrice.toLocaleString("ko-KR")}원
                {" · "}
                에스크로 {escrowFee.toLocaleString("ko-KR")}원, 플랫폼{" "}
                {platformFee.toLocaleString("ko-KR")}원 별도
              </p>
            </section>

            <section className="mt-4 rounded-xl border-2 border-b2buy-accent bg-gradient-to-r from-emerald-50 to-white p-4 text-center">
              <p className="text-xs font-semibold text-b2buy-accentDark">
                B2BUY 공동구매 예상 절감액
              </p>
              <p className="mt-1 text-3xl font-black text-b2buy-accent">
                {savingAmount.toLocaleString("ko-KR")}원
                <span className="ml-1 text-base font-bold text-b2buy-accentDark">절감</span>
              </p>
              <p className="mt-0.5 text-xs text-b2buy-ink">
                국내 도매가 {baseTotal.toLocaleString("ko-KR")}원 대비{" "}
                <b className="text-b2buy-accent">약 {savingPercent.toFixed(1)}% 절감</b>
              </p>
            </section>

            <section className="mt-5">
              <p className="mb-2 text-sm font-bold text-b2buy-ink">배송지 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {SHIPPING_OPTIONS.map((opt) => {
                  const active = shippingType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 p-3 transition ${
                        active
                          ? "border-b2buy-primary bg-orange-50"
                          : "border-b2buy-line bg-white hover:border-orange-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping_type"
                        value={opt.value}
                        checked={active}
                        onChange={() => setShippingType(opt.value)}
                        className="mt-0.5 h-4 w-4 accent-orange-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-b2buy-ink">{opt.label}</p>
                        <p className="text-[10px] leading-tight text-b2buy-muted">{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <textarea
                value={shippingAddr}
                onChange={(e) => setShippingAddr(e.target.value)}
                rows={2}
                placeholder="상세 주소를 입력해 주세요. 도로명/지번 모두 가능합니다."
                className="mt-2 w-full resize-none rounded-xl border border-b2buy-line bg-white p-2.5 text-sm outline-none focus:border-b2buy-primary"
              />
            </section>

            <section className="mt-5 rounded-xl bg-b2buy-bg p-3">
              <label className="flex cursor-pointer items-start gap-2 text-xs text-b2buy-ink">
                <input
                  type="checkbox"
                  checked={agreedEscrow}
                  onChange={(e) => setAgreedEscrow(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-orange-500"
                />
                <span>
                  <b className="text-b2buy-ink">하나은행 가상계좌 에스크로 예치 약관</b>에
                  동의합니다.
                  <br />
                  <span className="text-b2buy-muted">
                    공동구매 성공 확정 시에만 예치금이 공장에 정산되며, 실패 시 전액 자동
                    환불됩니다.
                  </span>
                </span>
              </label>
            </section>

            {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`mt-5 w-full rounded-xl py-3.5 text-sm font-extrabold transition ${
                canSubmit
                  ? "bg-b2buy-primary text-white hover:bg-b2buy-primaryDark active:scale-[0.99]"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {submitting
                ? "처리 중..."
                : !currentUser
                  ? "로그인이 필요합니다"
                  : !agreedEscrow
                    ? "에스크로 약관에 동의해 주세요"
                    : qty < deal.min_buy_qty
                      ? `최소 ${deal.min_buy_qty.toLocaleString("ko-KR")}개부터 참여 가능합니다`
                      : "가상계좌 발급 및 예치하기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessPanel({
  success,
  unitPrice,
  onClose
}: {
  success: { newCurrentQty: number; unitPrice: number; hint: string | null };
  unitPrice: number;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-b2buy-accent text-2xl font-black text-white">
        OK
      </div>
      <h3 className="text-lg font-extrabold text-b2buy-ink">참여 신청이 완료되었습니다</h3>
      <p className="mt-1 text-sm text-b2buy-muted">
        하나은행 가상계좌가 발급되었습니다. 입금 후 입금대기 상태가 예치완료로 전환됩니다.
      </p>

      <div className="mt-4 rounded-xl bg-b2buy-bg p-3 text-left text-sm">
        <Row k="현재 누적 수량" v={`${success.newCurrentQty.toLocaleString("ko-KR")}개`} />
        <Row k="예상 확정 단가" v={`${unitPrice.toLocaleString("ko-KR")}원/개`} />
        {success.hint && (
          <p className="mt-2 rounded-lg bg-white p-2 text-[11px] text-b2buy-muted">
            {success.hint}
          </p>
        )}
      </div>

      <button
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-b2buy-primary py-3 text-sm font-bold text-white hover:bg-b2buy-primaryDark"
      >
        확인
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-b2buy-muted">{k}</span>
      <span className="text-sm font-bold text-b2buy-ink">{v}</span>
    </div>
  );
}
