import type { Metadata } from "next";
import { setPasswordFromRecovery } from "@/features/customers/server/auth-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Choose a new password | Lakh Ki Chudhiya",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = first(params.error);
  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Account recovery</p>
      <h1 className="page-heading">Choose a new password</h1>
      {error && (
        <p className="form-message form-message--error" role="alert">
          The reset link may have expired. Request a new one and try again.
        </p>
      )}
      <form action={setPasswordFromRecovery} className="account-form">
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
          Save password
        </button>
      </form>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
