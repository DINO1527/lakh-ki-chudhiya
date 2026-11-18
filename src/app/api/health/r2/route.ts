import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { env } = getCloudflareContext();
  const smokeEnabled = (env as typeof env & { STAGE0_SMOKE_ENABLED?: string }).STAGE0_SMOKE_ENABLED;

  if (smokeEnabled !== "true") {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const object = await env.PRODUCT_MEDIA.get("stage0/smoke.txt");

  if (!object) {
    return NextResponse.json(
      { status: "fixture-missing" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return new Response(await object.text(), {
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}
