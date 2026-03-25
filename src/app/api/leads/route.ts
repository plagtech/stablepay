import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, payroll_data, source } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    // Insert lead
    const { error } = await supabase.from("leads").insert({
      email: email.toLowerCase().trim(),
      payroll_data: payroll_data || null,
      source: source || "unknown",
    });

    if (error) {
      // If duplicate email, update instead
      if (error.code === "23505") {
        await supabase
          .from("leads")
          .update({ payroll_data, source, updated_at: new Date().toISOString() })
          .eq("email", email.toLowerCase().trim());
      } else {
        console.error("Lead insert error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
      }
    }

    // TODO: Send email via Resend when SMTP is configured
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: "noreply@stablepay.me",
    //   to: email,
    //   subject: "Your StablePay Payroll Summary",
    //   html: `<h2>Your Payroll Summary</h2>...`,
    // });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leads API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
