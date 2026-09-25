import { evaluate } from "../lib/evaluation/run";
import { catalog } from "../lib/data/catalog";
import { writeFileSync } from "node:fs";
const report = JSON.stringify(evaluate(catalog), null, 2);
if (process.argv.includes("--save"))
  writeFileSync("docs/evaluation-report.json", report + "\n");
console.log(report);
