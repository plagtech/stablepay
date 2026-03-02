"use client";

import { useState } from "react";

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save to Supabase waitlist table or send to Resend
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary font-display">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold text-sm">
            S
          </div>
          <span className="text-lg font-bold tracking-tight">
            Stable<span className="text-brand-primary">Pay</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/auth" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Log In
          </a>
          <a
            href="/auth?signup=true"
            className="text-sm font-semibold px-4 py-2 rounded-lg gradient-primary text-white glow-primary"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
          <span className="text-xs font-semibold text-brand-primary">
            💧 Powered by Spraay Protocol • 11 Chains
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
          Pay your team.
          <br />
          <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
            Stay stable.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          The simplest way to pay your global team in digital dollars.
          Multi-chain payroll that&apos;s instant, gas-free on Base, and
          costs a fraction of traditional wire transfers.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your work email"
              required
              className="flex-1 px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder-text-dim text-sm focus:outline-none focus:border-brand-primary/50 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary whitespace-nowrap"
            >
              Get Early Access
            </button>
          </form>
        ) : (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary/10 border border-brand-primary/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D67E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm font-semibold text-brand-primary">
              You&apos;re on the list! We&apos;ll be in touch.
            </span>
          </div>
        )}

        <p className="text-xs text-text-dim mt-4">
          Free for teams under 5 • No crypto experience needed
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: "⚡",
              title: "Instant Payments",
              desc: "Pay your entire team in one click. Spraay batches all payments into a single transaction — fast, cheap, done.",
            },
            {
              icon: "🌍",
              title: "11 Chains, One Dashboard",
              desc: "Each team member picks their preferred network. Base, Ethereum, Arbitrum, Polygon, Solana, and more.",
            },
            {
              icon: "🛡️",
              title: "Gas-Free on Base",
              desc: "Zero gas fees on Base via Coinbase Paymaster. Your team gets paid more, you spend less on fees.",
            },
            {
              icon: "📱",
              title: "Mobile-First for Recipients",
              desc: "Your team downloads StablePay, taps to set up, and sees their pay — no crypto jargon required.",
            },
            {
              icon: "💵",
              title: "Cash Out to Bank",
              desc: "Recipients can keep digital dollars or cash out to their bank account instantly. Their choice.",
            },
            {
              icon: "📊",
              title: "Accounting Ready",
              desc: "Export CSV reports, view verified on-chain receipts, and keep your books clean.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-surface-2 border border-border hover:border-border-light transition-colors"
            >
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="text-base font-bold mt-3 mb-2">{feature.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-extrabold text-center mb-12 tracking-tight">
          How it works
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Add your team", desc: "Enter names, emails, and pay amounts. No wallet addresses needed." },
            { step: "2", title: "They accept & set up", desc: "Team members get an invite, download the app, and choose their network." },
            { step: "3", title: "Fund & run payroll", desc: "Deposit USDC and hit 'Run Payroll'. Spraay batch-sends to everyone." },
            { step: "4", title: "Everyone gets paid", desc: "Instant notifications. Verified receipts. Cash out or keep as digital dollars." },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-10 h-10 rounded-full gradient-primary text-white font-bold text-sm flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h4 className="text-sm font-bold mb-2">{item.title}</h4>
              <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="p-10 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border border-brand-primary/20">
          <h2 className="text-2xl font-extrabold mb-3 tracking-tight">
            Ready to simplify payroll?
          </h2>
          <p className="text-sm text-text-muted mb-6">
            Join the waitlist and be first to pay your team the modern way.
          </p>
          <a
            href="/auth?signup=true"
            className="inline-block px-8 py-3 rounded-xl gradient-primary text-white font-bold text-sm glow-primary"
          >
            Start for Free →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold text-[10px]">
            S
          </div>
          <span className="text-sm font-bold">
            Stable<span className="text-brand-primary">Pay</span>
          </span>
        </div>
        <p className="text-xs text-text-dim">
          Powered by 💧 Spraay Protocol • Multi-chain batch payments
        </p>
        <p className="text-xs text-text-dim mt-1">
          © 2026 StablePay. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
