import type { ProductVariant } from "./product-variant";

export const PRODUCTS_PER_PAGE = 12;

export type CatalogueSearchParams = Record<string, string | string[] | undefined>;

export type CatalogueFilters = {
  search: string;
  collectionSlug: string;
  sizeCode: string;
  colourName: string;
  sort: "featured" | "name";
  page: number;
};

export type CatalogueFilterOptions = {
  sizeCodes: readonly string[];
  colourNames: readonly string[];
};

export type PublicCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isUatFixture: boolean;
};

export type PublicProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  material: string;
  careInstructions: string;
  setCount: number;
  sortOrder: number;
  collections: readonly PublicCollection[];
  variants: readonly ProductVariant[];
  isUatFixture: boolean;
};

export function normalizeCatalogueFilters(searchParams: CatalogueSearchParams): CatalogueFilters {
  const rawSearch = firstValue(searchParams.q)
    .normalize("NFKC")
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawCollection = firstValue(searchParams.collection).toLowerCase();
  const collectionSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawCollection) ? rawCollection : "";
  const rawSizeCode = firstValue(searchParams.size).normalize("NFKC").trim().slice(0, 16);
  const sizeCode = /^[\p{L}\p{N}-]+$/u.test(rawSizeCode) ? rawSizeCode : "";
  const rawColourName = firstValue(searchParams.colour)
    .normalize("NFKC")
    .slice(0, 40)
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawPage = firstValue(searchParams.page);
  const pageNumber = /^[0-9]{1,6}$/.test(rawPage) ? Number(rawPage) : 1;
  const page =
    Number.isSafeInteger(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 10_000) : 1;

  return {
    search: rawSearch,
    collectionSlug,
    sizeCode,
    colourName: rawColourName,
    sort: firstValue(searchParams.sort) === "name" ? "name" : "featured",
    page,
  };
}

export function buildCataloguePageHref(
  filters: CatalogueFilters,
  page: number,
  basePath = "/shop",
): string {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (basePath === "/shop" && filters.collectionSlug) {
    params.set("collection", filters.collectionSlug);
  }
  if (filters.sizeCode) params.set("size", filters.sizeCode);
  if (filters.colourName) params.set("colour", filters.colourName);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
