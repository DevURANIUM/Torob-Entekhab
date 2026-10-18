import { catalog } from "../lib/data/catalog";
import { dataQuality } from "../lib/data/quality";
import { writeFileSync } from "node:fs";
const report = dataQuality(catalog, new Date("2026-09-25T00:00:00Z"));
writeFileSync("docs/data-quality.json", JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      ...report,
      byField: report.byField.filter((x) =>
        [
          "chipset",
          "screenSizeInches",
          "weightGrams",
          "ipRating",
          "securityYears",
        ].includes(x.key),
      ),
    },
    null,
    2,
  ),
);
