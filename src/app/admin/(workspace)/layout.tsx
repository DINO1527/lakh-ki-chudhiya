import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireStaff } from "@/features/admin/server/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: "Admin | Lakh Ki Chudhiya", template: "%s | Lakh Ki Chudhiya Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { user, role } = await requireStaff();
  return (
    <AdminShell email={user.email ?? "Staff account"} role={role}>
      {children}
    </AdminShell>
  );
}
