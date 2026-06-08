import { NextRequest, NextResponse } from "next/server";
import {
  calcAchievement,
  calcDDay,
  calcTierPrice,
  getAdminSupabase,
  getServerSupabase,
  type DealRow,
  type PriceTier
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CreateDealBody = {
  title?: string;
  hs_code?: string | null;
  product_name?: string;
  product_url?: string | null;
  image_url?: string | null;
  category?: string;
  moq_target?: number;
  current_qty?: number;
  min_buy_qty?: number;
  max_buy_qty?: number | null;
  start_date?: string;
  end_date?: string;
  status?: string;
  price_tiers?: PriceTier[];
  base_price?: number;
  escrow_fee_rate?: number;
  platform_fee?: number;
  shipping_cost?: number;
};

function err(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

function enrichDeal(deal: DealRow) {
  const currentUnitPrice = calcTierPrice(deal.price_tiers, deal.current_qty);
  const achievementPct = calcAchievement(deal.current_qty, deal.moq_target);
  const dDay = calcDDay(deal.end_date);

  return {
    ...deal,
    currentUnitPrice,
    achievementPct,
    dDay,
    nextTier: nextTierInfo(deal.price_tiers, deal.current_qty)
  };
}

function nextTierInfo(
  tiers: DealRow["price_tiers"],
  currentQty: number
): null | { remainingQty: number; nextPrice: number; savingPerUnit: number } {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const current = calcTierPrice(sorted, currentQty);
  const next = sorted.find((tier) => tier.min_qty > currentQty);
  if (!next) return null;

  return {
    remainingQty: next.min_qty - currentQty,
    nextPrice: next.price,
    savingPerUnit: current - next.price
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status") as DealRow["status"] | null;
  const category = searchParams.get("category");

  const supabase = await getServerSupabase();

  if (id) {
    const { data, error } = await supabase
      .from("group_buy_deals")
      .select("*")
      .eq("id", id)
      .single<DealRow>();

    if (error || !data) return err("deal not found", 404);
    return ok(enrichDeal(data));
  }

  let query = supabase.from("group_buy_deals").select("*").order("end_date", { ascending: true });
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);

  const { data, error } = await query.returns<DealRow[]>();
  if (error) return err(error.message, 500);
  return ok((data ?? []).map(enrichDeal));
}

export async function POST(req: NextRequest) {
  let body: CreateDealBody;
  try {
    body = await req.json();
  } catch {
    return err("invalid JSON body");
  }

  const validation = validateCreateDeal(body);
  if (validation) return err(validation);

  const payload = {
    title: body.title!.trim(),
    hs_code: normalizeOptional(body.hs_code),
    product_name: body.product_name!.trim(),
    product_url: normalizeOptional(body.product_url),
    image_url: normalizeOptional(body.image_url),
    category: normalizeOptional(body.category) ?? "beauty-container",
    moq_target: Math.trunc(body.moq_target!),
    current_qty: Math.trunc(body.current_qty ?? 0),
    min_buy_qty: Math.trunc(body.min_buy_qty ?? 1),
    max_buy_qty: body.max_buy_qty == null ? null : Math.trunc(body.max_buy_qty),
    start_date: new Date(body.start_date!).toISOString(),
    end_date: new Date(body.end_date!).toISOString(),
    status: body.status ?? "모집중",
    price_tiers: normalizePriceTiers(body.price_tiers!),
    base_price: Math.trunc(body.base_price!),
    escrow_fee_rate: body.escrow_fee_rate ?? 1.5,
    platform_fee: body.platform_fee ?? 5.0,
    shipping_cost: Math.trunc(body.shipping_cost ?? 0)
  };

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("group_buy_deals")
    .insert(payload)
    .select("*")
    .single<DealRow>();

  if (error || !data) {
    return err(error?.message ?? "deal create failed", 500);
  }

  return ok(enrichDeal(data), 201);
}

function validateCreateDeal(body: CreateDealBody): string | null {
  if (!body.title?.trim()) return "title is required";
  if (!body.product_name?.trim()) return "product_name is required";
  if (!Number.isFinite(body.moq_target) || body.moq_target! <= 0) return "moq_target must be positive";
  if (!Number.isFinite(body.base_price) || body.base_price! <= 0) return "base_price must be positive";
  if (!Number.isFinite(body.min_buy_qty ?? 1) || (body.min_buy_qty ?? 1) <= 0) {
    return "min_buy_qty must be positive";
  }
  if (body.max_buy_qty != null && body.max_buy_qty < (body.min_buy_qty ?? 1)) {
    return "max_buy_qty must be greater than or equal to min_buy_qty";
  }
  if (!body.start_date || Number.isNaN(new Date(body.start_date).getTime())) {
    return "start_date is required";
  }
  if (!body.end_date || Number.isNaN(new Date(body.end_date).getTime())) {
    return "end_date is required";
  }
  if (new Date(body.end_date).getTime() <= new Date(body.start_date).getTime()) {
    return "end_date must be after start_date";
  }
  if (!Array.isArray(body.price_tiers) || body.price_tiers.length === 0) {
    return "price_tiers is required";
  }

  const tiers = normalizePriceTiers(body.price_tiers);
  if (tiers.some((tier) => tier.min_qty < 0 || tier.price <= 0)) {
    return "price_tiers contains invalid min_qty or price";
  }
  if (tiers[0]?.min_qty !== 0) return "first price tier must start at 0";
  for (let index = 1; index < tiers.length; index += 1) {
    if (tiers[index].min_qty <= tiers[index - 1].min_qty) {
      return "price_tiers must be sorted by ascending min_qty";
    }
  }

  return null;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePriceTiers(tiers: PriceTier[]): PriceTier[] {
  return tiers
    .map((tier) => ({
      min_qty: Math.trunc(Number(tier.min_qty)),
      max_qty: tier.max_qty == null ? null : Math.trunc(Number(tier.max_qty)),
      price: Math.trunc(Number(tier.price))
    }))
    .sort((a, b) => a.min_qty - b.min_qty);
}
