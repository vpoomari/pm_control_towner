const fs = require("fs");
let s = fs.readFileSync("prisma/schema.prisma", "utf8");
if (!s.includes("optionsJson  String?")) {
  const anchor = '  baseType     String  @default("TEXT")\n  required     Boolean @default(false)\n  defaultValue String?';
  if (!s.includes(anchor)) throw new Error("anchor missing");
  s = s.replace(anchor, '  baseType     String  @default("TEXT")\n  optionsJson  String?\n  required     Boolean @default(false)\n  defaultValue String?');
  fs.writeFileSync("prisma/schema.prisma", s);
}
console.log("ok:", s.includes("optionsJson  String?"));
