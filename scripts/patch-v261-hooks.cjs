const fs = require("fs");
let v = fs.readFileSync("src/views/intelligence/reporting.tsx", "utf8");

// 1) Add custom reports + subscriptions data hooks
if (!v.includes("customRpts")) {
  v = v.replace(
    'const schedData = useApi',
    `const customRpts = useApi<{ customReports: { id: string; name: string; category: string; componentsJson: string }[] }>(section === "Report Builder" || section === "Administration" ? "/api/reporting/custom" : null);
  const subsData = useApi<{ subscriptions: { id: string; templateId: string; frequency: string; format: string }[]; templates: { id: string; name: string; category: string }[] }>(section === "Subscriptions" ? "/api/reporting/subs" : null);
  const schedData = useApi`
  );
}

// 2) Add newReport state for builder
if (!v.includes("newComponents")) {
  v = v.replace(
    'const [busy, setBusy] = useState(false);',
    `const [busy, setBusy] = useState(false);
  const [newComponents, setNewComponents] = useState<{ type: string; title: string; dataSource?: string }[]>([]);
  const [newRptName, setNewRptName] = useState("");`
  );
}

// 3) Add builder + subscription functions
if (!v.includes("saveCustomReport")) {
  v = v.replace(
    "  const projectSelect = (",
    `  const saveCustomReport = async () => {
    if (!newRptName.trim() || newComponents.length === 0) { toast.error("Name and at least one component required"); return; }
    setBusy(true);
    try {
      await api.post("/api/reporting/custom", { name: newRptName.trim(), components: newComponents });
      toast.success("Custom report created"); setNewRptName(""); setNewComponents([]); customRpts.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); } finally { setBusy(false); }
  };
  const deleteCustom = async (id: string) => {
    try { await api.del("/api/reporting/custom?id=" + id); toast.success("Deleted"); customRpts.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };
  const subscribe = async (templateId: string) => {
    try { await api.post("/api/reporting/subs", { templateId }); toast.success("Subscribed"); subsData.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Subscribe failed"); }
  };
  const unsubscribe = async (id: string) => {
    try { await api.del("/api/reporting/subs?id=" + id); toast.success("Unsubscribed"); subsData.refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const projectSelect = (`
  );
}

fs.writeFileSync("src/views/intelligence/reporting.tsx", v);
console.log("hooks added:", v.includes("saveCustomReport"), v.includes("customRpts"), v.includes("subsData"));
