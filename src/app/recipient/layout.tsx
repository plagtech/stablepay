import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "StablePay — My Payments",
  description: "View your payments and cash out",
};

export default async function RecipientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return (
    <div className="max-w-[420px] mx-auto min-h-screen bg-surface-0 border-x border-border">
      {children}
    </div>
  );
}
