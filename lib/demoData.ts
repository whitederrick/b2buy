import type { PriceTier } from "@/lib/supabase";

export interface DemoDeal {
  id: string;
  title: string;
  product_name: string;
  category: string;
  image_url: string | null;
  moq_target: number;
  current_qty: number;
  min_buy_qty: number;
  max_buy_qty: number | null;
  start_date: string;
  end_date: string;
  status: string;
  price_tiers: PriceTier[];
  base_price: number;
  escrow_fee_rate: number;
  platform_fee: number;
  product_url: string | null;
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

export const DEMO_DEALS: DemoDeal[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    title: "인디 브랜드 공용 50ml 유리 에센스 병",
    product_name: "3923.30 · 50ml 유리 에센스 병",
    category: "beauty-container",
    image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600",
    moq_target: 30_000,
    current_qty: 8_200,
    min_buy_qty: 100,
    max_buy_qty: null,
    start_date: days(-2),
    end_date: days(5),
    status: "모집중",
    price_tiers: [
      { min_qty: 0, max_qty: 9999, price: 250 },
      { min_qty: 10000, max_qty: 29999, price: 200 },
      { min_qty: 30000, max_qty: null, price: 180 }
    ],
    base_price: 320,
    escrow_fee_rate: 1.5,
    platform_fee: 5.0,
    product_url: "https://detail.1688.com/offer/123456789.html"
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    title: "화장품 펌프 캡 24/410 표준 사출",
    product_name: "3923.30 · 24/410 펌프 캡",
    category: "beauty-container",
    image_url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600",
    moq_target: 50_000,
    current_qty: 21_500,
    min_buy_qty: 200,
    max_buy_qty: 50_000,
    start_date: days(-1),
    end_date: days(7),
    status: "모집중",
    price_tiers: [
      { min_qty: 0, max_qty: 19999, price: 420 },
      { min_qty: 20000, max_qty: 49999, price: 380 },
      { min_qty: 50000, max_qty: null, price: 340 }
    ],
    base_price: 520,
    escrow_fee_rate: 1.5,
    platform_fee: 5.0,
    product_url: "https://detail.1688.com/offer/987654321.html"
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    title: "30ml 토너용 PET 병 라벨 포함",
    product_name: "3923.30 · 30ml PET 토너 병",
    category: "beauty-container",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600",
    moq_target: 20_000,
    current_qty: 19_800,
    min_buy_qty: 100,
    max_buy_qty: 10_000,
    start_date: days(-3),
    end_date: days(2),
    status: "모집중",
    price_tiers: [
      { min_qty: 0, max_qty: 9999, price: 150 },
      { min_qty: 10000, max_qty: 19999, price: 130 },
      { min_qty: 20000, max_qty: null, price: 110 }
    ],
    base_price: 180,
    escrow_fee_rate: 1.5,
    platform_fee: 5.0,
    product_url: "https://detail.1688.com/offer/555666777.html"
  }
];
