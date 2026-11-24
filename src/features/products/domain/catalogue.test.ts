import { describe, expect, it } from "vitest";
import { buildCataloguePageHref, describeOfferTerms, normalizeCatalogueFilters } from "./catalogue";

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

describe("describeOfferTerms", () => {
  it("describes a product offer using complete-set quantities", () => {
    expect(
      describeOfferTerms({
        id: "offer-1",
        name: "Ruby Weekend",
        targetType: "product",
        targetName: "Ruby Crimson Set",
        targetSlug: "ruby-crimson-set",
        minimumSets: 3,
        discountBasisPoints: 1_000,
        endsAt: null,
      }),
    ).toBe("Save 10% when you buy 3 or more complete sets of Ruby Crimson Set.");
  });

  it("keeps fractional collection discounts accurate and singular quantities grammatical", () => {
    expect(
      describeOfferTerms({
        id: "offer-2",
        name: "Pastel Edit",
        targetType: "collection",
        targetName: "Pastel",
        targetSlug: "pastel",
        minimumSets: 1,
        discountBasisPoints: 1_250,
        endsAt: null,
      }),
    ).toBe("Save 12.5% when you buy 1 or more complete set from the Pastel collection.");
  });
});
