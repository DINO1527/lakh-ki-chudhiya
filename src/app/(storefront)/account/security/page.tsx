import type { Metadata } from "next";
import { updateCustomerPassword } from "@/features/customers/server/auth-actions";
import { requireCustomer } from "@/features/customers/server/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account security | Lakh Ki Chudhiya",
  robots: { index: false },
};
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CustomerSecurityPage({ searchParams }: PageProps) {
  await requireCustomer("/account/security");
  const params = await searchParams;
  const status = first(params.status);
  const error = first(params.error);

  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Customer account</p>
      <h1 className="page-heading">Account security</h1>
      <p className="page-intro">Confirm your current password before changing it.</p>
      {status === "updated" && (
        <p className="form-message" role="status">
          Password updated.
        </p>
      )}
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error === "current"
            ? "Current password did not match."
            : "Password could not be changed. Check the new password and confirmation."}
        </p>
      )}
      <form action={updateCustomerPassword} className="account-form">
        <label>
          Current password
          <input
            autoComplete="current-password"
            maxLength={1_024}
            name="current_password"
            required
            type="password"
          />
        </label>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            name="new_password"
            required
            type="password"
          />
        </label>
        <label>
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            name="confirm_password"
            required
            type="password"
          />
        </label>
        <button className="button button--primary" type="submit">
          Change password
        </button>
      </form>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
