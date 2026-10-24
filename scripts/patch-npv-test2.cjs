const fs = require("fs");
let t = fs.readFileSync("tests/engines/integrity.test.ts", "utf8");
const marker = 'finance: NPV at 8% positive for profitable case';
const start = t.indexOf(marker);
if (start < 0) throw new Error("NPV test not found");
const startLine = t.lastIndexOf("\n", start) + 1;
const end = t.indexOf("\n});", start) + 5;
if (end < 5) throw new Error("end not found");
const replacement = [
  'test("finance: NPV at 8% matches manual discounting", () => {',
  "  const m = computeBusinessCase(bc);",
  "  const expected = -2000000 + (-100000) / 1.08 + 800000 / Math.pow(1.08, 2) + 1400000 / Math.pow(1.08, 3);",
  "  assert.ok(Math.abs(m.npv - expected) < 1, 'npv ' + m.npv + ' vs ' + expected);",
  "  assert.match(m.npvVerdict, /unattractive/); // marginal fixture: NPV negative at 8%",
  "  const good = computeBusinessCase({ ...bc, benefits: [{ name: 'Cost reduction', annualValue: 1200000, startYear: 1, growthPct: 50 }] });",
  "  assert.ok((good.npv ?? 0) > 0);",
  "  assert.match(good.npvVerdict, /attractive/);",
  "});",
].join("\n");
t = t.slice(0, startLine) + replacement + t.slice(end);
fs.writeFileSync("tests/engines/integrity.test.ts", t);
console.log("npv test rewritten ok");
