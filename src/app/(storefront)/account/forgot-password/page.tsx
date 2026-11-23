import type { Metadata } from "next";
import Link from "next/link";
import { requestCustomerPasswordReset } from "@/features/customers/server/auth-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset password | Lacora",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sent = first(params.status) === "sent";
  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Account recovery</p>
      <h1 className="page-heading">Reset your password</h1>
      {sent ? (
        <p className="form-message" role="status">
          If that address has an account, a reset link will be sent when email delivery is
          configured.
        </p>
      ) : (
        <form action={requestCustomerPasswordReset} className="account-form">
          <label>
            Email
            <input autoComplete="email" maxLength={254} name="email" required type="email" />
          </label>
          <button className="button button--primary" type="submit">
            Send reset link
          </button>
        </form>
      )}
      <Link className="text-link" href="/account/login">
        Return to sign in
      </Link>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
