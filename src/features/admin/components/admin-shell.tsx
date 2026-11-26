"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { AdminNavigation } from "./admin-navigation";
import { AdminToastProvider } from "./admin-toast-provider";
import { signOutAdmin } from "../server/auth-actions";
import type { StaffRole } from "../server/access";

export function AdminShell({
  children,
  email,
  role,
}: Readonly<{ children: ReactNode; email: string; role: StaffRole }>) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AdminToastProvider>
      <div className="admin-shell" data-sidebar-collapsed={sidebarCollapsed}>
        <aside aria-label="Administration" className="admin-sidebar">
          <div className="admin-sidebar__head">
            <Link aria-label="Lacora administration home" className="admin-brand" href="/admin">
              <Image
                alt=""
                className="admin-brand__mark"
                height={44}
                src="/brand/lacora-mark.webp"
                width={44}
              />
              <span className="admin-brand__copy">
                <span className="admin-brand__name">Lacora</span>
                <span className="admin-brand__caption">Store administration</span>
              </span>
            </Link>
            <button
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="admin-sidebar__toggle"
              onClick={() => setSidebarCollapsed((current) => !current)}
              title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              type="button"
            >
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="M14.5 5.5 8 12l6.5 6.5M4 4v16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          </div>
          <AdminNavigation isCollapsed={sidebarCollapsed} isOwner={role === "owner"} />
          <p className="admin-sidebar__note">
            Catalogue and stock changes are recorded for review.
          </p>
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
    </AdminToastProvider>
  );
}
