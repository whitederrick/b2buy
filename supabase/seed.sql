-- =============================================================================
-- B2BUY Seed Data (개발/데모용)
-- =============================================================================

insert into public.hs_codes (hs_code, kor_name, eng_name, default_rate, category_code, kor_section, eng_section)
values
  ('3923.30', '화장품·향수·세제용 플라스틱 용기', 'Plastic containers for cosmetics/toiletries', 6.5, 'C', '플라스틱류', 'Plastics'),
  ('7013.37', '유리제 음료용기', 'Glassware for beverages', 8.0, 'C', '유리류', 'Glassware'),
  ('3923.21', '에틸렌 중합체 봉투·파우치', 'Sacks & bags of polymers of ethylene', 6.5, 'D', '포장재', 'Packaging')
on conflict (hs_code) do nothing;

-- 가격 구간 예시(기획 정의서 3.1): 1만 미만 250원, 3만 미만 200원, 5만 이상 180원
insert into public.group_buy_deals (
  title, hs_code, product_name, product_url, image_url, category,
  moq_target, current_qty, min_buy_qty, max_buy_qty,
  start_date, end_date, status, price_tiers, base_price,
  escrow_fee_rate, platform_fee, shipping_cost
) values
  (
    '인디 브랜드 공용 50ml 유리에센스 병',
    '3923.30',
    '50ml 유리에센스 병 (투명 / 깔끔형)',
    'https://detail.1688.com/offer/123456789.html',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600',
    'C',
    30000, 8200, 100, null,
    now() - interval '3 days',
    now() + interval '5 days',
    '모집중',
    '[
      {"min_qty": 0,     "max_qty": 9999,  "price": 250},
      {"min_qty": 10000, "max_qty": 29999, "price": 200},
      {"min_qty": 30000, "max_qty": null,  "price": 180}
    ]'::jsonb,
    320,   -- 국내 도매 기준가
    1.5, 5.0, 1500000
  ),
  (
    '펌프 캡(크림용) 24/410 표준 사출',
    '3923.30',
    '24/410 크림 펌프 캡 (화이트 / 블랙)',
    'https://detail.1688.com/offer/987654321.html',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600',
    'C',
    50000, 21500, 200, 50000,
    now() - interval '1 day',
    now() + interval '7 days',
    '모집중',
    '[
      {"min_qty": 0,     "max_qty": 19999, "price": 420},
      {"min_qty": 20000, "max_qty": 49999, "price": 380},
      {"min_qty": 50000, "max_qty": null,  "price": 340}
    ]'::jsonb,
    520,
    1.5, 5.0, 2200000
  ),
  (
    '30ml 토너용 PET 병 (뚜껑 포함)',
    '3923.30',
    '30ml PET 토너 병 (무색 투명)',
    'https://detail.1688.com/offer/555666777.html',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
    'C',
    20000, 19800, 100, 10000,
    now() - interval '5 days',
    now() + interval '2 days',
    '모집중',
    '[
      {"min_qty": 0,     "max_qty": 9999,  "price": 150},
      {"min_qty": 10000, "max_qty": 19999, "price": 130},
      {"min_qty": 20000, "max_qty": null,  "price": 110}
    ]'::jsonb,
    180,
    1.5, 5.0, 800000
  )
on conflict do nothing;
