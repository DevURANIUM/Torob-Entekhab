import { z } from "zod";

// A committed snapshot of what Torob listed for each catalog variant, written
// by `npm run torob:sync`. The app works offline from it; product pages then
// refresh offers live when torob-mcp is reachable.
export const torobListingSchema = z
  .object({
    prk: z.string(),
    url: z.url().startsWith("https://torob.com/"),
    detailsUrl: z.string().nullable(),
    name: z.string(),
    priceToman: z.number().int().positive(),
    shops: z.number().int().min(0),
    image: z.string().nullable(),
  })
  .strict();

export const torobSnapshotSchema = z
  .object({
    fetchedAt: z.iso.datetime(),
    endpoint: z.string(),
    models: z.record(
      z.string(),
      z.object({ image: z.string().nullable(), query: z.string() }).strict(),
    ),
    variants: z.record(z.string(), torobListingSchema),
  })
  .strict();

export type TorobSnapshot = z.infer<typeof torobSnapshotSchema>;
export type TorobListing = z.infer<typeof torobListingSchema>;

export const emptySnapshot: TorobSnapshot = {
  fetchedAt: new Date(0).toISOString(),
  endpoint: "",
  models: {},
  variants: {},
};
