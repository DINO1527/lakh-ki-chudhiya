import type { Metadata } from "next";
import Link from "next/link";
import { signInCustomer } from "@/features/customers/server/auth-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Customer sign in | Lakh Ki Chudhiya",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CustomerLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = first(params.error);
  const next = safeNext(first(params.next));
  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Your account</p>
      <h1 className="page-heading">Sign in</h1>
      <p className="page-intro">Sign in to view your orders and keep your cart across visits.</p>
      {error && (
        <p className="form-message form-message--error" role="alert">
          {error === "setup"
            ? "Customer sign-in is not configured yet. Please try again later."
            : "We could not sign you in. Check your email and password, then try again."}
        </p>
      )}
      <form action={signInCustomer} className="account-form">
        <input name="next" type="hidden" value={next} />
        <label>
          Email
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            maxLength={1_024}
            name="password"
            required
            type="password"
          />
        </label>
        <button className="button button--primary" type="submit">
          Sign in
        </button>
      </form>
      <div className="account-links">
        <Link href="/account/forgot-password">Forgot password?</Link>
        <Link href="/account/register">Create a customer account</Link>
      </div>
    </main>
  );
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function safeNext(value: string): string {
  if (["/account", "/cart", "/checkout"].includes(value)) return value;
  if (/^\/account\/orders(?:\/[A-Z0-9-]+)?$/.test(value)) return value;
  return "/account";
}
