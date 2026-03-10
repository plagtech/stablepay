"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { toast } from "sonner";
import { format } from "date-fns";
import { CHAINS, PRIMARY_CHAINS, getExplorerTxUrl, getChainDisplay } from "@/lib/contracts/chains";
import { executeBatchPayment, getUSDCBalance } from "@/lib/contracts/spraay";
import { ethers } from "ethers";
import type { Company, Recipient, PayRun, ChainId, EmployerTab } from "@/types";

// ── Icons (inline SVGs) ──────────────────────────────────
const Icons = {
  overview: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  team: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  pay: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  fund: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  external: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  wallet: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><circle cx="18" cy="14" r="1"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

// ── Status Badge ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    paused: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
    scheduled: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    removed: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

// ── Chain Badge ──────────────────────────────────────────
function ChainBadge({ chain }: { chain: string }) {
  const display = getChainDisplay(chain as ChainId);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-white/5"
      style={{ background: display.color + "18", color: display.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: display.color }} />
      {display.name}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────
interface EmployerDashboardProps {
  initialCompany: Company | null;
  initialRecipients: Recipient[];
  initialPayRuns: PayRun[];
}

export default function EmployerDashboard({
  initialCompany,
  initialRecipients,
  initialPayRuns,
}: EmployerDashboardProps) {
  const [tab, setTab] = useState<EmployerTab>("overview");
  const [company, setCompany] = useState(initialCompany);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [payRuns, setPayRuns] = useState(initialPayRuns);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const supabase = createBrowserSupabase();

  const activeRecipients = recipients.filter((r) => r.status === "active");
  const pendingRecipients = recipients.filter((r) => r.status === "pending");
  const totalMonthlyPayroll = activeRecipients.reduce((s, r) => s + Number(r.pay_amount), 0);

  // Fetch USDC balance when wallet connected
  useEffect(() => {
    if (isConnected && address && company?.default_chain) {
      getUSDCBalance(company.default_chain as ChainId, address).then(setUsdcBalance);
    }
  }, [isConnected, address, company?.default_chain]);

  // ── Add Recipient ──────────────────────────────────────
  const [newRecipient, setNewRecipient] = useState({
    name: "", email: "", role: "", pay_amount: "",
  });

  const handleAddRecipient = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: company.id,
          ...newRecipient,
          pay_amount: parseFloat(newRecipient.pay_amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh recipients
      const { data: updated } = await supabase
        .from("recipients")
        .select("*")
        .eq("company_id", company.id)
        .neq("status", "removed")
        .order("created_at", { ascending: false });

      if (updated) setRecipients(updated);
      setNewRecipient({ name: "", email: "", role: "", pay_amount: "" });
      setShowAddModal(false);
      toast.success(`Invite sent to ${newRecipient.email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add recipient");
    } finally {
      setLoading(false);
    }
  };

  // ── Run Payroll ────────────────────────────────────────
  const handleRunPayroll = async () => {
    if (!company || !isConnected) return;
    setLoading(true);
    try {
      // 1. Create pay run via API
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: company.id }),
      });
      const payRunData = await res.json();
      if (!res.ok) throw new Error(payRunData.error);

      // 2. Group by chain and execute batch payments
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();

      // For simplicity, group all on the default chain
      const walletsWithAmounts = payRunData.recipients.filter(
        (r: any) => r.wallet_address
      );

      if (walletsWithAmounts.length === 0) {
        throw new Error("No recipients have wallet addresses set up yet");
      }

      const result = await executeBatchPayment({
        chain: (company.default_chain as ChainId) || "base",
        recipients: walletsWithAmounts.map((r: any) => r.wallet_address),
        amounts: walletsWithAmounts.map((r: any) => r.amount),
        signer,
      });

      if (!result.success) throw new Error(result.error || "Transaction failed");

      // 3. Update pay run with tx hash
      await fetch("/api/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pay_run_id: payRunData.pay_run_id,
          tx_hash: result.txHash,
          status: "completed",
        }),
      });

      // Refresh pay runs
      const { data: updatedRuns } = await supabase
        .from("pay_runs")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (updatedRuns) setPayRuns(updatedRuns);
      setShowPayrollModal(false);
      toast.success(`Payroll complete! ${result.recipientCount} recipients paid.`);
    } catch (err: any) {
      toast.error(err.message || "Payroll failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // ── Navigation ─────────────────────────────────────────
  const tabs: { id: EmployerTab; label: string; icon: JSX.Element }[] = [
    { id: "overview", label: "Overview", icon: Icons.overview },
    { id: "team", label: "Team", icon: Icons.team },
    { id: "payRuns", label: "Pay Runs", icon: Icons.pay },
    { id: "funding", label: "Funding", icon: Icons.fund },
    { id: "settings", label: "Settings", icon: Icons.settings },
  ];

  // ── No Company? Onboarding ─────────────────────────────
  if (!company) {
    return <CompanyOnboarding onCreated={setCompany} />;
  }

  return (
    <div className="min-h-screen bg-surface-0 font-display">
      {/* Top Bar */}
      <header className="border-b border-border bg-surface-1/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold text-sm">
              S
            </div>
            <span className="text-lg font-bold tracking-tight text-text-primary">
              Stable<span className="text-brand-primary">Pay</span>
            </span>
            <span className="text-xs text-text-dim ml-2 hidden sm:inline">/ {company.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <button onClick={() => disconnect()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-xs text-text-muted hover:border-border-light transition-colors">
                {Icons.wallet}
                <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-semibold glow-primary"
              >
                {Icons.wallet} Connect Wallet
              </button>
            )}
            <button onClick={handleSignOut} className="p-2 rounded-lg text-text-dim hover:text-text-muted transition-colors">
              {Icons.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 border-r border-border min-h-[calc(100vh-64px)] p-4 hidden md:block">
          <div className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-2 border border-transparent"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-md border-t border-border flex md:hidden z-40">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                tab === t.id ? "text-brand-primary" : "text-text-dim"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 pb-24 md:pb-6">
          {tab === "overview" && (
            <OverviewTab
              company={company}
              activeRecipients={activeRecipients}
              pendingRecipients={pendingRecipients}
              payRuns={payRuns}
              totalMonthlyPayroll={totalMonthlyPayroll}
              usdcBalance={usdcBalance}
              isConnected={isConnected}
              onRunPayroll={() => setShowPayrollModal(true)}
              onAddRecipient={() => { setShowAddModal(true); setTab("team"); }}
            />
          )}
          {tab === "team" && (
            <TeamTab
              recipients={recipients}
              onAdd={() => setShowAddModal(true)}
              supabase={supabase}
              companyId={company.id}
              setRecipients={setRecipients}
            />
          )}
          {tab === "payRuns" && (
            <PayRunsTab
              payRuns={payRuns}
              onRunPayroll={() => setShowPayrollModal(true)}
              isConnected={isConnected}
            />
          )}
          {tab === "funding" && (
            <FundingTab
              company={company}
              usdcBalance={usdcBalance}
              isConnected={isConnected}
              address={address}
              connectors={connectors}
              connect={connect}
            />
          )}
          {tab === "settings" && (
            <SettingsTab
              company={company}
              supabase={supabase}
              setCompany={setCompany}
            />
          )}
        </main>
      </div>

      {/* Add Recipient Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} title="Add Team Member">
          <div className="space-y-4">
            <Input label="Full Name" value={newRecipient.name} onChange={(v) => setNewRecipient((p) => ({ ...p, name: v }))} placeholder="Jane Smith" />
            <Input label="Email" type="email" value={newRecipient.email} onChange={(v) => setNewRecipient((p) => ({ ...p, email: v }))} placeholder="jane@company.com" />
            <Input label="Role / Title" value={newRecipient.role} onChange={(v) => setNewRecipient((p) => ({ ...p, role: v }))} placeholder="Senior Developer" />
            <Input label="Monthly Pay (USD)" type="number" value={newRecipient.pay_amount} onChange={(v) => setNewRecipient((p) => ({ ...p, pay_amount: v }))} placeholder="5000" />
            <button
              onClick={handleAddRecipient}
              disabled={loading || !newRecipient.name || !newRecipient.email || !newRecipient.pay_amount}
              className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Sending..." : <>{Icons.send} Send Invite</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Run Payroll Modal */}
      {showPayrollModal && (
        <Modal onClose={() => setShowPayrollModal(false)} title="Run Payroll">
          <div className="space-y-4">
            <div className="bg-surface-3 rounded-xl p-4 border border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Recipients</span>
                <span className="font-semibold">{activeRecipients.length}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Total Amount</span>
                <span className="font-semibold">${totalMonthlyPayroll.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Spraay Fee (0.3%)</span>
                <span className="font-semibold">${(totalMonthlyPayroll * 0.003).toFixed(2)}</span>
              </div>
              <div className="border-t border-border mt-3 pt-3 flex justify-between text-sm">
                <span className="text-text-muted font-semibold">Net Total</span>
                <span className="font-bold text-brand-primary">${(totalMonthlyPayroll * 1.003).toFixed(2)}</span>
              </div>
            </div>
            {activeRecipients.length === 0 ? (
              <p className="text-sm text-text-dim text-center py-2">No active recipients. Add team members and have them accept their invite first.</p>
            ) : !isConnected ? (
              <p className="text-sm text-amber-400 text-center py-2">Connect your wallet to run payroll.</p>
            ) : (
              <button
                onClick={handleRunPayroll}
                disabled={loading}
                className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : <>{Icons.send} Execute Payroll</>}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── TAB: OVERVIEW ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
function OverviewTab({
  company, activeRecipients, pendingRecipients, payRuns, totalMonthlyPayroll,
  usdcBalance, isConnected, onRunPayroll, onAddRecipient,
}: any) {
  const lastPayRun = payRuns[0];
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{company.name}</h1>
          <p className="text-sm text-text-muted mt-1">Payroll Dashboard</p>
        </div>
        <button
          onClick={onRunPayroll}
          disabled={!isConnected || activeRecipients.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-40"
        >
          {Icons.send} Run Payroll
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Team" value={activeRecipients.length} sub={`${pendingRecipients.length} pending`} />
        <StatCard label="Monthly Payroll" value={`$${totalMonthlyPayroll.toLocaleString()}`} sub="in USDC" />
        <StatCard label="Wallet Balance" value={usdcBalance !== null ? `$${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"} sub={isConnected ? "USDC" : "Not connected"} />
        <StatCard label="Pay Runs" value={payRuns.length} sub={lastPayRun ? `Last: ${format(new Date(lastPayRun.created_at), "MMM d")}` : "None yet"} />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button onClick={onAddRecipient} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-3 border border-border text-sm font-medium text-text-muted hover:text-text-primary hover:border-border-light transition-all">
              {Icons.plus} Add Team Member
            </button>
            <button onClick={onRunPayroll} disabled={!isConnected} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-3 border border-border text-sm font-medium text-text-muted hover:text-text-primary hover:border-border-light transition-all disabled:opacity-40">
              {Icons.send} Run Payroll Now
            </button>
          </div>
        </div>

        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-3">Recent Pay Runs</h3>
          {payRuns.length === 0 ? (
            <p className="text-sm text-text-dim py-4 text-center">No pay runs yet</p>
          ) : (
            <div className="space-y-2">
              {payRuns.slice(0, 3).map((pr: PayRun) => (
                <div key={pr.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-3 border border-border">
                  <div>
                    <p className="text-xs font-semibold">${Number(pr.total_amount).toLocaleString()}</p>
                    <p className="text-[11px] text-text-dim">{format(new Date(pr.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-dim">{pr.recipient_count} people</span>
                    <StatusBadge status={pr.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── TAB: TEAM ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════
function TeamTab({ recipients, onAdd, supabase, companyId, setRecipients }: any) {
  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("recipients").update({ status }).eq("id", id);
    const { data } = await supabase
      .from("recipients").select("*").eq("company_id", companyId).neq("status", "removed").order("created_at", { ascending: false });
    if (data) setRecipients(data);
    toast.success(`Recipient ${status}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Team</h2>
          <p className="text-sm text-text-muted mt-0.5">{recipients.length} members</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white font-bold text-sm glow-primary">
          {Icons.plus} Add Member
        </button>
      </div>

      {recipients.length === 0 ? (
        <div className="bg-surface-2 border border-border rounded-2xl p-12 text-center">
          <p className="text-text-muted text-sm mb-4">No team members yet. Add your first employee or contractor.</p>
          <button onClick={onAdd} className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold glow-primary">
            {Icons.plus} Add First Member
          </button>
        </div>
      ) : (
        <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-[11px] uppercase tracking-wider text-text-dim font-semibold">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-1 text-right">Pay</div>
            <div className="col-span-2">Chain</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1"></div>
          </div>
          {recipients.map((r: Recipient) => (
            <div key={r.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-border/50 items-center hover:bg-surface-3/30 transition-colors">
              <div className="col-span-3">
                <p className="text-sm font-semibold truncate">{r.name}</p>
              </div>
              <div className="col-span-3">
                <p className="text-xs text-text-muted truncate">{r.email}</p>
              </div>
              <div className="col-span-1">
                <p className="text-xs text-text-dim truncate">{r.role || "—"}</p>
              </div>
              <div className="col-span-1 text-right">
                <p className="text-sm font-semibold font-mono">${Number(r.pay_amount).toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <ChainBadge chain={r.preferred_chain} />
              </div>
              <div className="col-span-1">
                <StatusBadge status={r.status} />
              </div>
              <div className="col-span-1 flex justify-end gap-1">
                {r.status === "active" && (
                  <button onClick={() => handleStatusChange(r.id, "paused")} className="p-1.5 rounded-lg text-text-dim hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Pause">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  </button>
                )}
                {r.status === "paused" && (
                  <button onClick={() => handleStatusChange(r.id, "active")} className="p-1.5 rounded-lg text-text-dim hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Activate">
                    {Icons.check}
                  </button>
                )}
                <button onClick={() => handleStatusChange(r.id, "removed")} className="p-1.5 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remove">
                  {Icons.x}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── TAB: PAY RUNS ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
function PayRunsTab({ payRuns, onRunPayroll, isConnected }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Pay Runs</h2>
          <p className="text-sm text-text-muted mt-0.5">{payRuns.length} total runs</p>
        </div>
        <button onClick={onRunPayroll} disabled={!isConnected} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-40">
          {Icons.send} New Pay Run
        </button>
      </div>

      {payRuns.length === 0 ? (
        <div className="bg-surface-2 border border-border rounded-2xl p-12 text-center">
          <p className="text-text-muted text-sm">No payroll runs yet. Add team members, then run your first payroll.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payRuns.map((pr: PayRun) => (
            <div key={pr.id} className="bg-surface-2 border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    {Icons.pay}
                  </div>
                  <div>
                    <p className="text-sm font-bold">${Number(pr.total_amount).toLocaleString()}</p>
                    <p className="text-[11px] text-text-dim">{format(new Date(pr.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
                <StatusBadge status={pr.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>{pr.recipient_count} recipients</span>
                {pr.chain !== "multi" && <ChainBadge chain={pr.chain} />}
                {pr.gas_fee > 0 && <span>Gas: ${Number(pr.gas_fee).toFixed(4)}</span>}
                {pr.tx_hash && (
                  <a
                    href={getExplorerTxUrl(pr.chain as ChainId, pr.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-primary hover:underline"
                  >
                    View Tx {Icons.external}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── TAB: FUNDING ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════
function FundingTab({ company, usdcBalance, isConnected, address, connectors, connect }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold tracking-tight mb-6">Funding</h2>

      <div className="bg-surface-2 border border-border rounded-2xl p-6 mb-6">
        <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-1">Wallet Balance</p>
        <p className="text-3xl font-extrabold tracking-tight">
          {usdcBalance !== null ? `$${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
          <span className="text-base text-text-muted ml-2 font-normal">USDC</span>
        </p>
        {isConnected && (
          <p className="text-xs text-text-dim mt-2 font-mono">{address}</p>
        )}
      </div>

      {!isConnected ? (
        <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-text-muted mb-4">Connect your wallet to view balance and fund payroll.</p>
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold glow-primary"
          >
            {Icons.wallet} Connect Wallet
          </button>
        </div>
      ) : (
        <div className="bg-surface-2 border border-border rounded-2xl p-6">
          <h3 className="text-sm font-bold mb-3">How to Fund</h3>
          <div className="space-y-3 text-sm text-text-muted">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p>Send USDC to your connected wallet address on <strong className="text-text-primary">{getChainDisplay(company.default_chain).name}</strong>.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <p>When you run payroll, StablePay will request approval to spend USDC via Spraay Protocol.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p>Spraay batches all payments into a single transaction — fast and cheap.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── TAB: SETTINGS ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
function SettingsTab({ company, supabase, setCompany }: any) {
  const [name, setName] = useState(company.name);
  const [schedule, setSchedule] = useState(company.pay_schedule);
  const [chain, setChain] = useState(company.default_chain);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data } = await supabase
      .from("companies")
      .update({ name, pay_schedule: schedule, default_chain: chain })
      .eq("id", company.id)
      .select()
      .single();
    if (data) setCompany(data);
    setSaving(false);
    toast.success("Settings saved");
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold tracking-tight mb-6">Settings</h2>
      <div className="bg-surface-2 border border-border rounded-2xl p-6 space-y-5 max-w-lg">
        <Input label="Company Name" value={name} onChange={setName} />
        <div>
          <label className="block text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">Pay Schedule</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-3 border border-border text-text-primary text-sm focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="semimonthly">Semimonthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">Default Chain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-3 border border-border text-text-primary text-sm focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
          >
            {PRIMARY_CHAINS.map((c: ChainId) => (
              <option key={c} value={c}>{CHAINS[c].name} {CHAINS[c].gasless ? "(Gas-Free)" : ""}</option>
            ))}
          </select>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── Company Onboarding ───────────────────────────────────
// ══════════════════════════════════════════════════════════
function CompanyOnboarding({ onCreated }: { onCreated: (c: Company) => void }) {
  const [name, setName] = useState("");
  const [chain, setChain] = useState<ChainId>("base");
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserSupabase();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("companies")
        .insert({ owner_id: user.id, name, default_chain: chain })
        .select()
        .single();

      if (error) throw error;
      onCreated(data);
      toast.success("Company created!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4 font-display">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold">S</div>
          <span className="text-2xl font-bold tracking-tight">Stable<span className="text-brand-primary">Pay</span></span>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-1 text-center">Set up your company</h2>
          <p className="text-sm text-text-muted text-center mb-6">Create your payroll account to start paying your team.</p>
          <div className="space-y-4">
            <Input label="Company Name" value={name} onChange={setName} placeholder="Acme Inc." />
            <div>
              <label className="block text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">Default Chain</label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value as ChainId)}
                className="w-full px-4 py-3 rounded-xl bg-surface-3 border border-border text-text-primary text-sm focus:outline-none focus:border-brand-primary/50 transition-colors appearance-none"
              >
                {PRIMARY_CHAINS.map((c: ChainId) => (
                  <option key={c} value={c}>{CHAINS[c].name} {CHAINS[c].gasless ? "(Gas-Free)" : ""}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || !name}
              className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Company"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── Shared Components ────────────────────────────────────
// ══════════════════════════════════════════════════════════
function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-surface-2 border border-border rounded-2xl p-5">
      <p className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">{label}</p>
      <p className="text-xl font-extrabold tracking-tight">{value}</p>
      <p className="text-[11px] text-text-dim mt-0.5">{sub}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-surface-3 border border-border text-text-primary placeholder-text-dim text-sm focus:outline-none focus:border-brand-primary/50 transition-colors"
      />
    </div>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-dim hover:text-text-primary hover:bg-surface-3 transition-colors">
            {Icons.x}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
