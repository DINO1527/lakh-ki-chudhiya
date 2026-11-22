import type { Metadata } from "next";
import { updateCustomerProfile } from "@/features/customers/server/auth-actions";
import { requireCustomer } from "@/features/customers/server/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your profile | Lakh Ki Chudhiya",
  robots: { index: false },
};
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CustomerProfilePage({ searchParams }: PageProps) {
  const { supabase, user } = await requireCustomer("/account/profile");
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();
  const params = await searchParams;
  const status = first(params.status);
  const error = first(params.error);

  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Customer account</p>
      <h1 className="page-heading">Profile</h1>
      {status === "saved" && (
        <p className="form-message" role="status">
          Profile saved.
        </p>
      )}
      {error && (
        <p className="form-message form-message--error" role="alert">
          Profile could not be saved. Check the name and phone fields.
        </p>
      )}
      <form action={updateCustomerProfile} className="account-form">
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
        <button className="button button--primary" type="submit">
          Save profile
        </button>
      </form>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
