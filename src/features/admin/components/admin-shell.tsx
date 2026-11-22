import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAdmin } from "../server/auth-actions";
import type { StaffRole } from "../server/access";

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/content", label: "Homepage content" },
  { href: "/admin/security", label: "Account security" },
] as const;

export function AdminShell({
  children,
  email,
  role,
}: Readonly<{ children: ReactNode; email: string; role: StaffRole }>) {
  const links =
    role === "owner"
      ? [
          ...navigation,
          { href: "/admin/team", label: "Team access" },
          { href: "/admin/activity", label: "Activity" },
        ]
      : navigation;

  return (
    <div className="admin-shell">
      <aside aria-label="Administration" className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand__name">Lakh Ki Chudhiya</span>
          <span className="admin-brand__caption">Store administration</span>
        </Link>
        <nav aria-label="Admin navigation" className="admin-navigation">
          {links.map((item) => (
            <Link className="admin-navigation__link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="admin-sidebar__note">Catalogue and stock changes are recorded for review.</p>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <Link className="admin-topbar__store-link" href="/">
            View storefront <span aria-hidden="true">↗</span>
          </Link>
          <div className="admin-account">
            <span className="admin-account__identity">
              <span className="admin-account__email">{email}</span>
              <span className="admin-account__role">{role}</span>
            </span>
            <form action={signOutAdmin}>
              <button className="admin-button admin-button--quiet" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="admin-main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
