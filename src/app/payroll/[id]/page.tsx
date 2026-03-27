"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface SharedPayroll {
  id: string;
  entries: { addr: string; amount: number }[];
  chain: string;
  token: string;
}

export default function SharedPayrollPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share?id=${params.id}`);
        if (!res.ok) {
          setError("Payroll not found");
          setLoading(false);
          return;
        }
        const data: SharedPayroll = await res.json();

        // Convert entries to CSV-style text and save to localStorage
        const text = data.entries
          .map((e) => `${e.addr}, ${e.amount}`)
          .join("\n");
        localStorage.setItem("sp_input", text);
        localStorage.setItem("sp_shared_chain", data.chain);
        localStorage.setItem("sp_shared_token", data.token);
        localStorage.setItem("sp_shared_autopreview", "true");

        // Redirect to landing page with demo section
        router.push("/#demo");
      } catch {
        setError("Something went wrong");
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center font-display">
        <div className="text-center">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-xl font-bold text-text-primary mb-2">Payroll not found</h1>
          <p className="text-sm text-text-muted mb-6">This link may have expired or doesn&apos;t exist.</p>
          <a href="/" className="px-6 py-2.5 rounded-full gradient-primary text-white font-semibold text-sm glow-primary">
            Go to StablePay &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center font-display">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-text-muted">Loading payroll...</p>
      </div>
    </div>
  );
}
