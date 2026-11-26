import { describe, expect, it } from "vitest";
import type { PublicCollection, PublicProduct } from "./catalogue";
import {
  buildHomeCollectionShelves,
  formatDiscountPercent,
  priceAfterOffer,
  prioritizeHomeProducts,
} from "./merchandising";

function product({
  available = true,
  hasImage = true,
  hasOffer = false,
  slug,
}: {
  available?: boolean;
  hasImage?: boolean;
  hasOffer?: boolean;
  slug: string;
}): PublicProduct {
  return {
    id: slug,
    slug,
    title: slug,
    description: "",
    material: "lac",
    careInstructions: "",
    setCount: 4,
    deliveryFeeMinor: 0,
    reviewsEnabled: true,
    averageRating: 0,
    reviewCount: 0,
    lowStockVariants: [],
    sortOrder: 0,
    images: hasImage ? [{ id: slug, url: "/photo.jpg", altText: slug, sortOrder: 0 }] : [],
    offers: hasOffer
      ? [
          {
            id: "offer",
            name: "Offer",
            targetType: "product",
            targetName: slug,
            targetSlug: slug,
            minimumSets: 1,
            discountBasisPoints: 1_000,
            endsAt: null,
            bannerImage: null,
          },
        ]
      : [],
    collections: [],
    variants: [
      {
        id: "variant",
        sizeCode: "S",
        innerDiameterMm: 54,
        priceMinor: 1_000,
        isAvailable: available,
      },
    ],
  };
}

describe("homepage product merchandising", () => {
  it("shows pictured in-stock offers first, then keeps newest-first order", () => {
    const newest = product({ slug: "newest" });
    const offer = product({ slug: "offer", hasOffer: true });
    const soldOut = product({ slug: "sold-out", available: false });
    const missingPhoto = product({ slug: "no-photo", hasImage: false });
    const uatProduct = product({ slug: "qa-only-not-for-sale-test" });

    expect(prioritizeHomeProducts([newest, soldOut, missingPhoto, uatProduct, offer])).toEqual([
      offer,
      newest,
      uatProduct,
    ]);
  });

  it("groups only pictured in-stock products into the matching collection shelves", () => {
    const collection: PublicCollection = {
      id: "collection-a",
      slug: "collection-a",
      name: "Collection A",
      description: "",
      sortOrder: 0,
      images: [],
    };
    const emptyCollection: PublicCollection = {
      ...collection,
      id: "collection-empty",
      slug: "collection-empty",
      name: "Empty collection",
    };
    const newest = { ...product({ slug: "newest" }), collections: [collection] };
    const discounted = {
      ...product({ slug: "discounted", hasOffer: true }),
      collections: [collection],
    };
    const soldOut = {
      ...product({ slug: "sold-out", available: false }),
      collections: [collection],
    };
    const noPhoto = {
      ...product({ slug: "no-photo", hasImage: false }),
      collections: [collection],
    };

    expect(
      buildHomeCollectionShelves(
        [collection, emptyCollection],
        [newest, soldOut, noPhoto, discounted],
        2,
      ),
    ).toEqual([{ collection, products: [discounted, newest] }]);
  });
});

describe("offer card prices", () => {
  it("uses checkout-compatible whole minor-unit rounding", () => {
    expect(priceAfterOffer(10_001, 1_250)).toBe(8_751);
    expect(priceAfterOffer(10_000, 10_000)).toBe(0);
  });

  it("rejects invalid values and formats fractional percentages cleanly", () => {
    expect(priceAfterOffer(-1, 1_000)).toBeNull();
    expect(priceAfterOffer(1_000, 10_001)).toBeNull();
    expect(formatDiscountPercent(1_000)).toBe("10");
    expect(formatDiscountPercent(1_250)).toBe("12.5");
  });
});
