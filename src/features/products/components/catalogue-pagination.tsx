import Link from "next/link";
import { buildCataloguePageHref, type CatalogueFilters } from "../domain/catalogue";

type CataloguePaginationProps = {
  filters: CatalogueFilters;
  totalPages: number;
  basePath?: string;
};

export function CataloguePagination({
  filters,
  totalPages,
  basePath = "/shop",
}: CataloguePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Catalogue pages" className="catalogue-pagination">
      {filters.page > 1 && (
        <Link href={buildCataloguePageHref(filters, filters.page - 1, basePath)} rel="prev">
          Previous page
        </Link>
      )}
      <span aria-current="page">
        Page {filters.page} of {totalPages}
      </span>
      {filters.page < totalPages && (
        <Link href={buildCataloguePageHref(filters, filters.page + 1, basePath)} rel="next">
          Next page
        </Link>
      )}
    </nav>
  );
}
