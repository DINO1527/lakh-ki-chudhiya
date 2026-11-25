import { describe, expect, it } from "vitest";
import { colomboDateTimeLocalToUtc, utcToColomboDateTimeLocal } from "./schedule";

describe("Colombo offer schedule times", () => {
  it("converts local time to a UTC instant and back", () => {
    expect(colomboDateTimeLocalToUtc("2026-11-24T12:00")).toBe("2026-11-24T06:30:00.000Z");
    expect(utcToColomboDateTimeLocal("2026-11-24T06:30:00.000Z")).toBe("2026-11-24T12:00");
  });

  it("rejects malformed and normalized-invalid local timestamps", () => {
    expect(colomboDateTimeLocalToUtc("2026-11-24 12:00")).toBeNull();
    expect(colomboDateTimeLocalToUtc("2026-02-30T12:00")).toBeNull();
  });
});
