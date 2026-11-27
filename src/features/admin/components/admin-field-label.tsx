import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminFieldLabel({
  icon: Icon,
  children,
}: Readonly<{ icon: LucideIcon; children: ReactNode }>) {
  return (
    <span className="admin-field__label">
      <Icon aria-hidden="true" className="admin-field__icon" size={16} strokeWidth={1.8} />
      <span>{children}</span>
    </span>
  );
}
