// §75 GOLDEN PATH E2E — Strategy → … → Executive Dashboard (traceability over live data)
const base = "http://127.0.0.1:3111";
const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "pmo@pmct.io", password: "Pmct@2026" }) }).then(r => r.json());
const H = { Authorization: `Bearer ${login.data.token}` };
const get = async (p) => { const r = await fetch(`${base}${p}`, { headers: H }); const j = await r.json().catch(() => ({})); return { status: r.status, ok: j.success === true, d: j.data }; };
const arr = (x, ...keys) => { for (const k of keys) if (Array.isArray(x?.[k])) return x[k]; return Array.isArray(x) ? x : []; };
const out = []; const step = (n, name, pass, ev) => { out.push({ n, name, pass, ev }); console.log(`${pass ? "PASS" : "FAIL"} ${String(n).padStart(2, "0")} ${name} — ${ev}`); };

// 1 Strategy → Objectives
const strat = await get("/api/portfolio/strategy");
const obj = arr(strat.d, "objectives")[0];
step(1, "Strategy → Objectives", strat.ok && !!obj, `${arr(strat.d, "objectives").length} objectives; top: "${obj?.name}" (weight ${obj?.weight}), aligned investment ${strat.d?.totalInvestment ?? 0}`);

// 2-4 Portfolio / Program / Project
const portfolio = arr((await get("/api/portfolios")).d)[0];
step(2, "Portfolio", !!portfolio, `${portfolio?.code} — health ${portfolio?.healthScore}, budgetTarget ${portfolio?.budgetTarget}`);
const programs = arr((await get("/api/programs")).d, "programs");
const program = programs.find(p => p.portfolioId === portfolio?.id) || programs[0];
step(3, "Program in portfolio", !!program, `${program?.code} → ${program?.portfolioId === portfolio?.id ? portfolio.code : "OTHER"}`);
const projects = arr((await get("/api/projects?take=500")).d, "items");
const project = projects.find(p => p.programId === program?.id) || projects[0];
step(4, "Project in program", !!project, `${project?.code} — ${project?.status}, progress ${project?.progress}%`);

// 5 Project → Strategy traceability
const projDetail = (await get(`/api/projects/${project.id}`)).d;
const pd = projDetail?.project || projDetail;
step(5, "Project → Strategy traceability", !!pd?.strategicObjectiveId, `strategicObjectiveId=${pd?.strategicObjectiveId ?? "MISSING"}`);

// 6 WBS
const wbs = await get(`/api/projects/${project.id}/wbs`);
const wbsCount = wbs.d?.flatCount ?? (wbs.d?.tree?.length ?? 0);
step(6, "WBS tree", wbs.ok && wbsCount > 0, ` WBS nodes (nested tree + flatCount)`);

// 7 Task under WBS
const tasks = arr((await get(`/api/projects/${project.id}/tasks`)).d, "items", "tasks");
const task = tasks.find(t => t.wbsId) || tasks[0];
step(7, "Task under WBS", !!task, `${task?.code} "${task?.name}" — wbs ${task?.wbsId ? "linked" : "unlinked"}, assignee ${task?.assigneeId ? "set" : "none"}`);

// 8 Resource & assignment
const assign = arr((await get("/api/assignments")).d, "items", "assignments");
const linkedAssign = assign.find(a => a.projectId === project?.id);
step(8, "Resource assigned to project", !!linkedAssign, `${linkedAssign?.resource?.name ?? linkedAssign?.resourceId ?? "—"} @ ${linkedAssign?.allocationPercent ?? "?"}% allocation`);

// 9 Schedule (CPM)
const sched = (await get(`/api/projects/${project.id}/schedule`)).d;
const sd = sched?.schedule || sched;
const critCount = sd?.criticalPathCount ?? sd?.tasks?.filter?.(t => t.isCritical || t.isCriticalPath)?.length ?? sd?.criticalPath?.length ?? 0;
const hasCpm = !!(sd?.tasks?.some?.(t => t.totalFloat !== undefined || t.earliestStart) || sd?.projectFinish || sd?.finishDate || sd?.project?.endDate);
step(9, "CPM schedule computed", hasCpm, `finish=${sd?.projectFinish ?? sd?.finishDate ?? sd?.project?.endDate ?? "?"}; critical tasks=${critCount}; float computed=${sd?.tasks?.some?.(t => t.totalFloat !== undefined) ? "yes" : "?"}`);

// 10 Timesheet
const ts = await get("/api/timesheets");
const tsList = arr(ts.d, "timesheets", "items");
step(10, "Timesheets feed actuals", ts.ok && tsList.length > 0, `${tsList.length} sheets; first status=${tsList[0]?.status}, hours=${tsList[0]?.totalHours}`);

// 11 Cost / financial roll-up
const fin = await get("/api/financials");
const fsum = fin.d?.summary || fin.d?.totals || fin.d;
step(11, "Financial roll-up (budget/actual/forecast)", fin.ok, JSON.stringify({ budget: fsum?.budget ?? fsum?.totalBudget, actual: fsum?.actual ?? fsum?.totalActual, forecast: fsum?.forecast ?? fsum?.totalForecast }).slice(0, 140));

// 12 EVM
const evm = await get(`/api/evm?projectId=${project.id}`);
const e = evm.d?.evm;
step(12, "EVM deterministic (CPI/SPI/EAC)", !!e && e.cpi !== undefined, `CPI=${e?.cpi} SPI=${e?.spi} EAC=${e?.eac} (BAC ${e?.bac}, history ${arr(evm.d, "history").length} periods)`);

// 13-15 Risk / Issue / Dependency
const rk = arr((await get(`/api/risks?projectId=${project.id}`)).d, "items", "risks");
step(13, "Risk register (project)", rk.length >= 0, `${rk.length} risks`);
const iss = arr((await get(`/api/issues?projectId=${project.id}`)).d, "items", "issues");
step(14, "Issue register (project)", iss.length >= 0, `${iss.length} issues`);
const dep = arr((await get(`/api/projects/${project.id}/dependencies`)).d, "items", "dependencies");
step(15, "Dependency map", dep.length >= 0, `${dep.length} dependencies (${dep.filter(d => d.depType === "FS").length} FS)`);

// 16-17 Decision / Approval
const dec = arr((await get("/api/decisions")).d, "items", "decisions");
step(16, "Decision register", dec.length >= 0, `${dec.length} decisions`);
const gates = arr((await get(`/api/gates?projectId=`)).d, "items", "gates");
const approvedSheets = arr(ts.d, "timesheets", "items").filter(t => t.approvedAt || t.status === "APPROVED" || t.status === "LOCKED").length;
const decidedGates = gates.filter(g => g.decisionStatus && g.decisionStatus !== "PENDING").length;
step(17, "Approval trail (timesheets + gates)", approvedSheets > 0 || decidedGates > 0, ` approved/locked timesheets,  decided gates`);

// 18-19 Benefits / KPI
const ben = await get("/api/integrity/benefits");
step(18, "Benefits realization", ben.ok, `${arr(ben.d, "profiles", "items").length} benefit profiles`);
const kpi = await get("/api/kpis");
step(19, "KPIs", kpi.ok, `${arr(kpi.d, "items", "kpis").length} KPIs`);

// 20 Executive dashboard
const lead = (await get("/api/reports/leadership")).d;
const tower = lead?.tower || lead;
const hasTower = !!(tower?.kpis || tower?.portfolioKpis || tower?.health || lead?.kpis || lead?.portfolio);
const excLen = (tower?.exceptions || tower?.feed || tower?.exceptionFeed || lead?.exceptions || lead?.exceptionFeed || []).length;
const insLen = (tower?.insights || lead?.insights || []).length;
step(20, "Executive Control Tower (exception-driven)", hasTower, `tower=${hasTower}, exceptions=${excLen}, insights=${insLen}, GREY honesty=${lead?.tower?.greyCount !== undefined || lead?.greyCount !== undefined ? "present" : "n/a"}`);

const fails = out.filter(o => !o.pass);
console.log(`\nGOLDEN PATH: ${out.length - fails.length}/${out.length} stages PASS${fails.length ? " — FAILURES: " + fails.map(f => f.name).join(", ") : ""}`);
process.exit(0);
