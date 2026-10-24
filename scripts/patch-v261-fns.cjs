const fs = require("fs");
let v = fs.readFileSync("src/views/intelligence/reporting.tsx", "utf8");
if (v.includes("saveCustomReport")) { console.log("already added"); process.exit(0); }
// Insert before the return statement
const anchor = "  return (";
const idx = v.indexOf(anchor);
if (idx < 0) throw new Error("return anchor missing");
const fns = [
  "  const saveCustomReport = async () => {",
  "    if (!newRptName.trim() || newComponents.length === 0) { toast.error(\"Name and at least one component required\"); return; }",
  "    setBusy(true);",
  "    try {",
  "      await api.post(\"/api/reporting/custom\", { name: newRptName.trim(), components: newComponents });",
  "      toast.success(\"Custom report created\"); setNewRptName(\"\"); setNewComponents([]); customRpts.refetch();",
  "    } catch (e) { toast.error(e instanceof Error ? e.message : \"Save failed\"); } finally { setBusy(false); }",
  "  };",
  "  const deleteCustom = async (id: string) => {",
  "    try { await api.del(\"/api/reporting/custom?id=\" + id); toast.success(\"Deleted\"); customRpts.refetch(); }",
  "    catch (e) { toast.error(e instanceof Error ? e.message : \"Delete failed\"); }",
  "  };",
  "  const subscribe = async (templateId: string) => {",
  "    try { await api.post(\"/api/reporting/subs\", { templateId }); toast.success(\"Subscribed\"); subsData.refetch(); }",
  "    catch (e) { toast.error(e instanceof Error ? e.message : \"Subscribe failed\"); }",
  "  };",
  "  const unsubscribe = async (id: string) => {",
  "    try { await api.del(\"/api/reporting/subs?id=\" + id); toast.success(\"Unsubscribed\"); subsData.refetch(); }",
  "    catch (e) { toast.error(e instanceof Error ? e.message : \"Failed\"); }",
  "  };",
  "",
].join("\n");
v = v.slice(0, idx) + fns + "\n" + v.slice(idx);
fs.writeFileSync("src/views/intelligence/reporting.tsx", v);
console.log("fns added:", v.includes("saveCustomReport"));
