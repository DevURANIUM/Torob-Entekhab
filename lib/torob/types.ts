// Response shapes of the torob-mcp tools this app uses (subset of docs/card.d.ts).
export type TorobCard = {
  prk: string;
  name_fa: string | null;
  name_en: string | null;
  price_toman: number | null;
  price_text: string | null;
  available: boolean;
  shop_name: string | null;
  image: string | null;
  image_count?: number;
  url: string;
  is_adv?: boolean;
  details_url?: string;
};

export type TorobSearchResult = {
  query: string;
  products: TorobCard[];
  has_next_page?: boolean;
};

export type TorobOffer = {
  shop_name: string;
  shop_city: string | null;
  shop_score: number | null;
  price_toman: number | null;
  price_text: string | null;
  available: boolean;
  price_unreliable?: boolean;
  free_shipping?: boolean;
  url: string | null;
  guarantee?: string | null;
};

export type TorobProductDetails = TorobCard & {
  offer_count?: number;
  price_range_toman?: { min: number | null; max: number | null };
  offers?: TorobOffer[];
};

export type TorobHistory = {
  series?: {
    label: string;
    points: { date: string; value: number }[];
    latest: number | null;
    lowest: number | null;
    highest: number | null;
  }[];
  reading?: string;
  note?: string;
};
