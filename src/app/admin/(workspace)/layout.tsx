import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireStaff } from "@/features/admin/server/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: "Admin | Lacora", template: "%s | Lacora Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [{ user, role }, cookieStore] = await Promise.all([requireStaff(), cookies()]);
  return (
    <AdminShell
      defaultSidebarCollapsed={cookieStore.get("admin_sidebar_collapsed")?.value === "true"}
      email={user.email ?? "Staff account"}
      role={role}
    >
      {children}
    </AdminShell>
  );
}
