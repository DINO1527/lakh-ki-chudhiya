import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNavigation } from "./admin-navigation";
import { signOutAdmin } from "../server/auth-actions";
import type { StaffRole } from "../server/access";

export function AdminShell({
  children,
  email,
  role,
}: Readonly<{ children: ReactNode; email: string; role: StaffRole }>) {
  return (
    <div className="admin-shell">
      <aside aria-label="Administration" className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand__name">Lakh Ki Chudhiya</span>
          <span className="admin-brand__caption">Store administration</span>
        </Link>
        <AdminNavigation isOwner={role === "owner"} />
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
