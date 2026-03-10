"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { toast } from "sonner";
import { format } from "date-fns";
import { getExplorerTxUrl, getChainDisplay, CHAINS, PRIMARY_CHAINS } from "@/lib/contracts/chains";
import type { Recipient, Payment, ChainId, RecipientTab } from "@/types";

// ── Icons ────────────────────────────────────────────────
const Icons = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  history: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  wallet: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><circle cx="18" cy="14" r="1"/></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  external: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D67E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
};

interface RecipientAppProps {
  initialRecipient: (Recipient & { companies?: { name: string } }) | null;
  initialPayments: Payment[];
}

export default function RecipientApp({ initialRecipient, initialPayments }: RecipientAppProps) {
  const [tab, setTab] = useState<RecipientTab>("home");
  const [recipient, setRecipient] = useState(initialRecipient);
  const [payments, setPayments] = useState(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const supabase = createBrowserSupabase();

  const totalReceived = payments
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount_net), 0);

  const companyName = (recipient as any)?.companies?.name || "Your Employer";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Update wallet address when connected
  useEffect(() => {
    if (isConnected && address && recipient && !recipient.wallet_address) {
      supabase
        .from("recipients")
        .update({ wallet_address: address, status: "active" })
        .eq("id", recipient.id)
        .select()
        .single()
        .then(({ data }) => {
          if (data) setRecipient(data);
          toast.success("Wallet connected! You're ready to receive payments.");
        });
    }
  }, [isConnected, address, recipient]);

  if (!recipient) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center font-display px-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4 text-brand-primary">
            {Icons.wallet}
          </div>
          <h2 className="text-lg font-bold mb-2">No account found</h2>
          <p className="text-sm text-text-muted mb-4">You need an invite from an employer to use StablePay.</p>
          <button onClick={handleSignOut} className="text-sm text-brand-primary font-semibold">Sign out</button>
        </div>
      </div>
    );
  }

  const tabs: { id: RecipientTab; label: string; icon: JSX.Element }[] = [
    { id: "home", label: "Home", icon: Icons.home },
    { id: "history", label: "History", icon: Icons.history },
    { id: "cashout", label: "Cash Out", icon: Icons.wallet },
    { id: "settings", label: "Settings", icon: Icons.settings },
  ];

  return (
    <div className="min-h-screen bg-surface-0 font-display max-w-[420px] mx-auto border-x border-border relative">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-border bg-surface-1/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold text-sm">S</div>
          <span className="text-base font-bold tracking-tight">Stable<span className="text-brand-primary">Pay</span></span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="text-[11px] font-mono text-text-dim bg-surface-3 px-2 py-1 rounded-md">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded-md"
            >
              Connect
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center text-white text-xs font-bold">
            {recipient.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pb-24">
        {tab === "home" && (
          <div className="px-5 pt-5">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-surface-2 to-surface-3 border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brand-primary/5" />
              <p className="text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">Total Received</p>
              <p className="text-4xl font-extrabold tracking-tight mb-1">
                ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-text-dim">USDC from {companyName}</p>

              <div className="mt-5 flex gap-3">
                <div className="flex-1 bg-surface-0/30 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">Monthly Pay</p>
                  <p className="text-sm font-bold">${Number(recipient.pay_amount).toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-surface-0/30 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">Chain</p>
                  <p className="text-sm font-bold">{getChainDisplay(recipient.preferred_chain as ChainId).name}</p>
                </div>
                <div className="flex-1 bg-surface-0/30 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">Status</p>
                  <p className="text-sm font-bold capitalize text-emerald-400">{recipient.status}</p>
                </div>
              </div>
            </div>

            {/* Recent Payments */}
            <h3 className="text-sm font-bold mb-3">Recent Payments</h3>
            {payments.length === 0 ? (
              <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
                <p className="text-sm text-text-muted">No payments yet. Your employer will run payroll soon.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="w-full flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3.5 hover:border-border-light transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                      {Icons.arrowDown}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">+${Number(p.amount_net).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-[11px] text-text-dim">{p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "Pending"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p.status === "completed" ? "bg-emerald-400" : p.status === "pending" ? "bg-amber-400" : "bg-red-400"}`} />
                      <span className="text-[11px] text-text-dim capitalize">{p.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Wallet Setup CTA */}
            {!recipient.wallet_address && (
              <div className="mt-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-amber-400 mb-1">Connect Your Wallet</h3>
                <p className="text-xs text-text-muted mb-3">Connect a wallet to start receiving payments from {companyName}.</p>
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-bold glow-primary"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="px-5 pt-5">
            <h2 className="text-lg font-extrabold tracking-tight mb-4">Payment History</h2>
            {payments.length === 0 ? (
              <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
                <p className="text-sm text-text-muted">No payment history yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPayment(p)}
                    className="w-full flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3.5 hover:border-border-light transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                      {p.status === "completed" ? Icons.check : Icons.arrowDown}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">+${Number(p.amount_net).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-white/5"
                          style={{
                            background: getChainDisplay(p.chain as ChainId).color + "18",
                            color: getChainDisplay(p.chain as ChainId).color,
                          }}
                        >
                          {getChainDisplay(p.chain as ChainId).name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-text-dim">{p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy 'at' h:mm a") : "Pending"}</p>
                        <span className={`text-[11px] capitalize ${p.status === "completed" ? "text-emerald-400" : p.status === "pending" ? "text-amber-400" : "text-red-400"}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "cashout" && (
          <div className="px-5 pt-5">
            <h2 className="text-lg font-extrabold tracking-tight mb-4">Cash Out</h2>
            <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4 text-brand-primary">
                {Icons.wallet}
              </div>
              <h3 className="text-base font-bold mb-2">Coming Soon</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-4">
                Cash out to your bank account via Coinbase or MoonPay. For now, your USDC payments land directly in your connected wallet.
              </p>
              {isConnected && (
                <div className="bg-surface-3 rounded-xl p-3 border border-border">
                  <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold mb-1">Your Wallet</p>
                  <p className="text-xs font-mono text-text-muted break-all">{address}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <RecipientSettings
            recipient={recipient}
            supabase={supabase}
            setRecipient={setRecipient}
            isConnected={isConnected}
            address={address}
            onSignOut={handleSignOut}
            connectors={connectors}
            connect={connect}
            disconnect={disconnect}
          />
        )}
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPayment(null)} />
          <div className="relative bg-surface-2 border-t border-x border-border rounded-t-2xl p-6 w-full max-w-[420px]">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="text-center mb-5">
              <p className="text-3xl font-extrabold tracking-tight text-brand-primary">
                +${Number(selectedPayment.amount_net).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-text-dim mt-1">
                {selectedPayment.paid_at ? format(new Date(selectedPayment.paid_at), "MMMM d, yyyy 'at' h:mm a") : "Pending"}
              </p>
            </div>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Gross Amount</span>
                <span className="font-semibold">${Number(selectedPayment.amount_gross).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Fee</span>
                <span className="font-semibold">-${Number(selectedPayment.fee).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Net Amount</span>
                <span className="font-bold text-brand-primary">${Number(selectedPayment.amount_net).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-text-muted">Chain</span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-white/5"
                  style={{
                    background: getChainDisplay(selectedPayment.chain as ChainId).color + "18",
                    color: getChainDisplay(selectedPayment.chain as ChainId).color,
                  }}
                >
                  {getChainDisplay(selectedPayment.chain as ChainId).name}
                </span>
              </div>
              {selectedPayment.tx_hash && (
                <a
                  href={getExplorerTxUrl(selectedPayment.chain as ChainId, selectedPayment.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-brand-primary hover:underline pt-2"
                >
                  View on Explorer {Icons.external}
                </a>
              )}
            </div>
            <button
              onClick={() => setSelectedPayment(null)}
              className="w-full py-3 rounded-xl bg-surface-3 border border-border text-text-muted font-semibold text-sm hover:border-border-light transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-surface-1/95 backdrop-blur-md border-t border-border flex z-40">
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
      </nav>
    </div>
  );
}

// ── Recipient Settings ───────────────────────────────────
function RecipientSettings({
  recipient, supabase, setRecipient, isConnected, address, onSignOut, connectors, connect, disconnect,
}: any) {
  const [chain, setChain] = useState(recipient.preferred_chain);
  const [displayMode, setDisplayMode] = useState(recipient.display_mode);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data } = await supabase
      .from("recipients")
      .update({ preferred_chain: chain, display_mode: displayMode })
      .eq("id", recipient.id)
      .select("*, companies(name)")
      .single();
    if (data) setRecipient(data);
    setSaving(false);
    toast.success("Preferences saved");
  };

  return (
    <div className="px-5 pt-5">
      <h2 className="text-lg font-extrabold tracking-tight mb-5">Settings</h2>

      <div className="space-y-4">
        {/* Wallet */}
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-3">Wallet</p>
          {isConnected ? (
            <div>
              <p className="text-xs font-mono text-text-muted break-all mb-3">{address}</p>
              <button onClick={() => disconnect()} className="text-xs text-red-400 font-semibold">Disconnect</button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-bold glow-primary"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Preferred Chain */}
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-3">Preferred Chain</p>
          <div className="grid grid-cols-2 gap-2">
            {PRIMARY_CHAINS.map((c: ChainId) => (
              <button
                key={c}
                onClick={() => setChain(c)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  chain === c
                    ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                    : "border-border bg-surface-3 text-text-muted hover:border-border-light"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: getChainDisplay(c).color }} />
                {CHAINS[c].name}
                {CHAINS[c].gasless && <span className="text-[9px] text-brand-primary">FREE</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Display Mode */}
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-3">View Mode</p>
          <div className="flex gap-2">
            {(["simple", "advanced"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setDisplayMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  displayMode === m
                    ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                    : "border-border bg-surface-3 text-text-muted"
                }`}
              >
                {m === "simple" ? "Simple" : "Advanced"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-dim mt-2">
            {displayMode === "simple" ? "Shows pay in USD. No crypto jargon." : "Shows chain details, tx hashes, and gas info."}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>

        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-xl bg-surface-3 border border-border text-text-muted font-semibold text-sm hover:border-border-light transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
