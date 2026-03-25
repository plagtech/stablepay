import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface PayrollEntry {
  addr: string;
  amount: number;
}

function buildEmailHTML(data: {
  entries: PayrollEntry[];
  chain: string;
  total: number;
  fee: number;
}) {
  const rows = data.entries
    .map(
      (e) =>
        `<tr>
          <td style="padding:10px 16px;font-family:monospace;font-size:13px;color:#7a8ba8;border-bottom:1px solid #1e2d44;">${e.addr.slice(0, 6)}...${e.addr.slice(-4)}</td>
          <td style="padding:10px 16px;text-align:right;font-weight:600;font-size:14px;color:#e8edf5;border-bottom:1px solid #1e2d44;">$${e.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#050a12;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#00d67e;font-size:20px;font-weight:800;">S</span>
      <span style="color:#e8edf5;font-size:18px;font-weight:700;margin-left:6px;">StablePay</span>
    </div>

    <div style="background:#111b2e;border:1px solid #1e2d44;border-radius:16px;overflow:hidden;">
      
      <div style="padding:24px;background:rgba(0,214,126,0.08);text-align:center;">
        <h1 style="margin:0;color:#e8edf5;font-size:20px;font-weight:700;">Your Payroll Summary</h1>
        <p style="margin:8px 0 0;color:#7a8ba8;font-size:14px;">${data.entries.length} payments on ${data.chain.charAt(0).toUpperCase() + data.chain.slice(1)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:600;color:#4a5b73;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1e2d44;">Recipient</th>
            <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:600;color:#4a5b73;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1e2d44;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="padding:20px 16px;display:flex;">
        <table style="width:100%;">
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:12px;color:#4a5b73;">Total</span><br/>
              <span style="font-size:18px;font-weight:700;color:#e8edf5;">$${data.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:12px;color:#4a5b73;">Fee (1%)</span><br/>
              <span style="font-size:18px;font-weight:700;color:#e8edf5;">$${data.fee.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:12px;color:#4a5b73;">Gas</span><br/>
              <span style="font-size:18px;font-weight:700;color:#00d67e;">${data.chain === "base" ? "$0 ⚡" : "~$0.45"}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:20px 24px;text-align:center;border-top:1px solid #1e2d44;">
        <a href="https://stablepay.me#demo" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00d67e,#00b368);color:#050a12;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none;">
          Run This Payroll →
        </a>
      </div>
    </div>

    <p style="text-align:center;color:#4a5b73;font-size:12px;margin-top:24px;">
      © 2026 StablePay · Powered by Spraay Protocol<br/>
      <a href="https://stablepay.me" style="color:#00d67e;text-decoration:none;">stablepay.me</a>
    </p>
  </div>
</body>
</html>`;
}

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

    // Send email via Resend
    if (payroll_data && payroll_data.entries) {
      try {
        await resend.emails.send({
          from: "StablePay <noreply@stablepay.me>",
          to: email.toLowerCase().trim(),
          subject: `Your Payroll Summary — $${payroll_data.total?.toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${payroll_data.entries.length} recipients`,
          html: buildEmailHTML(payroll_data),
        });
      } catch (emailErr) {
        console.error("Resend email error:", emailErr);
        // Don't fail the whole request if email fails — lead is already saved
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leads API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
