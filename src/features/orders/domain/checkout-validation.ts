export type CheckoutDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryNote: string;
};

export type CheckoutField = keyof CheckoutDetails;
export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

const CHECKOUT_FIELDS: readonly CheckoutField[] = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "deliveryAddress",
  "deliveryCity",
  "deliveryPostalCode",
  "deliveryNote",
];

const PHONE_CHARACTERS = /^[+]?[0-9(). -]+$/;
const EMAIL_ADDRESS = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateCheckoutDetails(details: CheckoutDetails): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const name = details.customerName.trim();
  const email = details.customerEmail.trim();
  const phone = details.customerPhone.trim();
  const address = details.deliveryAddress.trim();
  const city = details.deliveryCity.trim();

  if (!name || name.length > 120) {
    errors.customerName = "Enter your name (up to 120 characters).";
  }
  if (email.length > 254 || (email !== "" && !EMAIL_ADDRESS.test(email))) {
    errors.customerEmail = "Enter a valid email address or leave this field blank.";
  }

  const phoneDigits = phone.replace(/\D/g, "").length;
  if (phone.length > 40 || phoneDigits < 7 || phoneDigits > 15 || !PHONE_CHARACTERS.test(phone)) {
    errors.customerPhone =
      "Enter a phone number with 7–15 digits. You can include a leading +, spaces, brackets, hyphens, or full stops.";
  }

  if (!address || address.length > 300) {
    errors.deliveryAddress = "Enter a delivery address (up to 300 characters).";
  }
  if (!city || city.length > 100) {
    errors.deliveryCity = "Enter a city or town (up to 100 characters).";
  }
  if (details.deliveryPostalCode.trim().length > 24) {
    errors.deliveryPostalCode = "Use 24 characters or fewer for the postal code.";
  }
  if (details.deliveryNote.trim().length > 500) {
    errors.deliveryNote = "Use 500 characters or fewer for the delivery note.";
  }

  return errors;
}

export function isCheckoutFieldErrors(value: unknown): value is CheckoutFieldErrors {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([field, message]) =>
      CHECKOUT_FIELDS.includes(field as CheckoutField) && typeof message === "string",
  );
}
