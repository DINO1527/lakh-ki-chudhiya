import { describe, expect, it } from "vitest";
import { detectImageMime } from "./media-validation";

describe("admin media upload mock files", () => {
  const mockImageSignatures = [
    { label: "JPEG", bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
    { label: "PNG", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png" },
    {
      label: "WebP",
      bytes: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      mime: "image/webp",
    },
    {
      label: "AVIF",
      bytes: [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
      mime: "image/avif",
    },
  ] as const;

  it.each(mockImageSignatures)("accepts a valid $label upload signature", ({ bytes, mime }) => {
    expect(detectImageMime(new Uint8Array(bytes))).toBe(mime);
  });

  it("rejects a mislabeled or unsupported file signature", () => {
    expect(detectImageMime(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull();
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff]))).not.toBe("image/png");
  });
});
