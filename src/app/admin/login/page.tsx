import type { Metadata } from "next";
import Link from "next/link";
import { signInAdmin } from "@/features/admin/server/auth-actions";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Staff sign in | Lakh Ki Chudhiya",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  credentials: "The email or password could not be verified. Check the details and try again.",
  unauthorized:
    "This account does not have active staff access. Ask the store owner to grant access.",
  setup:
    "Supabase is not configured for this environment. Ask the administrator to complete setup.",
};

export default async function AdminLoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const configured = isSupabaseServerConfigured();

  return (
    <main className="admin-login" id="main-content">
      <section aria-labelledby="admin-login-title" className="admin-login__card">
        <Link className="admin-login__brand" href="/">
          Lakh Ki Chudhiya
        </Link>
        <p className="admin-eyebrow">Staff access</p>
        <h1 id="admin-login-title">Sign in to the store desk</h1>
        <p className="admin-login__intro">
          Use the email and password issued for your staff account. Public sign-up is disabled.
        </p>
        {error && messages[error] ? (
          <p className="admin-alert" role="alert">
            {messages[error]}
          </p>
        ) : null}
        {!configured ? (
          <p className="admin-alert" role="status">
            Supabase environment variables are not configured.
          </p>
        ) : (
          <form action={signInAdmin} className="admin-form">
            <label className="admin-field">
              <span>Email address</span>
              <input autoComplete="username" name="email" required type="email" />
            </label>
            <label className="admin-field">
              <span>Password</span>
              <input autoComplete="current-password" name="password" required type="password" />
            </label>
            <button className="admin-button admin-button--primary" type="submit">
              Sign in
            </button>
          </form>
        )}
        <p className="admin-login__support">
          Need access or a password reset? Contact the store owner.
        </p>
      </section>
    </main>
  );
}
