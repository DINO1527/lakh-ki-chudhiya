import { describe, expect, it } from "vitest";
import { buildCataloguePageHref, normalizeCatalogueFilters } from "./catalogue";

describe("normalizeCatalogueFilters", () => {
  it("keeps safe, bounded URL-addressable filters", () => {
    expect(
      normalizeCatalogueFilters({
        q: "  Ruby% bangles  ",
        collection: "bridal-edit",
        size: "2-6",
        sort: "name",
        page: "3",
      }),
    ).toEqual({
      search: "Ruby bangles",
      collectionSlug: "bridal-edit",
      sizeCode: "2-6",
      sort: "name",
      page: 3,
    });
  });

  it("falls back safely for invalid values and caps the page number", () => {
    expect(
      normalizeCatalogueFilters({
        collection: "../drafts",
        size: "2/6",
        sort: "price",
        page: "-4",
      }),
    ).toEqual({
      search: "",
      collectionSlug: "",
      sizeCode: "",
      sort: "featured",
      page: 1,
    });
    expect(normalizeCatalogueFilters({ page: "500000" }).page).toBe(10_000);
  });
});

describe("buildCataloguePageHref", () => {
  it("preserves filters when building a pagination link", () => {
    expect(
      buildCataloguePageHref(
        {
          search: "ruby bangles",
          collectionSlug: "bridal-edit",
          sizeCode: "2-6",
          sort: "name",
          page: 1,
        },
        2,
      ),
    ).toBe("/shop?q=ruby+bangles&collection=bridal-edit&size=2-6&sort=name&page=2");
  });
});
