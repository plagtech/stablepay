"use client";

import { useState, Suspense } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<"employer" | "recipient">("employer");
  const searchParams = useSearchParams();
  const isSignup = searchParams.get("signup") === "true";

  const supabase = createBrowserSupabase();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { role: mode },
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold">
          S
        </div>
        <span className="text-2xl font-bold tracking-tight">
          Stable<span className="text-brand-primary">Pay</span>
        </span>
      </div>

      <div className="bg-surface-2 border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-1 text-center">
          {isSignup ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm text-text-muted text-center mb-6">
          {isSignup
            ? "Start paying your team in digital dollars"
            : "Sign in to manage your payroll"}
        </p>

        {isSignup && (
          <div className="flex gap-2 mb-6 p-1 bg-surface-3 rounded-xl">
            {(["employer", "recipient"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setMode(r)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === r
                    ? "bg-brand-primary/15 text-brand-primary border border-brand-primary/30"
                    : "text-text-muted border border-transparent"
                }`}
              >
                {r === "employer" ? "I'm paying a team" : "I'm getting paid"}
              </button>
            ))}
          </div>
        )}

        {!sent ? (
          <form onSubmit={handleMagicLink}>
            <label className="block text-xs text-text-muted font-medium mb-2 uppercase tracking-wider">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-surface-3 border border-border text-text-primary placeholder-text-dim text-sm focus:outline-none focus:border-brand-primary/50 transition-colors mb-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Continue with Email"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/15 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D67E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="text-base font-bold mb-1">Check your email</h3>
            <p className="text-sm text-text-muted">
              We sent a magic link to <strong className="text-text-primary">{email}</strong>
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-dim">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button className="w-full py-3 rounded-xl bg-surface-3 border border-border text-text-muted font-semibold text-sm hover:border-border-light transition-colors flex items-center justify-center gap-2">
          Connect Wallet
        </button>
      </div>

      <p className="text-xs text-text-dim text-center mt-4">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <a href="/auth" className="text-brand-primary font-semibold">Sign in</a>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <a href="/auth?signup=true" className="text-brand-primary font-semibold">Get started</a>
          </>
        )}
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4 font-display">
      <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}