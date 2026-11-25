export type AdminNavigationItem = Readonly<{ href: string; label: string }>;
export type AdminNavigationGroup = Readonly<{
  label: string;
  items: readonly AdminNavigationItem[];
}>;

export function getAdminNavigationGroups(isOwner: boolean): readonly AdminNavigationGroup[] {
  return [
    { label: "Workspace", items: [{ href: "/admin", label: "Overview" }] },
    {
      label: "Catalogue",
      items: [
        { href: "/admin/products", label: "Products" },
        { href: "/admin/collections", label: "Collections" },
        { href: "/admin/offers", label: "Offers" },
      ],
    },
    {
      label: "Orders",
      items: [
        { href: "/admin/inventory", label: "Stock & inventory" },
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/customers", label: "Customers" },
      ],
    },
    {
      label: "Storefront",
      items: [
        { href: "/admin/content", label: "Homepage content" },
        ...(isOwner ? [{ href: "/admin/settings/commerce", label: "Checkout settings" }] : []),
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/admin/security", label: "Account security" },
        ...(isOwner
          ? [
              { href: "/admin/team", label: "Team access" },
              { href: "/admin/activity", label: "Activity" },
            ]
          : []),
      ],
    },
  ];
}

export function isAdminNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}
