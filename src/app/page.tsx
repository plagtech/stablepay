import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { LandingPage } from "@/components/shared/landing-page";

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if user is employer or recipient and redirect
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (company) {
      redirect("/employer");
    }

    // Check if they're a recipient
    const { data: recipient } = await supabase
      .from("recipients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (recipient) {
      redirect("/recipient");
    }

    // New user — send to onboarding
    redirect("/auth/onboard");
  }

  return <LandingPage />;
}
