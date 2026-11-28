import { describe, expect, it } from "vitest";
import {
  formText,
  integer,
  lkrToMinor,
  productSlug,
  validEmail,
  validRole,
  validUuid,
} from "./form-values";

describe("admin form parsing", () => {
  it("normalizes bounded text before saving", () => {
    const form = new FormData();
    form.set("title", "  Ruby\u00a0Bangles  ");
    expect(formText(form, "title", 20)).toBe("Ruby Bangles");
    expect(formText(form, "title", 4)).toBeNull();
  });

  it("makes a lowercase slug from the product title", () => {
    const form = new FormData();
    form.set("title", "Ruby & Gold Bangles");
    form.set("slug", "");
    expect(productSlug(form)).toBe("ruby-gold-bangles");
  });

  it("parses LKR as exact integer minor units", () => {
    expect(lkrToMinor("1,250.50")).toBeNull();
    expect(lkrToMinor("1250.5")).toBe(125_050);
    expect(lkrToMinor("1250")).toBe(125_000);
    expect(lkrToMinor("0.01")).toBe(1);
  });

  it("rejects exponent, excess precision and values outside the integer column", () => {
    expect(lkrToMinor("1e3")).toBeNull();
    expect(lkrToMinor("1.999")).toBeNull();
    expect(lkrToMinor("21474836.48")).toBeNull();
  });

  it("accepts signed whole-number stock deltas only", () => {
    expect(integer("5")).toBe(5);
    expect(integer("-2")).toBe(-2);
    expect(integer("+2")).toBeNull();
    expect(integer("1.5")).toBeNull();
  });

  it("recognizes UUIDs and the two supported staff roles", () => {
    expect(validUuid("ed5a7d4e-9485-4a0a-a202-3f3a1535ef38")).toBe(true);
    expect(validUuid("not-a-uuid")).toBe(false);
    expect(validRole("owner")).toBe(true);
    expect(validRole("customer")).toBe(false);
  });

  it("accepts valid staff email addresses and rejects malformed input", () => {
    expect(validEmail("owner@example.com")).toBe(true);
    expect(validEmail("name+team@example.co.uk")).toBe(true);
    expect(validEmail("missing-at.example.com")).toBe(false);
    expect(validEmail("name@localhost")).toBe(false);
    expect(validEmail("no spaces@example.com")).toBe(false);
    expect(validEmail(null)).toBe(false);
  });
});
