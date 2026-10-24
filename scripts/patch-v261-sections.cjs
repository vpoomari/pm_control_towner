const fs = require("fs");
let v = fs.readFileSync("src/views/intelligence/reporting.tsx", "utf8");

// 1) Replace Report Builder placeholder with real builder
const rbStart = v.indexOf('{(section === "Report Builder"');
const rbEnd = v.indexOf("</SectionCard>", rbStart) + "</SectionCard>".length;
if (rbStart < 0) throw new Error("RB placeholder not found");
const rbReplacement = [
  '      {section === "Report Builder" && (',
  '        <div className="space-y-4">',
  '          <SectionCard title="Report Builder — create custom reports" description="Add components to build your report. Each component pulls from live operational data.">',
  '            <div className="space-y-3 mb-4">',
  '              <div className="space-y-1"><Label>Report name *</Label><Input className="h-9 w-64" value={newRptName} onChange={(e) => setNewRptName(e.target.value)} placeholder="My Custom Report" /></div>',
  '              <div className="space-y-2">',
  '                {newComponents.map((c, i) => (',
  '                  <div key={i} className="flex items-center gap-2 text-sm rounded-md border border-slate-200 px-3 py-2">',
  '                    <Badge variant="outline" className="border-blue-200 text-blue-700">{c.type}</Badge>',
  '                    <span className="flex-1 text-slate-700">{c.title}</span>',
  '                    <Button variant="ghost" size="sm" onClick={() => setNewComponents(newComponents.filter((_, j) => j !== i))}>Remove</Button>',
  '                  </div>',
  '                ))}',
  '              </div>',
  '              <div className="flex flex-wrap gap-2">',
  '                {["kpi", "bar", "line", "pie", "table", "text", "rag", "waterfall"].map((type) => (',
  '                  <Button key={type} size="sm" variant="outline" className="text-xs h-7"',
  '                    onClick={() => setNewComponents([...newComponents, { type, title: type.toUpperCase() + " component" }])}>',
  '                    + {type}',
  '                  </Button>',
  '                ))}',
  '              </div>',
  '              <Button disabled={busy || !newRptName.trim() || newComponents.length === 0} onClick={() => void saveCustomReport()}>',
  '                <Save className="h-4 w-4 mr-1.5" />Save custom report',
  '              </Button>',
  '            </div>',
  '          </SectionCard>',
  '          {customRpts.data && customRpts.data.customReports.length > 0 && (',
  '            <SectionCard title="My custom reports" description="Reports you created with the builder">',
  '              <div className="space-y-1.5">',
  '                {customRpts.data.customReports.map((c) => (',
  '                  <div key={c.id} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">',
  '                    <span className="flex-1 font-medium text-slate-700">{c.name}</span>',
  '                    <Badge variant="outline" className="border-slate-200 text-slate-500">{c.category}</Badge>',
  '                    <Button variant="ghost" size="sm" onClick={() => void deleteCustom(c.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>',
  '                  </div>',
  '                ))}',
  '              </div>',
  '            </SectionCard>',
  '          )}',
  '        </div>',
  '      )}',
].join("\n");
v = v.slice(0, rbStart) + rbReplacement + v.slice(rbEnd);

// 2) Replace Subscriptions placeholder
const subStart = v.indexOf('section === "Subscriptions"');
if (subStart > -1) {
  const secStart = v.lastIndexOf("{(section === \"Subscriptions\"", subStart);
  const secEnd = v.indexOf("</SectionCard>", secStart) + "</SectionCard>".length;
  if (secStart > -1 && secEnd > secStart) {
    const subReplacement = [
      '      {section === "Subscriptions" && (',
      '        !subsData.data ? <LoadingBlock /> : (',
      '          <div className="space-y-3">',
      '            <SectionCard title="Available templates — subscribe to receive scheduled copies">',
      '              <div className="space-y-1.5">',
      '                {lib.data ? lib.data.templates.slice(0, 20).map((t) => {',
      '                  const sub = subsData.data.subscriptions.find((s) => s.templateId === t.id);',
      '                  return (',
      '                    <div key={t.id} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">',
      '                      <span className="flex-1 font-medium text-slate-700 truncate">{t.name}</span>',
      '                      <Badge variant="outline" className="border-slate-200 text-slate-400">{t.category}</Badge>',
      '                      {sub ? (',
      '                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">{sub.frequency}</Badge>',
      '                      ) : (',
      '                        <Button size="sm" variant="outline" onClick={() => void subscribe(t.id)}>Subscribe</Button>',
      '                      )}',
      '                      {sub && <Button size="sm" variant="ghost" onClick={() => void unsubscribe(sub.id)}>Unsub</Button>}',
      '                    </div>',
      '                  );',
      '                }) : <EmptyState title="Library not loaded" />}',
      '              </div>',
      '            </SectionCard>',
      '          </div>',
      '        )',
      '      )}',
    ].join("\n");
    v = v.slice(0, secStart) + subReplacement + v.slice(secEnd);
  }
}

// 3) Replace Administration placeholder
const adminStart = v.indexOf('section === "Administration"');
if (adminStart > -1) {
  const secStart = v.lastIndexOf("{(section === \"Administration\"", adminStart);
  const secEnd = v.indexOf("</SectionCard>", secStart) + "</SectionCard>".length;
  if (secStart > -1 && secEnd > secStart) {
    const adminReplacement = [
      '      {section === "Administration" && (',
      '        !customRpts.data ? <LoadingBlock /> : (',
      '          <SectionCard title="Report Administration" description="Manage custom reports — archive, delete and audit">',
      '            {customRpts.data.customReports.length === 0 ? <EmptyState title="No custom reports" /> : (',
      '              <div className="space-y-1.5">',
      '                {customRpts.data.customReports.map((c) => (',
      '                  <div key={c.id} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">',
      '                    <span className="flex-1 font-medium text-slate-700">{c.name}</span>',
      '                    <Badge variant="outline" className="border-slate-200 text-slate-500">{c.category}</Badge>',
      '                    <Button variant="ghost" size="sm" onClick={() => void deleteCustom(c.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>',
      '                  </div>',
      '                ))}',
      '              </div>',
      '            )}',
      '          </SectionCard>',
      '        )',
      '      )}',
    ].join("\n");
    v = v.slice(0, secStart) + adminReplacement + v.slice(secEnd);
  }
}

fs.writeFileSync("src/views/intelligence/reporting.tsx", v);
console.log("all sections replaced:", v.includes("Report Builder") && v.includes("subscribe("));
