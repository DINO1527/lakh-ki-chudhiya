import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: userData, error: authError }, { data, error: queryError }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("stage0_smoke").select("id").limit(1),
    ]);

    if (authError || queryError) {
      return NextResponse.json(
        { status: "unavailable" },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { status: "ok", authenticated: Boolean(userData.user), querySucceeded: Array.isArray(data) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unconfigured" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
