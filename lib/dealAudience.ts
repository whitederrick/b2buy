type AudienceProfile = {
  biz_type: string | null;
  biz_item: string | null;
};

type AudienceDeal = {
  category: string;
  title: string;
  product_name: string;
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "beauty-container": ["뷰티", "화장품", "코스메틱", "미용", "스킨케어", "용기", "포장"],
  beauty: ["뷰티", "화장품", "코스메틱", "미용", "스킨케어"],
  packaging: ["포장", "패키지", "용기", "부자재"],
  food: ["식품", "음료", "카페", "베이커리", "외식"],
  living: ["생활", "리빙", "잡화", "가정용품"],
  fashion: ["패션", "의류", "봉제", "잡화"],
  electronics: ["전자", "전기", "IT", "통신", "가전"]
};

export function filterDealsForProfile<T extends AudienceDeal>(
  deals: T[],
  profile: AudienceProfile | null
): T[] {
  if (!profile) return deals;

  const profileText = normalize(`${profile.biz_type ?? ""} ${profile.biz_item ?? ""}`);
  if (!profileText) return deals;

  return deals.filter((deal) => {
    const category = normalize(deal.category);
    const dealText = normalize(`${deal.category} ${deal.title} ${deal.product_name}`);
    const keywords = CATEGORY_KEYWORDS[deal.category] ?? CATEGORY_KEYWORDS[category] ?? [];

    return (
      category.includes(profileText) ||
      profileText.includes(category) ||
      keywords.some((keyword) => profileText.includes(normalize(keyword))) ||
      profileText
        .split(" ")
        .filter((token) => token.length >= 2)
        .some((token) => dealText.includes(token))
    );
  });
}

export function profileAudienceLabel(profile: AudienceProfile | null): string | null {
  if (!profile) return null;
  return [profile.biz_type, profile.biz_item].filter(Boolean).join(" · ") || null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[,\-/|]+/g, " ").replace(/\s+/g, " ");
}
