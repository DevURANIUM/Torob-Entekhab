import { describe, expect, it } from "vitest";
import {
  coreName,
  matchModelImage,
  matchVariant,
  parseCard,
  resizedImage,
  shopCount,
} from "../lib/torob/match";
import type { TorobCard } from "../lib/torob/types";

const card = (name_en: string, price: number, shops = "در ۱۲ فروشگاه") =>
  ({
    prk: name_en,
    name_en,
    name_fa: null,
    price_toman: price,
    price_text: null,
    available: true,
    shop_name: shops,
    image: "https://image.torob.com/base/images/a/b/c.webp",
    url: "https://torob.com/p/x/",
  }) satisfies TorobCard;

describe("torob matching", () => {
  it("normalizes maker, network and spacing", () => {
    expect(coreName("Samsung Galaxy Z Flip 6 5G")).toBe(coreName("Galaxy Z Flip6"));
    expect(coreName("Galaxy S24+")).toBe("galaxys24plus");
  });

  it("parses storage, ram and condition", () => {
    expect(parseCard({ name_en: "Samsung Galaxy A55 5G (Vietnam) 256/8 GB", name_fa: null })).toEqual({
      core: "galaxya55",
      network: 5,
      storageGb: 256,
      ramGb: 8,
      condition: "new",
    });
    expect(parseCard({ name_en: "Xiaomi Poco F6 Pro 5G 1T/16 GB", name_fa: null })?.storageGb).toBe(1024);
    expect(parseCard({ name_en: "Apple iPhone 13 Dual Sim (Stock) 128 GB", name_fa: null })?.condition).toBe("stock");
    expect(parseCard({ name_en: "Apple iPhone 13 (Active) 128 GB", name_fa: null })?.condition).toBe("activated");
    expect(parseCard({ name_en: "Apple iPhone 13 Dual Sim (Not Active) 128 GB", name_fa: null })).toMatchObject({
      core: "iphone13",
      condition: "new",
    });
    expect(parseCard({ name_en: null, name_fa: "قاب" })).toBeNull();
    // Accessories never pass, even with a model name in English.
    expect(
      parseCard({ name_en: "Samsung Galaxy A55 Case 256/8 GB", name_fa: "قاب گوشی سامسونگ Galaxy A55" }),
    ).toBeNull();
    expect(
      parseCard({ name_en: "Charger Apple 20W", name_fa: "شارژر اپل توان 20 وات" }),
    ).toBeNull();
  });

  it("counts sellers from Torob's wording", () => {
    expect(shopCount("در ۲۰۴ فروشگاه")).toBe(204);
    expect(shopCount("در دیجی پویا")).toBe(1);
    expect(shopCount(null)).toBe(0);
  });

  it("matches only new listings of the same model and configuration", () => {
    const cards = [
      card("Samsung Galaxy A55 5G (Stock) 256/8 GB", 79_000_000),
      card("Samsung Galaxy A56 5G 256/8 GB", 119_000_000),
      card("Samsung Galaxy A55 5G (Vietnam) 128/8 GB", 98_000_000),
      card("Samsung Galaxy A55 5G (Vietnam) 256/8 GB", 108_000_000),
      card("Samsung Galaxy A55 5G 256/8 GB", 99_000_000, "در فروشگاه تک"),
    ];
    const hit = matchVariant(
      { brand: "Samsung", name: "Galaxy A55 5G", storageGb: 256, ramGb: 8 },
      cards,
    );
    // The single-shop outlier loses to the price many sellers carry.
    expect(hit?.price_toman).toBe(108_000_000);
    expect(
      matchVariant({ brand: "Samsung", name: "Galaxy A55 5G", storageGb: 512, ramGb: 8 }, cards),
    ).toBeNull();
  });

  it("never matches a 4G listing to a 5G model", () => {
    const cards = [card("Xiaomi Redmi Note 13 Pro 4G 256/8 GB", 103_000_000)];
    expect(
      matchVariant({ brand: "Redmi", name: "Note 13 Pro 5G", storageGb: 256, ramGb: 8 }, cards),
    ).toBeNull();
    expect(
      matchVariant({ brand: "Redmi", name: "13", storageGb: 256, ramGb: 8 }, [
        card("Xiaomi Redmi 13 4G 256/8 GB", 68_900_000),
      ]),
    ).not.toBeNull();
  });

  it("prefixes sub-brands the way Torob names them", () => {
    const hit = matchVariant(
      { brand: "Poco", name: "X6 Pro", storageGb: 512, ramGb: 12 },
      [card("Xiaomi Poco X6 Pro 5G 512/12 GB", 149_000_000)],
    );
    expect(hit).not.toBeNull();
  });

  it("uses an exact-model photo even when the storage does not match", () => {
    const image = matchModelImage(
      { brand: "Samsung", name: "Galaxy A55 5G" },
      [card("Samsung Galaxy A55 5G 128/8 GB", 98_000_000)],
    );
    expect(image?.image).toContain("image.torob.com");
  });

  it("uses a Persian-only Torob title but rejects a longer model name", () => {
    const persianOnly = {
      ...card("", 98_000_000),
      name_en: null,
      name_fa: "گوشی اپل iPhone 13 mini حافظه ۵۱۲ گیگابایت",
    } satisfies TorobCard;
    expect(
      matchModelImage({ brand: "Apple", name: "iPhone 13 mini" }, [persianOnly]),
    ).not.toBeNull();
    expect(
      matchModelImage({ brand: "Samsung", name: "Galaxy S24" }, [
        { ...persianOnly, name_fa: "گوشی سامسونگ Galaxy S24 Ultra حافظه ۲۵۶ گیگابایت" },
      ]),
    ).toBeNull();
  });

  it("asks Torob's CDN for a resized image", () => {
    expect(resizedImage("https://image.torob.com/base/images/a/b/c.webp", 280)).toBe(
      "https://image.torob.com/base/images/a/b/c.webp_/280x280.jpg",
    );
    expect(resizedImage(null, 280)).toBeNull();
  });
});
