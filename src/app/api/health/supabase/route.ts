import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: queryError } = await supabase.from("stage0_smoke").select("id").limit(1);

    if (queryError) {
      return NextResponse.json(
        { status: "unavailable" },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { status: "ok", querySucceeded: Array.isArray(data) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unconfigured" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
