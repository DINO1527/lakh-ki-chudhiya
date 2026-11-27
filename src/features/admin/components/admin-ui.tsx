import type { ReactNode } from "react";
import { AdminToast } from "./admin-toast-provider";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: Readonly<{ eyebrow: string; title: string; description?: string; action?: ReactNode }>) {
  return (
    <header className="admin-page-header">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="admin-page-header__description">{description}</p> : null}
      </div>
      {action ? <div className="admin-page-header__action">{action}</div> : null}
    </header>
  );
}

export function AdminSectionHeading({
  eyebrow,
  title,
  id,
  action,
}: Readonly<{ eyebrow: string; title: string; id?: string; action?: ReactNode }>) {
  return (
    <div className="admin-section-heading">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      {action ? <div className="admin-section-heading__action">{action}</div> : null}
    </div>
  );
}

export function AdminNotice({
  children,
  tone = "info",
}: Readonly<{ children: ReactNode; tone?: "info" | "success" | "error" }>) {
  if (tone === "info") {
    return <p className="admin-alert admin-alert--info">{children}</p>;
  }

  return <AdminToast tone={tone}>{children}</AdminToast>;
}

export function StatusBadge({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="admin-status">{children}</span>;
}

export function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}
