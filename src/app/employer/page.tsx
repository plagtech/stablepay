import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmployerDashboard() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  const { data: recipients } = await supabase
    .from("recipients")
    .select("*")
    .eq("company_id", company?.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  const { data: payRuns } = await supabase
    .from("pay_runs")
    .select("*")
    .eq("company_id", company?.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Pass data to client component
  // For now, render the employer dashboard with server data
  return (
    <div className="min-h-screen bg-surface-0">
      {/* 
        TODO: Import and render the EmployerDashboard client component
        from the prototype, passing company, recipients, and payRuns as props.
        The prototype JSX in stablepay.jsx has the complete UI.
      */}
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">
          Welcome to StablePay, {company?.name}
        </h1>
        <p className="text-text-muted">
          {recipients?.length || 0} team members •{" "}
          {payRuns?.length || 0} pay runs
        </p>
        <p className="text-sm text-text-dim mt-8">
          🚧 Connect the prototype dashboard component here.
          <br />
          The full UI is in your stablepay.jsx artifact.
        </p>
      </div>
    </div>
  );
}
