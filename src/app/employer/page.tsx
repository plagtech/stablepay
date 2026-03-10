import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EmployerDashboard from "@/components/employer/dashboard";

export default async function EmployerPage() {
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
    .limit(20);

  return (
    <EmployerDashboard
      initialCompany={company}
      initialRecipients={recipients || []}
      initialPayRuns={payRuns || []}
    />
  );
}
