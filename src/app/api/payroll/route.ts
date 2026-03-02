import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/payroll
 * Creates a pay run and prepares the batch payment
 * The actual on-chain transaction happens client-side via the user's wallet
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { company_id, recipient_ids, chain_override } = body;

    // Verify company ownership
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .eq("owner_id", user.id)
      .single();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get active recipients
    let query = supabase
      .from("recipients")
      .select("*")
      .eq("company_id", company_id)
      .eq("status", "active");

    if (recipient_ids?.length) {
      query = query.in("id", recipient_ids);
    }

    const { data: recipients } = await query;

    if (!recipients?.length) {
      return NextResponse.json(
        { error: "No active recipients found" },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalAmount = recipients.reduce((sum, r) => sum + Number(r.pay_amount), 0);
    const fee = totalAmount * 0.003; // Spraay 0.3% fee

    // Create pay run record
    const { data: payRun, error: payRunError } = await supabase
      .from("pay_runs")
      .insert({
        company_id,
        scheduled_date: new Date().toISOString().split("T")[0],
        total_amount: totalAmount,
        recipient_count: recipients.length,
        status: "processing",
        chain: chain_override || "multi",
      })
      .select()
      .single();

    if (payRunError) throw payRunError;

    // Create individual payment records
    const payments = recipients.map((r) => ({
      pay_run_id: payRun.id,
      recipient_id: r.id,
      amount_gross: Number(r.pay_amount),
      fee: Number(r.pay_amount) * 0.003,
      amount_net: Number(r.pay_amount) * 0.997,
      chain: chain_override || r.preferred_chain,
      status: "pending",
    }));

    const { error: paymentsError } = await supabase
      .from("payments")
      .insert(payments);

    if (paymentsError) throw paymentsError;

    // Return data needed for client-side transaction
    return NextResponse.json({
      pay_run_id: payRun.id,
      status: "processing",
      recipients: recipients.map((r) => ({
        id: r.id,
        wallet_address: r.wallet_address,
        amount: Number(r.pay_amount),
        chain: chain_override || r.preferred_chain,
      })),
      total_amount: totalAmount,
      fee,
      recipient_count: recipients.length,
    });
  } catch (error: any) {
    console.error("[API] Payroll error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payroll" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payroll
 * Updates pay run with transaction hash after on-chain execution
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pay_run_id, tx_hash, status } = await request.json();

    // Update pay run
    const { error: runError } = await supabase
      .from("pay_runs")
      .update({
        tx_hash,
        status: status || "completed",
        executed_at: new Date().toISOString(),
      })
      .eq("id", pay_run_id);

    if (runError) throw runError;

    // Update all payments in this run
    const { error: paymentsError } = await supabase
      .from("payments")
      .update({
        tx_hash,
        status: status || "completed",
        paid_at: new Date().toISOString(),
      })
      .eq("pay_run_id", pay_run_id);

    if (paymentsError) throw paymentsError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update payroll" },
      { status: 500 }
    );
  }
}
