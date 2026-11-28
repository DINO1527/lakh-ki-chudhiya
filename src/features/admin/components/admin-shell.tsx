"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { AdminNavigation } from "./admin-navigation";
import { AdminToastProvider } from "./admin-toast-provider";
import { signOutAdmin } from "../server/auth-actions";
import type { StaffRole } from "../server/access";

export function AdminShell({
  children,
  email,
  role,
  defaultSidebarCollapsed,
}: Readonly<{
  children: ReactNode;
  email: string;
  role: StaffRole;
  defaultSidebarCollapsed: boolean;
}>) {
  const pathname = usePathname();
  const mobileNavigationRef = useRef<HTMLDialogElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed);

  useEffect(() => {
    if (mobileNavigationRef.current?.open) mobileNavigationRef.current.close();
  }, [pathname]);

  useEffect(() => {
    const mobileViewport = window.matchMedia("(width <= 48rem)");
    const closeOnDesktop = () => {
      if (!mobileViewport.matches && mobileNavigationRef.current?.open) {
        mobileNavigationRef.current.close();
      }
    };

    mobileViewport.addEventListener("change", closeOnDesktop);
    return () => mobileViewport.removeEventListener("change", closeOnDesktop);
  }, []);

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      document.cookie = `admin_sidebar_collapsed=${next}; Path=/admin; Max-Age=31536000; SameSite=Lax`;
      return next;
    });
  };

  const closeAfterNavigation = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      mobileNavigationRef.current?.close();
      return;
    }

    if (event.target === event.currentTarget) mobileNavigationRef.current?.close();
  };

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
              aria-controls="admin-sidebar-navigation"
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="admin-sidebar__toggle"
              onClick={toggleDesktopSidebar}
              title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              type="button"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen aria-hidden="true" size={19} strokeWidth={1.8} />
              ) : (
                <PanelLeftClose aria-hidden="true" size={19} strokeWidth={1.8} />
              )}
            </button>
          </div>
          <AdminNavigation
            id="admin-sidebar-navigation"
            isCollapsed={sidebarCollapsed}
            isOwner={role === "owner"}
          />
          <p className="admin-sidebar__note">
            Catalogue and stock changes are recorded for review.
          </p>
        </aside>

        <dialog
          aria-labelledby="admin-mobile-navigation-title"
          className="admin-mobile-navigation"
          id="admin-mobile-navigation"
          onClick={closeAfterNavigation}
          ref={mobileNavigationRef}
        >
          <div className="admin-mobile-navigation__panel">
            <div className="admin-mobile-navigation__head">
              <Link
                aria-label="Lacora administration home"
                className="admin-brand"
                href="/admin"
                onClick={() => mobileNavigationRef.current?.close()}
              >
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
                aria-label="Close navigation"
                className="admin-button admin-button--icon admin-button--quiet"
                onClick={() => mobileNavigationRef.current?.close()}
                type="button"
              >
                <X aria-hidden="true" size={19} strokeWidth={1.8} />
              </button>
            </div>
            <h2 className="admin-sr-only" id="admin-mobile-navigation-title">
              Administration navigation
            </h2>
            <AdminNavigation
              id="admin-mobile-navigation-links"
              isCollapsed={false}
              isMobile
              isOwner={role === "owner"}
            />
            <p className="admin-mobile-navigation__note">
              Catalogue and stock changes are recorded for review.
            </p>
          </div>
        </dialog>

        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-topbar__links">
              <button
                aria-controls="admin-mobile-navigation"
                aria-haspopup="dialog"
                className="admin-button admin-button--secondary admin-mobile-menu-button"
                onClick={() => mobileNavigationRef.current?.showModal()}
                type="button"
              >
                <Menu aria-hidden="true" size={18} strokeWidth={1.8} />
                Menu
              </button>
              <Link className="admin-topbar__store-link" href="/">
                View storefront <span aria-hidden="true">↗</span>
              </Link>
            </div>
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
