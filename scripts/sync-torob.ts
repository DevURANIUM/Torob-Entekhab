// Refreshes lib/data/torob-snapshot.json from torob-mcp: one search per catalog
// model (plus a storage-specific search for variants the first one missed).
//
//   npm run torob:sync                       # hosted endpoint, rate limited
//   TOROB_MCP_URL=http://127.0.0.1:3333/mcp npm run torob:sync
//
// Raw responses are cached in .cache/torob for a day so a rerun after a bot
// challenge resumes instead of starting over. Run `npm run db:setup` after.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { dataset } from "../lib/data/catalog";
import {
  DEFAULT_TOROB_MCP_URL,
  TorobError,
  searchProducts,
} from "../lib/torob/client";
import { matchModelImage, matchVariant, shopCount } from "../lib/torob/match";
import type { TorobCard } from "../lib/torob/types";
import {
  TorobSnapshot,
  torobSnapshotSchema,
} from "../lib/torob/snapshot";

const brandFa: Record<string, string> = {
  Apple: "اپل",
  Samsung: "سامسونگ",
  Xiaomi: "شیائومی",
  Poco: "شیائومی Poco",
  Redmi: "شیائومی Redmi",
  Honor: "آنر",
  Nothing: "ناتینگ",
  OnePlus: "وان پلاس",
  Motorola: "موتورولا",
  Google: "گوگل",
};
const cacheDir = join(process.cwd(), ".cache", "torob");
const out = join(process.cwd(), "lib", "data", "torob-snapshot.json");
const DAY = 24 * 3600 * 1000;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const delay = Number(process.env.TOROB_SYNC_DELAY_MS ?? 3200);
const offline = process.env.TOROB_SYNC_OFFLINE === "1";
const fresh = process.env.TOROB_SYNC_FRESH === "1";

// After Torob keeps challenging through one cooldown, the rest of the run
// reads only the cache and the snapshot keeps earlier rows for the rest.
// TOROB_SYNC_CACHE_ONLY=1 rebuilds the snapshot from cached responses alone.
let blocked = process.env.TOROB_SYNC_CACHE_ONLY === "1";
class Blocked extends Error {}

async function search(query: string): Promise<TorobCard[]> {
  mkdirSync(cacheDir, { recursive: true });
  const file = join(
    cacheDir,
    `${createHash("sha1").update(query).digest("hex").slice(0, 16)}.json`,
  );
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8"));
    // TOROB_SYNC_FRESH=1 refetches today's prices; the cache is then only a
    // fallback once Torob starts challenging the run.
    if (Date.now() - cached.at < DAY && (!fresh || blocked || offline))
      return cached.products;
  }
  if (offline) throw new Blocked("not cached; offline refresh keeps the prior snapshot");
  if (blocked) throw new Blocked("not cached; Torob is challenging this run");
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await searchProducts(query, { limit: 24 });
      writeFileSync(file, JSON.stringify({ ...r, at: Date.now(), query }));
      await pause(delay);
      return r.products;
    } catch (e) {
      if (!(e instanceof TorobError) || e.kind !== "rate-limit") throw e;
      if (attempt >= 1) {
        blocked = true;
        throw new Blocked("Torob is still challenging; rerun later to fill in");
      }
      console.warn(`  Torob asked us to wait; pausing 5 minutes…`);
      await pause(5 * 60 * 1000);
    }
  }
}

async function main() {
  const previous: TorobSnapshot | null = existsSync(out)
    ? torobSnapshotSchema.parse(JSON.parse(readFileSync(out, "utf8")))
    : null;
  const snapshot: TorobSnapshot = {
    // A cache-only pass improves image coverage but must not claim it fetched
    // a new market price. Keep the last live timestamp in that mode.
    fetchedAt: offline && previous ? previous.fetchedAt : new Date().toISOString(),
    endpoint: process.env.TOROB_MCP_URL || DEFAULT_TOROB_MCP_URL,
    models: {},
    variants: {},
  };
  let failures = 0;
  for (const model of dataset.models) {
    const variants = dataset.variants.filter((v) => v.modelId === model.id);
    const query = `گوشی ${brandFa[model.brand]} ${model.name}`;
    try {
      const cards = await search(query);
      const pick = (v: (typeof variants)[number], pool: TorobCard[]) =>
        matchVariant(
          {
            brand: model.brand,
            name: model.name,
            storageGb: v.storageGb,
            ramGb: v.ramGb,
          },
          pool,
        );
      const found = new Map(variants.map((v) => [v.id, pick(v, cards)]));
      for (const v of variants.filter((v) => !found.get(v.id))) {
        try {
          const more = await search(`${query} ${v.storageGb} گیگابایت`);
          found.set(v.id, pick(v, more));
        } catch (e) {
          // A missing storage-specific lookup just leaves that variant unpriced.
          if (!(e instanceof Blocked)) throw e;
        }
      }
      for (const [id, card] of found) {
        if (card) {
          snapshot.variants[id] = {
            prk: card.prk,
            url: card.url,
            detailsUrl: card.details_url ?? null,
            name: card.name_fa ?? card.name_en ?? model.name,
            priceToman: card.price_toman!,
            shops: shopCount(card.shop_name),
            image: card.image,
          };
        } else if (previous?.variants[id]) {
          // Search ranking changes frequently. Keep a known, timestamped
          // listing until a live refresh can replace it instead of silently
          // dropping a phone from the app after a partial response.
          snapshot.variants[id] = previous.variants[id];
        }
      }
      const bestExactVariant = [...found.values()]
        .filter((c): c is TorobCard => Boolean(c?.image))
        .sort((a, b) => shopCount(b.shop_name) - shopCount(a.shop_name))[0];
      snapshot.models[model.id] = {
        // A model photo is useful even when this catalog does not carry the
        // exact storage/RAM result that Torob currently lists. Price rows stay
        // exact; the looser match is deliberately image-only.
        image:
          bestExactVariant?.image ??
          matchModelImage(model, cards)?.image ??
          previous?.models[model.id]?.image ??
          null,
        query,
      };
      const matched = variants.filter((v) => found.get(v.id)).length;
      console.log(
        `${model.id.padEnd(28)} ${matched}/${variants.length} variants`,
      );
    } catch (e) {
      failures++;
      console.warn(`${model.id}: ${e instanceof Error ? e.message : e}`);
      if (previous?.models[model.id])
        snapshot.models[model.id] = previous.models[model.id];
      for (const v of variants)
        if (previous?.variants[v.id])
          snapshot.variants[v.id] = previous.variants[v.id];
    }
  }
  torobSnapshotSchema.parse(snapshot);
  writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `\n${Object.keys(snapshot.variants).length}/${dataset.variants.length} variants priced on Torob, ` +
      `${Object.values(snapshot.models).filter((m) => m.image).length}/${dataset.models.length} models with an image` +
      (failures ? `, ${failures} models kept from the previous snapshot` : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
