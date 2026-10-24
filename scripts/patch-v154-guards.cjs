const fs = require("fs");
let v = fs.readFileSync("src/views/integrity/integrity.tsx", "utf8");

// Make every tab guard total: render the loading block whenever data is absent
// (covers the transient {loading:false, data:null, error:null} window).
const guards = [
  ["fresh", "Computing live freshness…"],
  ["bundles", null],
  ["calib", null],
  ["scenarios", null],
  ["aiActions", null],
  ["benefits", null],
  ["dq", null],
];
let count = 0;
for (const [name] of guards) {
  const re = new RegExp(name + "\\.loading && !" + name + "\\.data \\? <LoadingBlock[^>]*/?>", "g");
  v = v.replace(re, function (m) { count += 1; return "!" + name + ".data ? <LoadingBlock />"; });
}

// runs guard in Simulations (uses runs.data && runs.data.runs.length — already safe)
fs.writeFileSync("src/views/integrity/integrity.tsx", v);
console.log("guards hardened:", count);
