import type { Metadata } from "next";
import Link from "next/link";
import { signOutCustomer } from "@/features/customers/server/auth-actions";
import { requireCustomer } from "@/features/customers/server/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your account | Lacora",
  robots: { index: false },
};

export default async function AccountPage() {
  const { supabase, user } = await requireCustomer();
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="page-shell account-page" id="main-content">
      <p className="eyebrow">Welcome back</p>
      <h1 className="page-heading">Your account</h1>
      <p className="page-intro">Signed in as {user.email ?? "customer"}.</p>
      {profile?.full_name && <p>{profile.full_name}</p>}
      <div className="account-card-grid">
        <Link className="account-card" href="/account/orders">
          <strong>Order history</strong>
          <span>View order status and saved order details.</span>
        </Link>
        <Link className="account-card" href="/account/profile">
          <strong>Profile</strong>
          <span>{profile?.phone || "Add a contact number for checkout."}</span>
        </Link>
        <Link className="account-card" href="/account/security">
          <strong>Account security</strong>
          <span>Change your password after signing in.</span>
        </Link>
      </div>
      <form action={signOutCustomer} className="account-signout">
        <button className="button button--secondary" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
