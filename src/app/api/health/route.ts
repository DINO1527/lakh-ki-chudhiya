import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", runtime: "next-route-handler" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
