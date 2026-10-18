import Home, { type HeroPhone } from "@/components/home/home";
import { getProducts } from "@/lib/db";

export const dynamic = "force-dynamic";

// Shown fanned in the hero: one familiar phone per price tier, preferring ones Torob has a photo of.
const heroPicks = [
  ["samsung-a56", "samsung-a55", "samsung-a36"],
  ["apple-iphone-16", "apple-iphone-15", "apple-iphone-16pro"],
  ["poco-x6-pro", "redmi-note-14-pro-5g", "xiaomi-14t"],
];

export default async function Page() {
  const products = await getProducts();
  const available = products.filter((p) => p.available);
  const phones = heroPicks.flatMap((ids): HeroPhone[] => {
    const pick = ids
      .map((id) =>
        available
          .filter((p) => p.variant.modelId === id)
          .sort(
            (a, b) =>
              Number(Boolean(b.modelData.image.primary)) -
                Number(Boolean(a.modelData.image.primary)) || a.price - b.price,
          )[0],
      )
      .find(Boolean);
    return pick
      ? [{ name: pick.displayName, price: pick.price, model: pick.modelData }]
      : [];
  });
  return <Home phones={phones} />;
}
