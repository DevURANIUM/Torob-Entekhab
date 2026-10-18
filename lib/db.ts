import { PrismaClient } from "@prisma/client";
import { Phone } from "./domain";
import {
  PriceSource,
  composeCatalog,
  priceSource,
  torobSnapshot,
  withTorobPrices,
} from "./data/catalog";
import { validateDataset } from "./data/schema";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL ?? "file:./demo.db",
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
/**
 * The bundled Torob snapshot is merged over the database rows, so prices and
 * photos are current even before `npm run db:setup` is rerun.
 */
export async function getProducts(
  source: PriceSource = priceSource(),
): Promise<Phone[]> {
  const [models, variants, prices] = await Promise.all([
    db.phoneModel.findMany(),
    db.phoneVariant.findMany(),
    db.priceSnapshot.findMany(),
  ]);
  return composeCatalog(
    withTorobPrices(
      validateDataset({
        models: models.map((m) => m.data),
        variants: variants.map((v) => v.data),
        prices: prices.map((p) => p.data),
      }),
      torobSnapshot,
    ),
    source,
  );
}
