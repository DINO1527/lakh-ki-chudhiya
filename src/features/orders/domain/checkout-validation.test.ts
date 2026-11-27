import { describe, expect, it } from "vitest";
import {
  isCheckoutFieldErrors,
  validateCheckoutDetails,
  type CheckoutDetails,
} from "./checkout-validation";

const validDetails: CheckoutDetails = {
  customerName: "QA Customer",
  customerEmail: "",
  customerPhone: "077 000 0000",
  deliveryAddress: "UAT test address",
  deliveryCity: "QA Town",
  deliveryPostalCode: "",
  deliveryNote: "",
};

describe("validateCheckoutDetails", () => {
  it("accepts complete details and common international phone formatting", () => {
    expect(validateCheckoutDetails(validDetails)).toEqual({});
    expect(
      validateCheckoutDetails({ ...validDetails, customerPhone: "+94 (77) 000-0000" }),
    ).toEqual({});
  });

  it("rejects blank required details after trimming whitespace", () => {
    expect(
      validateCheckoutDetails({
        ...validDetails,
        customerName: "   ",
        customerPhone: "0770000000",
        deliveryAddress: "\n  ",
        deliveryCity: " ",
      }),
    ).toMatchObject({
      customerName: expect.any(String),
      deliveryAddress: expect.any(String),
      deliveryCity: expect.any(String),
    });
  });

  it.each(["abc", "077000", "0770000000000000", "077000000a"])(
    "rejects malformed phone input %s",
    (customerPhone) => {
      expect(validateCheckoutDetails({ ...validDetails, customerPhone })).toHaveProperty(
        "customerPhone",
      );
    },
  );

  it("rejects invalid optional email and overlong optional details", () => {
    expect(
      validateCheckoutDetails({
        ...validDetails,
        customerEmail: "not-an-email",
        deliveryPostalCode: "P".repeat(25),
        deliveryNote: "N".repeat(501),
      }),
    ).toMatchObject({
      customerEmail: expect.any(String),
      deliveryPostalCode: expect.any(String),
      deliveryNote: expect.any(String),
    });
  });
});

describe("isCheckoutFieldErrors", () => {
  it("accepts a server field-error map and rejects unknown fields", () => {
    expect(isCheckoutFieldErrors({ customerPhone: "Enter a valid phone number." })).toBe(true);
    expect(isCheckoutFieldErrors({ secret: "bad" })).toBe(false);
    expect(isCheckoutFieldErrors(null)).toBe(false);
  });
});
