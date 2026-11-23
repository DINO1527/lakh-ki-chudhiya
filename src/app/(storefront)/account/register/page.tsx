import type { Metadata } from "next";
import Link from "next/link";
import { registerCustomer } from "@/features/customers/server/auth-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Create an account | Lacora",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CustomerRegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = first(params.error);
  const status = first(params.status);
  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Customer account</p>
      <h1 className="page-heading">Create an account</h1>
      <p className="page-intro">Use an email address you can access to receive account messages.</p>
      {status === "check-email" && (
        <p className="form-message" role="status">
          Check your email to finish creating the account. If mail delivery is not configured, ask
          the store owner to set up the account.
        </p>
      )}
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error === "setup"
            ? "Customer registration is not configured yet."
            : "We could not create the account. Check the details or try signing in."}
        </p>
      )}
      <form action={registerCustomer} className="account-form">
        <label>
          Name
          <input autoComplete="name" maxLength={120} name="full_name" required />
        </label>
        <label>
          Email
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
        <label>
          Password
          <input
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            name="password"
            required
            type="password"
          />
          <span className="field-hint">Use at least 12 characters.</span>
        </label>
        <button className="button button--primary" type="submit">
          Create account
        </button>
      </form>
      <p className="account-links">
        Already registered? <Link href="/account/login">Sign in</Link>
      </p>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
