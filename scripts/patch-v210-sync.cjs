const fs = require("fs");
let s = fs.readFileSync("src/app/api/integrations/sync/route.ts", "utf8");
// Remove the whole "existing task" lookup block (4 lines) using line filtering
const lines = s.split("\n");
const cleaned = lines.filter((l) => {
  if (l.includes("const existing = await db.task.findFirst")) return false;
  if (l.includes("if (existing) updated += 1; else created += 1;")) return false;
  if (l.trim() === "created += 1;") return true; // keep the one inside else branch removed below
  return true;
});
// rebuild: replace the created/updated tally block
let out = [];
for (let i = 0; i < cleaned.length; i++) {
  const l = cleaned[i];
  if (l.includes("let created = 0, updated = 0;")) { out.push("        let created = 0;"); continue; }
  if (l.trim() === "created += 1;") { continue; } // remove double-increment leftover
  if (l.includes("would-be new")) {
    out.push('        result = { ok: true, detail: "Pulled " + items.length + " external items", pulled: items.length };');
    continue;
  }
  out.push(l);
}
fs.writeFileSync("src/app/api/integrations/sync/route.ts", out.join("\n"));
console.log("cleaned:", !out.join("\n").includes("existing"), "| tally fixed:", out.join("\n").includes('detail: "Pulled " + items.length'));
