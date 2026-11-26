"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminNavigationGroups, isAdminNavigationItemActive } from "./admin-navigation-state";

const iconPaths: Readonly<Record<string, string>> = {
  Overview: "M3.5 10.5 12 3l8.5 7.5M5.5 9.5v10h13v-10M9 19.5v-6h6v6",
  Products: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4.5 7.7 12 12l7.5-4.3M12 12v8.5",
  Collections: "M4 5.5h16v4H4zM4 12h10v6.5H4zM17 12h3v6.5h-3z",
  Offers:
    "m12 3 2.3 5.4L20 10.7l-5.7 2.3L12 19l-2.3-6L4 10.7l5.7-2.3L12 3ZM18 16l1.2 2.8L22 20l-2.8 1.2L18 24l-1.2-2.8L14 20l2.8-1.2L18 16Z",
  Reviews: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  "Stock & inventory": "M4 6h16v14H4zM8 6V4h8v2M8 10v6M12 10v6M16 10v6",
  Orders: "M5 4h14v17H5zM8 8h8M8 12h8M8 16h5",
  Customers:
    "M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 3.5a3.5 3.5 0 0 1 0 6.8M17 14h.5a4.5 4.5 0 0 1 4.5 4.5V20",
  "Homepage content": "M4 4h16v16H4zM7 8h10M7 12h10M7 16h6",
  "Checkout settings": "M4 6h16M7 3v6M17 3v6M5 10h14v10H5zM8 14h4",
  "Account security": "M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3ZM9 12l2 2 4-4",
  "Team access":
    "M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 8v6M15 11h6",
  Activity: "M3 12h4l2.5-6 4.5 12 2.5-6H21",
};

export function AdminNavigation({
  isOwner,
  isCollapsed,
}: Readonly<{ isOwner: boolean; isCollapsed: boolean }>) {
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
                    aria-label={isCollapsed ? item.label : undefined}
                    className="admin-navigation__link"
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <svg
                      aria-hidden="true"
                      className="admin-navigation__icon"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d={iconPaths[item.label] ?? "M4 12h16M12 4v16"}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.65"
                      />
                    </svg>
                    <span className="admin-navigation__label">{item.label}</span>
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
