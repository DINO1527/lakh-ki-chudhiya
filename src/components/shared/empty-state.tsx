import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <section aria-labelledby="empty-state-title" className="empty-state">
      <span aria-hidden="true" className="empty-state__ornament" />
      <h2 className="empty-state__title" id="empty-state-title">
        {title}
      </h2>
      <div className="empty-state__description">{children}</div>
    </section>
  );
}
