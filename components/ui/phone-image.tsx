"use client";
import { useState } from "react";
import Image from "next/image";
import type { PhoneModel } from "@/lib/data/schema";
import { resizedImage } from "@/lib/torob/match";

const sizes = { sm: 72, md: 168, lg: 320 } as const;

/**
 * Product photo from Torob, resized by Torob's own CDN to the slot it fills.
 * Falls back to the full-size original, then to a drawn silhouette, so a
 * missing or blocked image never leaves a broken icon.
 */
export function PhoneImage({
  model,
  name,
  size = "md",
}: {
  model: Pick<PhoneModel, "image" | "brand">;
  name: string;
  size?: keyof typeof sizes;
}) {
  const px = sizes[size];
  const original = model.image.primary;
  const candidates = [
    resizedImage(original, px * 2 > 560 ? 560 : px * 2),
    original,
    model.image.alternate,
  ].filter((x): x is string => Boolean(x));
  const [failed, setFailed] = useState<string[]>([]);
  const src = candidates.find((c) => !failed.includes(c));
  return (
    <div className={`phone-image ${size}`} data-brand={model.brand}>
      {src ? (
        <Image
          key={src}
          src={src}
          alt={name}
          width={px}
          height={px}
          unoptimized
          loading={size === "lg" ? "eager" : "lazy"}
          onError={() => setFailed((f) => [...f, src])}
        />
      ) : (
        <PhoneSilhouette kind={model.image.fallback} brand={model.brand} />
      )}
    </div>
  );
}

function PhoneSilhouette({
  kind,
  brand,
}: {
  kind: PhoneModel["image"]["fallback"];
  brand: string;
}) {
  const wide = kind === "fold";
  return (
    <svg viewBox="0 0 120 160" role="img" aria-label={`تصویر نمادین ${brand}`}>
      <rect
        x={wide ? 14 : 30}
        y="8"
        width={wide ? 92 : 60}
        height={kind === "flip" ? 72 : 144}
        rx="12"
        fill="var(--tile-ink)"
        opacity=".12"
      />
      <rect
        x={wide ? 19 : 35}
        y="14"
        width={wide ? 82 : 50}
        height={kind === "flip" ? 60 : 132}
        rx="8"
        fill="none"
        stroke="var(--tile-ink)"
        strokeOpacity=".35"
        strokeWidth="1.5"
      />
      <text
        x="60"
        y={kind === "flip" ? 50 : 86}
        textAnchor="middle"
        fontSize="13"
        fill="var(--tile-ink)"
        opacity=".55"
        fontFamily="inherit"
      >
        {brand}
      </text>
    </svg>
  );
}
