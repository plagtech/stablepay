import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// POST: Create a shared payroll
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries, chain, token } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Entries required" }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const id = generateId();

    const { error } = await supabase.from("shared_payrolls").insert({
      id,
      entries,
      chain: chain || "base",
      token: token || "USDC",
    });

    if (error) {
      console.error("Share payroll error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ id, url: `https://stablepay.me/payroll/${id}` });
  } catch (err) {
    console.error("Share API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET: Fetch a shared payroll
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("shared_payrolls")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    // Increment views
    await supabase
      .from("shared_payrolls")
      .update({ views: (data.views || 0) + 1 })
      .eq("id", id);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Share fetch error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
