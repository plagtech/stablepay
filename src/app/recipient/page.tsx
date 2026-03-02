import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RecipientHome() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Get recipient record
  const { data: recipient } = await supabase
    .from("recipients")
    .select("*, companies(name)")
    .eq("user_id", user.id)
    .single();

  // Get recent payments
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("recipient_id", recipient?.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-surface-0">
      {/* 
        TODO: Import and render the RecipientView client component
        from the prototype, passing recipient and payments as props.
        The prototype JSX in stablepay.jsx has the complete mobile UI.
      */}
      <div className="p-6 text-center pt-20">
        <h1 className="text-xl font-bold mb-2">
          Welcome, {recipient?.name || "there"}
        </h1>
        <p className="text-text-muted text-sm">
          {payments?.length || 0} payments received
        </p>
        <p className="text-sm text-text-dim mt-8">
          🚧 Connect the prototype recipient view here.
          <br />
          The full mobile UI is in your stablepay.jsx artifact.
        </p>
      </div>
    </div>
  );
}
