const fs = require("fs");
let s = fs.readFileSync("prisma/schema.prisma", "utf8");
// 1) StrategicObjective model
if (!s.includes("model StrategicObjective")) {
  s += `
model StrategicObjective {
  id          String   @id @default(cuid())
  name        String
  description String?
  weight      Float    @default(20)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  projects    Project[]
  @@index([order])
}
`;
}
// 2) Project.strategicObjectiveId
const projStart = s.indexOf("model Project {");
const projEnd = s.indexOf("\nmodel ", projStart + 5);
let blk = s.slice(projStart, projEnd);
if (!blk.includes("strategicObjectiveId")) {
  blk = blk.replace("  customFieldsJson String?", "  customFieldsJson String?\n  strategicObjectiveId String?");
  s = s.slice(0, projStart) + blk + s.slice(projEnd);
}
fs.writeFileSync("prisma/schema.prisma", s);
console.log("strategic model:", s.includes("model StrategicObjective"), "| project link:", blk.includes("strategicObjectiveId"));
