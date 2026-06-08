"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DealRow, DealStatus, PriceTier } from "@/lib/supabase";

type TierInput = {
  min_qty: string;
  max_qty: string;
  price: string;
};

type DealFormMode = "create" | "edit";

type DealFormValues = {
  title: string;
  product_name: string;
  hs_code: string;
  category: string;
  product_url: string;
  image_url: string;
  moq_target: string;
  current_qty: string;
  min_buy_qty: string;
  max_buy_qty: string;
  base_price: string;
  escrow_fee_rate: string;
  platform_fee: string;
  shipping_cost: string;
  start_date: string;
  end_date: string;
  status: DealStatus;
};

const now = new Date();
const nextWeek = new Date(Date.now() + 7 * 86_400_000);

const defaultTiers: TierInput[] = [
  { min_qty: "0", max_qty: "9999", price: "250" },
  { min_qty: "10000", max_qty: "29999", price: "200" },
  { min_qty: "30000", max_qty: "", price: "180" }
];

const statusOptions: DealStatus[] = ["모집중", "공구성공", "공구실패", "배송중", "완료"];

export default function AdminDealForm({
  mode = "create",
  initialDeal = null
}: {
  mode?: DealFormMode;
  initialDeal?: DealRow | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierInput[]>(
    initialDeal ? toTierInputs(initialDeal.price_tiers) : defaultTiers
  );
  const [form, setForm] = useState<DealFormValues>(
    initialDeal ? toFormValues(initialDeal) : defaultFormValues()
  );

  const isEdit = mode === "edit" && initialDeal;

  function update(key: keyof DealFormValues, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateTier(index: number, key: keyof TierInput, value: string) {
    setTiers((prev) =>
      prev.map((tier, currentIndex) =>
        currentIndex === index ? { ...tier, [key]: value } : tier
      )
    );
  }

  function addTier() {
    setTiers((prev) => [...prev, { min_qty: "", max_qty: "", price: "" }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const price_tiers = tiers.map<PriceTier>((tier) => ({
        min_qty: numberFrom(tier.min_qty),
        max_qty: tier.max_qty.trim() ? numberFrom(tier.max_qty) : null,
        price: numberFrom(tier.price)
      }));

      const body = {
        id: initialDeal?.id,
        title: form.title,
        product_name: form.product_name,
        hs_code: form.hs_code || null,
        category: form.category,
        product_url: form.product_url || null,
        image_url: form.image_url || null,
        moq_target: numberFrom(form.moq_target),
        current_qty: numberFrom(form.current_qty || "0"),
        min_buy_qty: numberFrom(form.min_buy_qty),
        max_buy_qty: form.max_buy_qty.trim() ? numberFrom(form.max_buy_qty) : null,
        base_price: numberFrom(form.base_price),
        escrow_fee_rate: numberFrom(form.escrow_fee_rate),
        platform_fee: numberFrom(form.platform_fee),
        shipping_cost: numberFrom(form.shipping_cost || "0"),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        status: form.status,
        price_tiers
      };

      const res = await fetch("/api/deals", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "딜 저장에 실패했습니다.");
      }

      router.push(`/deals/${json.data.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "딜 저장 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-b2buy-line bg-white p-5">
        <h2 className="text-lg font-extrabold text-b2buy-ink">기본 정보</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="딜 제목" value={form.title} onChange={(v) => update("title", v)} required />
          <Field
            label="상품명"
            value={form.product_name}
            onChange={(v) => update("product_name", v)}
            required
          />
          <Field label="HS 코드" value={form.hs_code} onChange={(v) => update("hs_code", v)} />
          <Field label="카테고리" value={form.category} onChange={(v) => update("category", v)} />
          <Field
            label="1688 원천 URL"
            value={form.product_url}
            onChange={(v) => update("product_url", v)}
          />
          <Field
            label="이미지 URL"
            value={form.image_url}
            onChange={(v) => update("image_url", v)}
          />
          <label className="block">
            <span className="block text-xs font-bold text-b2buy-ink">운영 상태</span>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="mt-1 w-full rounded-xl border border-b2buy-line bg-white px-3 py-2.5 text-sm outline-none focus:border-b2buy-primary"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-5">
        <h2 className="text-lg font-extrabold text-b2buy-ink">모집 조건</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field
            label="MoQ 목표 수량"
            type="number"
            value={form.moq_target}
            onChange={(v) => update("moq_target", v)}
            required
          />
          <Field
            label="현재 누적 수량"
            type="number"
            value={form.current_qty}
            onChange={(v) => update("current_qty", v)}
          />
          <Field
            label="최소 구매 수량"
            type="number"
            value={form.min_buy_qty}
            onChange={(v) => update("min_buy_qty", v)}
            required
          />
          <Field
            label="1회 최대 구매 수량"
            type="number"
            value={form.max_buy_qty}
            onChange={(v) => update("max_buy_qty", v)}
          />
          <Field
            label="모집 시작"
            type="datetime-local"
            value={form.start_date}
            onChange={(v) => update("start_date", v)}
            required
          />
          <Field
            label="모집 마감"
            type="datetime-local"
            value={form.end_date}
            onChange={(v) => update("end_date", v)}
            required
          />
        </div>
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-b2buy-ink">단가 구간</h2>
            <p className="mt-1 text-xs text-b2buy-muted">
              첫 구간은 0개부터 시작해야 하며, 마지막 구간의 최대 수량은 비워두면 무제한입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="rounded-lg border border-b2buy-line px-3 py-1.5 text-xs font-bold text-b2buy-ink hover:bg-b2buy-bg"
          >
            구간 추가
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <Field
                label="시작 수량"
                type="number"
                value={tier.min_qty}
                onChange={(v) => updateTier(index, "min_qty", v)}
                required
              />
              <Field
                label="종료 수량"
                type="number"
                value={tier.max_qty}
                onChange={(v) => updateTier(index, "max_qty", v)}
              />
              <Field
                label="단가"
                type="number"
                value={tier.price}
                onChange={(v) => updateTier(index, "price", v)}
                required
              />
              <button
                type="button"
                onClick={() => removeTier(index)}
                disabled={tiers.length <= 1}
                className="mt-6 rounded-lg border border-b2buy-line px-3 text-xs font-bold text-b2buy-muted hover:bg-b2buy-bg disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-b2buy-line bg-white p-5">
        <h2 className="text-lg font-extrabold text-b2buy-ink">비용 설정</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field
            label="국내 도매 기준가"
            type="number"
            value={form.base_price}
            onChange={(v) => update("base_price", v)}
            required
          />
          <Field
            label="에스크로 수수료(%)"
            type="number"
            value={form.escrow_fee_rate}
            onChange={(v) => update("escrow_fee_rate", v)}
            required
          />
          <Field
            label="플랫폼 수수료(%)"
            type="number"
            value={form.platform_fee}
            onChange={(v) => update("platform_fee", v)}
            required
          />
          <Field
            label="예상 배송비"
            type="number"
            value={form.shipping_cost}
            onChange={(v) => update("shipping_cost", v)}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl border border-b2buy-line bg-white px-5 py-3 text-sm font-bold text-b2buy-ink hover:bg-b2buy-bg"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-b2buy-primary px-5 py-3 text-sm font-extrabold text-white hover:bg-b2buy-primaryDark disabled:opacity-60"
        >
          {submitting ? "저장 중..." : isEdit ? "공동구매 딜 수정" : "공동구매 딜 등록"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-b2buy-ink">
        {label}
        {required && <span className="text-b2buy-primary"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-b2buy-line bg-white px-3 py-2.5 text-sm outline-none focus:border-b2buy-primary"
      />
    </label>
  );
}

function defaultFormValues(): DealFormValues {
  return {
    title: "",
    product_name: "",
    hs_code: "",
    category: "beauty-container",
    product_url: "",
    image_url: "",
    moq_target: "30000",
    current_qty: "0",
    min_buy_qty: "100",
    max_buy_qty: "",
    base_price: "320",
    escrow_fee_rate: "1.5",
    platform_fee: "5",
    shipping_cost: "0",
    start_date: toLocalInputValue(now),
    end_date: toLocalInputValue(nextWeek),
    status: "모집중"
  };
}

function toFormValues(deal: DealRow): DealFormValues {
  return {
    title: deal.title,
    product_name: deal.product_name,
    hs_code: deal.hs_code ?? "",
    category: deal.category,
    product_url: deal.product_url ?? "",
    image_url: deal.image_url ?? "",
    moq_target: String(deal.moq_target),
    current_qty: String(deal.current_qty),
    min_buy_qty: String(deal.min_buy_qty),
    max_buy_qty: deal.max_buy_qty == null ? "" : String(deal.max_buy_qty),
    base_price: String(deal.base_price),
    escrow_fee_rate: String(deal.escrow_fee_rate),
    platform_fee: String(deal.platform_fee),
    shipping_cost: String(deal.shipping_cost),
    start_date: toLocalInputValue(new Date(deal.start_date)),
    end_date: toLocalInputValue(new Date(deal.end_date)),
    status: deal.status
  };
}

function toTierInputs(tiers: PriceTier[]): TierInput[] {
  return tiers.map((tier) => ({
    min_qty: String(tier.min_qty),
    max_qty: tier.max_qty == null ? "" : String(tier.max_qty),
    price: String(tier.price)
  }));
}

function numberFrom(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("숫자 입력값을 확인해 주세요.");
  return parsed;
}

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
