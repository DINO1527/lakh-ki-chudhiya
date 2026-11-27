import Link from "next/link";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function AdminSearchForm({
  action,
  query,
  label = "Search",
  placeholder,
  hasFilters = false,
  children,
}: Readonly<{
  action: string;
  query: string;
  label?: string;
  placeholder?: string;
  hasFilters?: boolean;
  children?: ReactNode;
}>) {
  return (
    <form action={action} className="admin-filter" method="get" role="search">
      <div className="admin-filter__fields">
        <label className="admin-field admin-field--compact">
          <span>{label}</span>
          <input
            defaultValue={query}
            maxLength={100}
            name="q"
            placeholder={placeholder}
            type="search"
          />
        </label>
        {children}
      </div>
      <div className="admin-filter__actions">
        <button className="admin-button admin-button--secondary" type="submit">
          <Search aria-hidden="true" className="admin-button__icon" size={16} strokeWidth={1.8} />
          Search
        </button>
        {query || hasFilters ? (
          <Link className="admin-text-link admin-filter__clear" href={action}>
            <X aria-hidden="true" size={15} strokeWidth={1.8} />
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
