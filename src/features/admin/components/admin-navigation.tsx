"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminNavigationGroups, isAdminNavigationItemActive } from "./admin-navigation-state";

export function AdminNavigation({ isOwner }: Readonly<{ isOwner: boolean }>) {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav aria-label="Admin navigation" className="admin-navigation">
      {getAdminNavigationGroups(isOwner).map((group) => (
        <div className="admin-navigation__group" key={group.label}>
          <h2 className="admin-navigation__group-title">{group.label}</h2>
          <ul className="admin-navigation__list">
            {group.items.map((item) => {
              const isCurrent = isAdminNavigationItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    aria-current={isCurrent ? "page" : undefined}
                    className="admin-navigation__link"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
