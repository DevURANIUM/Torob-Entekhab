import { existsSync, closeSync, openSync } from "node:fs";
// Prisma's Windows schema engine can fail to create a missing SQLite file.
if (!existsSync("prisma/demo.db")) closeSync(openSync("prisma/demo.db", "a"));
