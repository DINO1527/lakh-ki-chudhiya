import type { Metadata } from "next";
import { updateCustomerProfile } from "@/features/customers/server/auth-actions";
import { requireCustomer } from "@/features/customers/server/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your profile | Lacora",
  robots: { index: false },
};
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CustomerProfilePage({ searchParams }: PageProps) {
  const { supabase, user } = await requireCustomer("/account/profile");
  const [{ data: profile }, { data: address }] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("customer_default_addresses")
      .select("address, city, postal_code")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const params = await searchParams;
  const status = first(params.status);
  const error = first(params.error);

  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Customer account</p>
      <h1 className="page-heading">Profile</h1>
      <p className="page-intro">
        Keep your contact details and default delivery address ready for your next order.
      </p>
      {status === "saved" && (
        <p className="form-message" role="status">
          Your account details and saved delivery address have been updated.
        </p>
      )}
      {error && (
        <p className="form-message form-message--error" role="alert">
          Details could not be saved. Check the name, phone and complete address fields.
        </p>
      )}
      <form action={updateCustomerProfile} className="account-form account-profile-form">
        <h2>Contact details</h2>
        <label>
          Name
          <input
            autoComplete="name"
            defaultValue={profile?.full_name ?? ""}
            maxLength={120}
            name="full_name"
            required
          />
        </label>
        <label>
          Phone
          <input
            autoComplete="tel"
            defaultValue={profile?.phone ?? ""}
            maxLength={40}
            name="phone"
            type="tel"
          />
        </label>
        <div className="account-profile-form__section">
          <h2>Default delivery address</h2>
          <p>Optional. Add a complete address and city together to prefill checkout.</p>
        </div>
        <label>
          Street address
          <textarea
            autoComplete="street-address"
            defaultValue={address?.address ?? ""}
            maxLength={300}
            name="delivery_address"
            rows={3}
          />
        </label>
        <label>
          City or town
          <input
            autoComplete="address-level2"
            defaultValue={address?.city ?? ""}
            maxLength={100}
            name="delivery_city"
          />
        </label>
        <label>
          Postal code
          <input
            autoComplete="postal-code"
            defaultValue={address?.postal_code ?? ""}
            maxLength={24}
            name="delivery_postal_code"
          />
        </label>
        <button className="button button--primary" type="submit">
          Save account details
        </button>
      </form>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
