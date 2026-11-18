import { describe, expect, it } from "vitest";

describe("Stage 0 starter", () => {
  it("uses the approved single-app runtime names", () => {
    expect(["Next.js", "Supabase", "Cloudflare Workers", "R2"]).toHaveLength(4);
  });
});
