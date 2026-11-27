"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { StorefrontPrimaryNavigation } from "./storefront-primary-navigation";

export function MobileMenu({ isSignedIn }: { isSignedIn: boolean }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menuRef.current?.open) return;
      event.preventDefault();
      menuRef.current.open = false;
      menuRef.current.querySelector("summary")?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function closeAfterNavigation(event: ReactMouseEvent<HTMLDetailsElement>) {
    if (event.target instanceof Element && event.target.closest("a")) closeMenu();
  }

  return (
    <details className="mobile-menu" onClick={closeAfterNavigation} ref={menuRef}>
      <summary aria-controls="mobile-menu-panel" className="icon-link mobile-menu__toggle">
        <span aria-hidden="true" className="mobile-menu__bars" />
        <span className="visually-hidden">Toggle navigation menu</span>
      </summary>
      <div className="mobile-menu__panel" id="mobile-menu-panel">
        <StorefrontPrimaryNavigation variant="mobile" />
        <Link className="mobile-menu__link" href={isSignedIn ? "/account" : "/account/login"}>
          {isSignedIn ? "Your account" : "Sign in"}
        </Link>
      </div>
    </details>
  );
}
