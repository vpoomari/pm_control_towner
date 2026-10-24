// PM CONTROL TOWER — Online SQLite snapshot via VACUUM INTO (safe while the app runs).
// Usage: npx tsx scripts/vacuum-db-snapshot.ts <output-path>

import { PrismaClient } from "@prisma/client";

const out = process.argv[2];
if (!out) { console.error("usage: tsx scripts/vacuum-db-snapshot.ts <output.db>"); process.exit(1); }

const db = new PrismaClient();

async function main() {
  await db.$queryRawUnsafe(`VACUUM INTO '${out.replace(/\\/g, "/")}'`);
  console.log("snapshot written:", out);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
