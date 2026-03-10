import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RecipientApp from "@/components/recipient/app";

export default async function RecipientPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Get recipient record with company name
  const { data: recipient } = await supabase
    .from("recipients")
    .select("*, companies(name)")
    .eq("user_id", user.id)
    .single();

  // Get all payments
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("recipient_id", recipient?.id)
    .order("created_at", { ascending: false });

  return (
    <RecipientApp
      initialRecipient={recipient}
      initialPayments={payments || []}
    />
  );
}
