"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useAccount, useConnect } from "wagmi";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getChainDisplay, PRIMARY_CHAINS, CHAINS } from "@/lib/contracts/chains";
import type { ChainId } from "@/types";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createBrowserSupabase();

  const [step, setStep] = useState<"loading" | "preview" | "auth" | "setup" | "done">("loading");
  const [recipient, setRecipient] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [chain, setChain] = useState<ChainId>("base");
  const [loading, setLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  // 1. Load invite details
  useEffect(() => {
    async function loadInvite() {
      const { data, error } = await supabase
        .from("recipients")
        .select("*, companies(name)")
        .eq("invite_token", token)
        .single();

      if (error || !data) {
        toast.error("Invalid or expired invite link");
        setStep("preview");
        return;
      }

      setRecipient(data);
      setCompanyName((data as any).companies?.name || "Unknown Company");
      setEmail(data.email);
      setChain(data.preferred_chain || "base");

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStep("setup");
      } else {
        setStep("preview");
      }
    }
    loadInvite();
  }, [token]);

  // 2. Send magic link
  const handleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
          data: { role: "recipient" },
        },
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Complete setup — link wallet, activate recipient
  const handleComplete = async () => {
    if (!isConnected || !address || !recipient) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        setStep("auth");
        return;
      }

      const { error } = await supabase
        .from("recipients")
        .update({
          user_id: user.id,
          wallet_address: address,
          preferred_chain: chain,
          status: "active",
        })
        .eq("id", recipient.id);

      if (error) throw error;
      setStep("done");
      toast.success("You're all set!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check auth status on focus (after coming back from magic link)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && step === "auth") {
        setStep("setup");
      }
    };

    window.addEventListener("focus", checkAuth);
    // Also check after auth callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setStep("setup");
    });

    return () => {
      window.removeEventListener("focus", checkAuth);
      subscription.unsubscribe();
    };
  }, [step]);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4 font-display">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold">S</div>
          <span className="text-2xl font-bold tracking-tight">Stable<span className="text-brand-primary">Pay</span></span>
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-muted">Loading your invite...</p>
          </div>
        )}

        {/* Preview / Auth */}
        {(step === "preview" || step === "auth") && recipient && (
          <div className="bg-surface-2 border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-center mb-1">You&apos;ve been invited!</h2>
            <p className="text-sm text-text-muted text-center mb-6">
              <strong className="text-text-primary">{companyName}</strong> wants to pay you via StablePay.
            </p>

            <div className="bg-surface-3 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-dim">Your Name</span>
                <span className="font-semibold">{recipient.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-dim">Role</span>
                <span className="font-semibold">{recipient.role || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-dim">Monthly Pay</span>
                <span className="font-bold text-brand-primary">${Number(recipient.pay_amount).toLocaleString()}</span>
              </div>
            </div>

            {step === "preview" && !emailSent && (
              <>
                <p className="text-xs text-text-dim text-center mb-4">Sign in to accept your invite and start getting paid.</p>
                <button
                  onClick={() => { setStep("auth"); handleAuth(); }}
                  disabled={loading}
                  className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Accept & Sign In"}
                </button>
              </>
            )}

            {(step === "auth" || emailSent) && (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/15 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D67E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h3 className="text-base font-bold mb-1">Check your email</h3>
                <p className="text-sm text-text-muted">
                  We sent a link to <strong className="text-text-primary">{email}</strong>
                </p>
                <p className="text-xs text-text-dim mt-2">Click the link, then come back here.</p>
              </div>
            )}
          </div>
        )}

        {/* Invalid invite */}
        {step === "preview" && !recipient && (
          <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Invalid Invite</h2>
            <p className="text-sm text-text-muted">This invite link is invalid or has expired. Ask your employer to send a new one.</p>
          </div>
        )}

        {/* Setup — Connect Wallet & Choose Chain */}
        {step === "setup" && recipient && (
          <div className="bg-surface-2 border border-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-center mb-1">Set Up Your Account</h2>
            <p className="text-sm text-text-muted text-center mb-6">Connect your wallet and choose how you want to get paid.</p>

            {/* Wallet */}
            <div className="mb-5">
              <p className="text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">Wallet</p>
              {isConnected ? (
                <div className="bg-surface-3 rounded-xl p-3 border border-brand-primary/20 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D67E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-xs font-mono text-text-muted">{address}</span>
                </div>
              ) : (
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="w-full py-3 rounded-xl bg-surface-3 border border-border text-text-muted font-semibold text-sm hover:border-brand-primary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><circle cx="18" cy="14" r="1"/></svg>
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Chain Selection */}
            <div className="mb-6">
              <p className="text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">Preferred Chain</p>
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
                    {CHAINS[c].gasless && <span className="text-[9px] text-brand-primary ml-auto">FREE</span>}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-dim mt-2">Base is recommended — gas-free via Coinbase Paymaster.</p>
            </div>

            <button
              onClick={handleComplete}
              disabled={loading || !isConnected}
              className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Complete Setup"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/15 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00D67E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-xl font-extrabold mb-2">You&apos;re all set!</h2>
            <p className="text-sm text-text-muted mb-6">
              You&apos;ll receive payments from <strong className="text-text-primary">{companyName}</strong> directly to your wallet on {getChainDisplay(chain).name}.
            </p>
            <button
              onClick={() => router.push("/recipient")}
              className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary"
            >
              Go to My Dashboard
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-text-dim text-center mt-6">
          Powered by 💧 Spraay Protocol
        </p>
      </div>
    </div>
  );
}
