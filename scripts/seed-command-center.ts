// PM CONTROL TOWER — Command Center v3.0 seed
// Adds demo data for: clients, invoices, expenses, epics/sprints/story points,
// RFIs, daily logs, punch list, feedback + votes, roadmap, docs, board threads,
// proofing rounds + annotations. Idempotent: skips if already seeded.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
const dateOnly = (d: Date) => new Date(d.toISOString().slice(0, 10));

async function main() {
  const projects = await db.project.findMany({ select: { id: true, code: true, name: true }, take: 20 });
  if (!projects.length) {
    console.log("No projects found — run the base seed first (bun scripts/seed.ts).");
    return;
  }
  const byCode = (prefix: string) => projects.find((p) => p.code.startsWith(prefix)) || projects[0];
  const software = byCode("APP") || projects[0];
  const infra = projects.find((p) => p.id !== software.id) || projects[0];

  // ---------- Clients & invoices ----------
  const clientCount = await db.client.count();
  if (clientCount === 0) {
    const client = await db.client.create({
      data: {
        name: "Northwind Industrial",
        organization: "Northwind Group",
        contactName: "Elena Marsh",
        email: "elena.marsh@northwind.example",
        status: "ACTIVE",
        notes: "Strategic account — capital expansion program.",
      },
    });
    const client2 = await db.client.create({
      data: {
        name: "Helios Renewables",
        organization: "Helios Energy GmbH",
        contactName: "Tomas Kern",
        email: "t.kern@helios.example",
        status: "PROSPECT",
      },
    });
    await db.project.update({ where: { id: infra.id }, data: { clientId: client.id } }).catch(() => undefined);

    await db.invoice.create({
      data: {
        clientId: client.id, projectId: infra.id, number: `INV-${new Date().getFullYear()}-0001`,
        status: "SENT", issueDate: daysFromNow(-14), dueDate: daysFromNow(16), taxPct: 5,
        subtotal: 148_000, taxAmount: 7_400, total: 155_400,
        lines: {
          create: [
            { description: "Milestone 3 — structural works complete", quantity: 1, unitPrice: 98_000, total: 98_000 },
            { description: "Site supervision — March", quantity: 200, unitPrice: 250, total: 50_000 },
          ],
        },
      },
    });
    await db.invoice.create({
      data: {
        clientId: client.id, projectId: infra.id, number: `INV-${new Date().getFullYear()}-0002`,
        status: "PAID", issueDate: daysFromNow(-45), dueDate: daysFromNow(-15), paidAt: daysFromNow(-10),
        subtotal: 82_500, taxAmount: 4_125, total: 86_625,
        lines: { create: [{ description: "Milestone 2 — foundation package", quantity: 1, unitPrice: 82_500, total: 82_500 }] },
      },
    });
    await db.invoice.create({
      data: {
        clientId: client2.id, number: `INV-${new Date().getFullYear()}-0003`,
        status: "DRAFT", issueDate: daysFromNow(-1), dueDate: daysFromNow(29),
        subtotal: 12_000, taxAmount: 0, total: 12_000,
        lines: { create: [{ description: "Feasibility study — phase 1", quantity: 1, unitPrice: 12_000, total: 12_000 }] },
      },
    });
    console.log("  ✓ clients + invoices");
  }

  const expenseCount = await db.expense.count();
  if (expenseCount === 0) {
    await db.expense.createMany({
      data: [
        { projectId: infra.id, category: "MATERIALS", description: "Ready-mix concrete — L4 pour", amount: 24_800, expenseDate: daysFromNow(-6), vendorName: "MetroMix", status: "APPROVED" },
        { projectId: infra.id, category: "EQUIPMENT", description: "Tower crane rental — weekly", amount: 6_400, expenseDate: daysFromNow(-3), vendorName: "LiftAll", status: "PENDING", billable: false },
        { projectId: software.id, category: "SOFTWARE", description: "Cloud spend — production", amount: 3_150, expenseDate: daysFromNow(-2), vendorName: "CloudCorp", status: "APPROVED" },
        { projectId: software.id, category: "TRAVEL", description: "User research trip — 2 pax", amount: 1_980, expenseDate: daysFromNow(-10), vendorName: "TransAir", status: "REIMBURSED" },
      ],
    });
    console.log("  ✓ expenses");
  }

  // ---------- Agile: epics, sprints, story points ----------
  const epicCount = await db.epic.count();
  let epicIds: { id: string; key: string }[] = [];
  if (epicCount === 0) {
    const e1 = await db.epic.create({ data: { projectId: software.id, code: "PAY", name: "Payments hardening", colorHex: "#dc2626", status: "IN_PROGRESS", businessValue: "Reduce failed transactions by 30%" } });
    const e2 = await db.epic.create({ data: { projectId: software.id, code: "ONB", name: "Onboarding redesign", colorHex: "#2563eb", status: "OPEN", businessValue: "Lift activation rate 5pp" } });
    epicIds = [{ id: e1.id, key: "PAY" }, { id: e2.id, key: "ONB" }];
    console.log("  ✓ epics");
  } else {
    epicIds = (await db.epic.findMany({ select: { id: true, code: true } })).map((e) => ({ id: e.id, key: e.code }));
  }

  const sprintCount = await db.sprint.count();
  if (sprintCount === 0) {
    await db.sprint.createMany({
      data: [
        { projectId: software.id, name: "Sprint 12 — Checkout flow", goal: "Ship idempotent payment retries", status: "ACTIVE", startDate: daysFromNow(-5), endDate: daysFromNow(9) },
        { projectId: software.id, name: "Sprint 11 — Auth refactor", goal: "SSO for enterprise tenants", status: "COMPLETED", startDate: daysFromNow(-26), endDate: daysFromNow(-12) },
        { projectId: software.id, name: "Sprint 13 — Backlog grooming", goal: "Onboarding analytics baseline", status: "PLANNED", startDate: daysFromNow(9), endDate: daysFromNow(23) },
      ],
    });
    console.log("  ✓ sprints");
  }

  const tasks = await db.task.findMany({ where: { projectId: software.id }, select: { id: true, code: true, name: true }, take: 40 });
  const agileTasks = await db.task.count({ where: { projectId: software.id, storyPoints: { gt: 0 } } });
  if (tasks.length && agileTasks === 0) {
    const sprints = await db.sprint.findMany({ where: { projectId: software.id }, select: { id: true, name: true, status: true } });
    const active = sprints.find((s) => s.status === "ACTIVE");
    const done = sprints.find((s) => s.status === "COMPLETED");
    const points = [3, 5, 8, 2, 5, 3, 13, 5, 8, 2];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const sprint = i < 4 ? active : i < 8 ? done : null;
      const epic = i % 2 === 0 ? epicIds[0]?.id : epicIds[1]?.id;
      await db.task.update({
        where: { id: t.id },
        data: { storyPoints: points[i % points.length], sprintId: sprint?.id ?? null, epicId: epic ?? null, backlogOrder: i },
      });
    }
    // refresh committed points
    for (const s of sprints) {
      const agg = await db.task.aggregate({ where: { sprintId: s.id }, _sum: { storyPoints: true } });
      await db.sprint.update({ where: { id: s.id }, data: { committedPoints: agg._sum.storyPoints ?? 0 } });
    }
    console.log("  ✓ story points / sprint & epic assignment");
  }

  // ---------- Field ops: RFIs, daily logs, punch list ----------
  const rfiCount = await db.rfi.count();
  if (rfiCount === 0) {
    await db.rfi.createMany({
      data: [
        { projectId: infra.id, rfiCode: "RFI-0001", subject: "Rebar spacing at gridline C-4", discipline: "STRUCTURAL", priority: "HIGH", status: "OPEN", askedByName: "Site Engineer", dateOpened: daysFromNow(-9), costImpact: 4_200, scheduleImpactDays: 2 },
        { projectId: infra.id, rfiCode: "RFI-0002", subject: "Cable tray routing conflicts with duct", discipline: "MEP", priority: "MEDIUM", status: "ANSWERED", askedByName: "MEP Lead", dateOpened: daysFromNow(-15), dateAnswered: daysFromNow(-11), answer: "Reroute tray 300mm north per SK-14" },
        { projectId: infra.id, rfiCode: "RFI-0003", subject: "Finish sample approval — lobby stone", discipline: "ARCHITECTURAL", priority: "LOW", status: "OPEN", askedByName: "Site Engineer", dateOpened: daysFromNow(-3) },
      ],
    });
    console.log("  ✓ RFIs");
  }

  const logCount = await db.dailyLog.count();
  if (logCount === 0) {
    await db.dailyLog.createMany({
      data: [
        { projectId: infra.id, logDate: dateOnly(daysFromNow(-1)), weather: "Clear 29°C", crewCount: 42, workPerformed: "L4 slab pour completed; MEP rough-in started east wing", safetyIncidents: 0, createdByName: "pm.sarah" },
        { projectId: infra.id, logDate: dateOnly(daysFromNow(-2)), weather: "Rain 21°C", crewCount: 18, workPerformed: "Interior framing", delays: "Weather stand-down 4h — exterior works", safetyIncidents: 0, createdByName: "pm.sarah" },
        { projectId: infra.id, logDate: dateOnly(daysFromNow(-3)), weather: "Clear 26°C", crewCount: 37, workPerformed: "Crane erection zone 2; facade panels 30-44 installed", safetyIncidents: 0, createdByName: "pm.sarah" },
      ],
    });
    console.log("  ✓ daily logs");
  }

  const punchCount = await db.punchListItem.count();
  if (punchCount === 0) {
    await db.punchListItem.createMany({
      data: [
        { projectId: infra.id, code: "PUNCH-001", title: "Cracked tile at lobby column 2", location: "Level 1 — Lobby", severity: "MEDIUM", status: "OPEN", dueDate: daysFromNow(7) },
        { projectId: infra.id, code: "PUNCH-002", title: "Missing fire-stopping at riser penetration", location: "Level 3 — Core", severity: "HIGH", status: "IN_PROGRESS", assigneeName: "Firestop Sub", dueDate: daysFromNow(3) },
        { projectId: infra.id, code: "PUNCH-003", title: "Paint touch-ups north stair", location: "Stair N1", severity: "LOW", status: "CLOSED", closedAt: daysFromNow(-2) },
      ],
    });
    console.log("  ✓ punch list");
  }

  // ---------- Feedback + roadmap ----------
  const feedbackCount = await db.feedbackPost.count();
  if (feedbackCount === 0) {
    const p1 = await db.feedbackPost.create({ data: { title: "Bulk timesheet import from CSV", body: "Field crews submit on paper weekly — rekeying costs a day per week.", category: "FEATURE", source: "CLIENT", submittedByName: "Elena Marsh", votesCount: 0, status: "UNDER_REVIEW" } });
    const p2 = await db.feedbackPost.create({ data: { title: "Gantt: drag to reschedule", body: "Adjusting dates via forms is slow; direct drag on bars expected.", category: "UX", source: "INTERNAL", submittedByName: "pm.sarah", votesCount: 0, status: "PLANNED" } });
    const p3 = await db.feedbackPost.create({ data: { title: "Baselining an in-progress project loses baseline dates", body: "Repro: activate baseline after progress > 0.", category: "BUG", source: "INTERNAL", submittedByName: "pmo", votesCount: 0, status: "IN_PROGRESS" } });
    const voters = ["seed-1", "seed-2", "seed-3"];
    for (const [post, n] of [[p1, 3], [p2, 2], [p3, 1]] as const) {
      for (let i = 0; i < n; i++) await db.feedbackVote.create({ data: { postId: post.id, voterKey: voters[i] } });
      await db.feedbackPost.update({ where: { id: post.id }, data: { votesCount: n } });
    }
    const r1 = await db.roadmapItem.create({ data: { title: "Field mobile capture pack", description: "Offline timesheets + photo RFIs from site.", quarter: "2026-Q4", status: "COMMITTED", progress: 20, orderIndex: 1 } });
    await db.roadmapItem.create({ data: { title: "Interactive Gantt editing", quarter: "2027-Q1", status: "PLANNED", orderIndex: 2 } });
    await db.roadmapItem.create({ data: { title: "Exec Narrative AI (board pack drafts)", quarter: "2026-Q4", status: "IN_PROGRESS", progress: 55, orderIndex: 3 } });
    await db.feedbackPost.update({ where: { id: p1.id }, data: { roadmapItemId: r1.id } });
    console.log("  ✓ feedback + roadmap");
  }

  // ---------- Docs ----------
  const docCount = await db.docPage.count();
  if (docCount === 0) {
    await db.docPage.createMany({
      data: [
        {
          title: "PMO Playbook — Delivery Standards", icon: "📘", space: "GOVERNANCE", orderIndex: 1, authorName: "pmo",
          content: "# PMO Playbook\n\n## Stage gates\nEvery project passes five gates. Evidence bundles are mandatory from G2.\n\n| Gate | Focus | Owner |\n|---|---|---|\n| G1 | Business case | Sponsor |\n| G2 | Plan integrity | PMO |\n| G3 | Execution health | PM |\n\n## Reporting cadence\n- Weekly: RAID + EVM snapshot\n- Monthly: steering pack",
        },
        {
          title: "Engineering — Release Checklist", icon: "⚙️", space: "ENGINEERING", orderIndex: 2, authorName: "team.liam",
          content: "# Release Checklist\n\n- [ ] CI green on main\n- [ ] UAT cycle closed with zero CRITICAL fails\n- [ ] Runbook updated\n- [ ] Rollback tested",
        },
        {
          title: "Site Diary Guidance", icon: "🏗️", space: "CONSTRUCTION", orderIndex: 3, authorName: "pm.sarah",
          content: "# Site Diary\nLog daily before 18:00. Crew counts drive EVM labor actuals.\n\n**Delays** must name cause and duration — they feed the change-control evidence pack.",
        },
      ],
    });
    console.log("  ✓ docs");
  }

  // ---------- Message boards ----------
  const threadCount = await db.boardThread.count();
  if (threadCount === 0) {
    const t1 = await db.boardThread.create({
      data: { projectId: infra.id, title: "📣 Weekly site walk moves to Thursday 09:00", category: "ANNOUNCEMENTS", createdById: "seed", createdByName: "pm.sarah", pinned: true, replyCount: 1, lastActivityAt: daysFromNow(-1) },
    });
    await db.comment.create({
      data: { entityType: "BOARD_THREAD", entityId: t1.id, authorName: "Elena Marsh", body: "Works for us — client side will join for the facade review." },
    });
    await db.boardThread.create({
      data: { projectId: software.id, title: "Sprint 12 goal — keep scope fixed, no mid-sprint adds", category: "STANDUP", createdById: "seed", createdByName: "team.liam", replyCount: 0, lastActivityAt: daysFromNow(-2) },
    });
    console.log("  ✓ message boards");
  }

  // ---------- Proofing ----------
  const proofCount = await db.proofRound.count();
  if (proofCount === 0) {
    const deliverables = await db.deliverable.findMany({ select: { id: true, name: true }, take: 10 });
    const videoDeliv = deliverables.find((d) => /video|film|promo/i.test(d.name)) || deliverables[0];
    if (videoDeliv) {
      const round = await db.proofRound.create({
        data: { deliverableId: videoDeliv.id, roundNumber: 1, versionLabel: "v2", status: "IN_REVIEW", dueDate: daysFromNow(5), reviewerName: "Elena Marsh", notes: "Check brand mark timing and legal disclaimers." },
      });
      await db.proofAnnotation.createMany({
        data: [
          { roundId: round.id, locator: "00:42", comment: "Logo is off-brand — use the 2026 mark.", authorName: "Elena Marsh" },
          { roundId: round.id, locator: "01:15", comment: "Disclaimer must stay on screen ≥ 4s (legal).", authorName: "Legal", resolved: true },
        ],
      });
      console.log("  ✓ proofing");
    }
  }

  console.log("Command Center v3.0 seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
