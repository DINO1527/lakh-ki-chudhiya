import Link from "next/link";

type QueryValue = string | readonly string[] | undefined;

export function AdminPagination({
  action,
  page,
  pageSize,
  total,
  query,
  itemLabel,
}: Readonly<{
  action: string;
  page: number;
  pageSize: number;
  total: number;
  query: Readonly<Record<string, QueryValue>>;
  itemLabel: string;
}>) {
  if (total <= pageSize) return null;

  const pageCount = Math.ceil(total / pageSize);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);
  const hrefFor = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "page" || value === undefined) continue;
      if (typeof value === "string") {
        params.set(key, value);
      } else {
        for (const item of value) params.append(key, item);
      }
    }
    params.set("page", String(nextPage));
    return `${action}?${params.toString()}`;
  };

  return (
    <nav aria-label={`${itemLabel} pagination`} className="admin-pager">
      <p aria-live="polite">
        Showing {firstItem}–{lastItem} of {total} {itemLabel}
      </p>
      <div className="admin-pager__controls">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} rel="prev">
            Previous
          </Link>
        ) : (
          <span aria-disabled="true">Previous</span>
        )}
        <span>
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} rel="next">
            Next
          </Link>
        ) : (
          <span aria-disabled="true">Next</span>
        )}
      </div>
    </nav>
  );
}
