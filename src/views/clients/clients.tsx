"use client";
// PM CONTROL TOWER — Clients & Billing (Command Center v3.0 — ActiveCollab/Teamwork/Paymo analog)
// Client register, invoices with line items, expenses, and profitability roll-ups.

import { useMemo, useState } from "react";
import { useApi, api } from "@/lib/client";
import { PageHeader, StatCard, SectionCard, LoadingBlock, ErrorBlock, EmptyState, StatusChip, SearchInput, DataTable, ConfirmButton } from "@/components/pmct/kit";
import { ProjectPicker, useStoredProjectId } from "@/views/plan/shared/ProjectPicker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDate, money, round2 } from "@/lib/constants";
import { Briefcase, FileText, Receipt, Plus, Send, BadgeDollarSign } from "lucide-react";

interface ClientRow {
  id: string; name: string; organization: string | null; contactName: string | null; email: string | null;
  status: string; projectCount: number; invoiceCount: number; invoicedTotal: number; paidTotal: number; outstandingTotal: number;
}
interface InvoiceLine { id?: string; description: string; quantity: number; unitPrice: number; total?: number }
interface InvoiceRow {
  id: string; number: string; status: string; currency: string; issueDate: string | null; dueDate: string | null;
  subtotal: number; taxAmount: number; total: number;
  client: { id: string; name: string } | null; project: { id: string; code: string; name: string } | null;
  lines: InvoiceLine[];
}
interface ExpenseRow {
  id: string; description: string; category: string; amount: number; billable: boolean; status: string;
  expenseDate: string; vendorName: string | null; project: { id: string; code: string; name: string } | null;
}

function NewInvoiceDialog({ clients, defaultProjectId, onCreated }: {
  clients: { id: string; name: string }[]; defaultProjectId: string | null; onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [number, setNumber] = useState(`INV-${new Date().getFullYear()}-001`);
  const [taxPct, setTaxPct] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [busy, setBusy] = useState(false);
  const projects = useApi<{ items: { id: string; code: string; name: string }[] }>(open ? "/api/projects?take=500" : null);

  const subtotal = round2(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0));
  const tax = round2(subtotal * ((Number(taxPct) || 0) / 100));

  const submit = async () => {
    if (!clientId) { toast.error("Select a client"); return; }
    const clean = lines.filter((l) => l.description.trim() && Number(l.unitPrice) >= 0);
    if (!clean.length) { toast.error("Add at least one line item with a description"); return; }
    setBusy(true);
    try {
      await api.post("/api/invoices", {
        clientId, projectId: projectId && projectId !== "none" ? projectId : null, number, status: "DRAFT", taxPct: Number(taxPct) || 0,
        dueDate: dueDate || null,
        lines: clean.map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) || 0 })),
      });
      toast.success("Invoice created as draft");
      setOpen(false);
      setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />New invoice</Button>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Client</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Project (optional)</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No project link" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project link</SelectItem>
                  {(projects.data?.items || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Invoice number</label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Line items</label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLines((l) => [...l, { description: "", quantity: 1, unitPrice: 0 }])}>+ Add line</Button>
            </div>
            <div className="space-y-2 mt-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_100px_30px] gap-2 items-center">
                  <Input placeholder="Description" value={l.description} onChange={(e) => setLines((arr) => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="h-8 text-xs" />
                  <Input type="number" min="0" step="0.5" value={l.quantity} onChange={(e) => setLines((arr) => arr.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} className="h-8 text-xs" aria-label="Quantity" />
                  <Input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => setLines((arr) => arr.map((x, j) => j === i ? { ...x, unitPrice: Number(e.target.value) } : x))} className="h-8 text-xs" aria-label="Unit price" />
                  <button className="text-slate-300 hover:text-red-500 text-xs" onClick={() => setLines((arr) => arr.filter((_, j) => j !== i))} aria-label="Remove line">✕</button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-slate-600">Tax %</label>
              <Input type="number" min="0" max="100" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} className="mt-1 h-8" />
            </div>
            <div className="text-right col-span-2">
              <p className="text-xs text-slate-500">Subtotal {money(subtotal)} · Tax {money(tax)}</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{money(subtotal + tax)}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsView() {
  const [tab, setTab] = useState("clients");
  const [projectId, setProjectId] = useStoredProjectId();
  const [search, setSearch] = useState("");

  const clients = useApi<{ clients: ClientRow[]; summary: { total: number; active: number; invoiced: number } }>("/api/clients");
  const invoices = useApi<{ invoices: InvoiceRow[]; summary: { invoiced: number; paid: number; outstanding: number; overdue: number } }>("/api/invoices");
  const expenses = useApi<{ expenses: ExpenseRow[]; summary: { amount: number; billable: number; pending: number } }>("/api/expenses");

  const [clientRows, invoiceRows, expenseRows] = [clients.data?.clients || [], invoices.data?.invoices || [], expenses.data?.expenses || []];
  const q = search.toLowerCase();
  const filteredClients = useMemo(() => clientRows.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.organization || "").toLowerCase().includes(q)), [clientRows, q]);
  const filteredInvoices = useMemo(() => invoiceRows.filter((i) => !q || i.number.toLowerCase().includes(q) || (i.client?.name || "").toLowerCase().includes(q)), [invoiceRows, q]);
  const filteredExpenses = useMemo(() => expenseRows.filter((e) => !q || e.description.toLowerCase().includes(q)), [expenseRows, q]);

  const markStatus = async (inv: InvoiceRow, status: string) => {
    try {
      await api.patch(`/api/invoices/${inv.id}`, { status, ...(status === "PAID" ? { paidAt: new Date().toISOString() } : {}) });
      toast.success(`${inv.number} → ${status}`);
      invoices.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const approveExpense = async (exp: ExpenseRow, status: string) => {
    try {
      await api.patch(`/api/expenses/${exp.id}`, { status });
      toast.success(`Expense ${status.toLowerCase()}`);
      expenses.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const anyLoading = clients.loading || invoices.loading || expenses.loading;
  if (clients.error) return <ErrorBlock message={clients.error} onRetry={clients.refetch} />;
  if (invoices.error) return <ErrorBlock message={invoices.error} onRetry={invoices.refetch} />;
  if (expenses.error) return <ErrorBlock message={expenses.error} onRetry={expenses.refetch} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients & Billing"
        subtitle="Client register, milestone-tied invoicing, and expense reporting — profitability feeds the same financial core as budgeting and EVM."
        breadcrumb={["Home", "Commercial", "Clients & Billing"]}
        actions={
          <div className="flex items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-44" />
            <NewInvoiceDialog clients={clientRows.map((c) => ({ id: c.id, name: c.name }))} defaultProjectId={projectId} onCreated={invoices.refetch} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Clients" value={clients.data?.summary.active ?? "—"} sub={`${clients.data?.summary.total ?? 0} total`} icon={<Briefcase className="h-4 w-4" />} />
        <StatCard label="Invoiced" value={money(invoices.data?.summary.invoiced || 0)} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Outstanding" value={money(invoices.data?.summary.outstanding || 0)} sub={`${invoices.data?.summary.overdue ?? 0} overdue invoices`} tone={(invoices.data?.summary.overdue || 0) > 0 ? "warn" : "default"} icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Billable expenses" value={money(expenses.data?.summary.billable || 0)} sub={`${expenses.data?.summary.pending ?? 0} awaiting approval`} icon={<BadgeDollarSign className="h-4 w-4" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="clients" className="text-xs">Clients</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <SectionCard title="Client register" description="Revenue concentration and portal access per client." bodyClass="p-0">
            {anyLoading ? <LoadingBlock /> : filteredClients.length === 0 ? (
              <EmptyState title="No clients yet" description="Clients appear here once created. Seed data includes a demo client." />
            ) : (
              <DataTable
                keyField="id"
                rows={filteredClients as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "name", header: "Client", render: (r) => (
                    <div><p className="font-medium text-slate-800">{String(r.name)}</p><p className="text-[11px] text-slate-400">{String(r.organization || "")}</p></div>
                  ) },
                  { key: "contactName", header: "Contact", render: (r) => <span className="text-xs">{String(r.contactName || "—")}</span> },
                  { key: "status", header: "Status", render: (r) => <StatusChip status={String(r.status)} /> },
                  { key: "projectCount", header: "Projects", className: "text-center" },
                  { key: "invoicedTotal", header: "Invoiced", render: (r) => <span className="tabular-nums">{money(Number(r.invoicedTotal))}</span> },
                  { key: "paidTotal", header: "Paid", render: (r) => <span className="tabular-nums text-emerald-700">{money(Number(r.paidTotal))}</span> },
                  { key: "outstandingTotal", header: "Outstanding", render: (r) => <span className="tabular-nums text-amber-700">{money(Number(r.outstandingTotal))}</span> },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <SectionCard title="Invoices" description="Draft → Sent → Paid lifecycle with server-computed totals." bodyClass="p-0">
            {anyLoading ? <LoadingBlock /> : filteredInvoices.length === 0 ? (
              <EmptyState title="No invoices" description="Create the first invoice with the New invoice button." />
            ) : (
              <DataTable
                keyField="id"
                rows={filteredInvoices as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "number", header: "Number", render: (r) => <span className="font-mono text-[11px] font-semibold text-blue-700">{String(r.number)}</span> },
                  { key: "client", header: "Client", render: (r) => <span className="text-xs">{String((r.client as InvoiceRow["client"])?.name || "—")}</span> },
                  { key: "project", header: "Project", render: (r) => <span className="text-xs text-slate-500">{String((r.project as InvoiceRow["project"])?.code || "—")}</span> },
                  { key: "issueDate", header: "Issued", render: (r) => <span className="text-xs">{fmtDate(r.issueDate as string | null)}</span> },
                  { key: "dueDate", header: "Due", render: (r) => <span className="text-xs">{fmtDate(r.dueDate as string | null)}</span> },
                  { key: "total", header: "Total", render: (r) => <span className="font-semibold tabular-nums">{money(Number(r.total), (r.currency as string) || "USD")}</span> },
                  { key: "status", header: "Status", render: (r) => <StatusChip status={String(r.status)} /> },
                  { key: "actions", header: "", render: (r) => {
                    const inv = r as unknown as InvoiceRow;
                    if (inv.status === "DRAFT") return (
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => markStatus(inv, "SENT")}><Send className="h-3 w-3" />Send</Button>
                    );
                    if (inv.status === "SENT" || inv.status === "OVERDUE") return (
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => markStatus(inv, "PAID")}>Mark paid</Button>
                    );
                    return <span className="text-[11px] text-slate-400">—</span>;
                  } },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <SectionCard title="Expenses" description="Billable cost capture tied to projects; approvals roll into project actuals." bodyClass="p-0">
            {anyLoading ? <LoadingBlock /> : filteredExpenses.length === 0 ? (
              <EmptyState title="No expenses logged" description="Expenses captured here feed profitability views." />
            ) : (
              <DataTable
                keyField="id"
                rows={filteredExpenses as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "expenseDate", header: "Date", render: (r) => <span className="text-xs">{fmtDate(r.expenseDate as string)}</span> },
                  { key: "description", header: "Description", render: (r) => <span className="font-medium text-slate-700 text-xs">{String(r.description)}</span> },
                  { key: "project", header: "Project", render: (r) => <span className="text-xs text-slate-500">{String((r.project as ExpenseRow["project"])?.code || "—")}</span> },
                  { key: "category", header: "Category", render: (r) => <span className="text-xs">{String(r.category)}</span> },
                  { key: "amount", header: "Amount", render: (r) => <span className="font-semibold tabular-nums">{money(Number(r.amount))}</span> },
                  { key: "billable", header: "Billable", render: (r) => r.billable ? <span className="text-emerald-600 text-xs font-medium">Yes</span> : <span className="text-slate-400 text-xs">No</span> },
                  { key: "status", header: "Status", render: (r) => <StatusChip status={String(r.status)} /> },
                  { key: "actions", header: "", render: (r) => {
                    const exp = r as unknown as ExpenseRow;
                    if (exp.status === "PENDING") return (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => approveExpense(exp, "APPROVED")}>Approve</Button>
                        <ConfirmButton onConfirm={() => approveExpense(exp, "REJECTED")} title="Reject expense?" confirmLabel="Reject">
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-red-600">Reject</Button>
                        </ConfirmButton>
                      </div>
                    );
                    return <span className="text-[11px] text-slate-400">—</span>;
                  } },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
