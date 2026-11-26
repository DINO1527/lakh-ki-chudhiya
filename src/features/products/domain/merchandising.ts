import type { HomeCollectionShelf, PublicCollection, PublicProduct } from "./catalogue";

/** Keep homepage cards in stock and photo-led while retaining newest-first order within each group. */
export function prioritizeHomeProducts(products: readonly PublicProduct[]): PublicProduct[] {
  return products
    .map((product, index) => ({ product, index }))
    .filter(
      ({ product }) =>
        product.images.length > 0 && product.variants.some((variant) => variant.isAvailable),
    )
    .sort(
      (left, right) =>
        Number(right.product.offers.length > 0) - Number(left.product.offers.length > 0) ||
        left.index - right.index,
    )
    .map(({ product }) => product);
}

/** Build compact photo-led shelves while preserving collection and product order. */
export function buildHomeCollectionShelves(
  collections: readonly PublicCollection[],
  products: readonly PublicProduct[],
  productsPerCollection = 4,
): HomeCollectionShelf[] {
  if (!Number.isSafeInteger(productsPerCollection) || productsPerCollection < 1) return [];

  const prioritizedProducts = prioritizeHomeProducts(products);
  return collections
    .map((collection) => ({
      collection,
      products: prioritizedProducts
        .filter((product) => product.collections.some((item) => item.id === collection.id))
        .slice(0, productsPerCollection),
    }))
    .filter((shelf) => shelf.products.length > 0);
}

export function priceAfterOffer(priceMinor: number, discountBasisPoints: number): number | null {
  if (
    !Number.isSafeInteger(priceMinor) ||
    priceMinor < 0 ||
    !Number.isSafeInteger(discountBasisPoints) ||
    discountBasisPoints < 0 ||
    discountBasisPoints > 10_000
  ) {
    return null;
  }
  return Math.round((priceMinor * (10_000 - discountBasisPoints)) / 10_000);
}

export function formatDiscountPercent(discountBasisPoints: number): string {
  if (
    !Number.isSafeInteger(discountBasisPoints) ||
    discountBasisPoints < 0 ||
    discountBasisPoints > 10_000
  ) {
    return "0";
  }
  return Number((discountBasisPoints / 100).toFixed(2)).toString();
}
