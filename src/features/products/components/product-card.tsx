import Link from "next/link";
import Image from "next/image";
import { ProductSelectionDialog } from "@/features/cart/components/product-selection-dialog";
import { describeOfferTerms } from "../domain/catalogue";
import { formatLkrPrice } from "../domain/product-variant";
import type { PublicProduct } from "../domain/catalogue";

export function ProductCard({ product }: { product: PublicProduct }) {
  const prices = product.variants
    .filter((variant) => variant.isAvailable)
    .map((variant) => variant.priceMinor);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
  const availableSizes = product.variants
    .filter((variant) => variant.isAvailable)
    .map((variant) => variant.sizeCode)
    .filter((sizeCode): sizeCode is string => Boolean(sizeCode));

  return (
    <li className="product-card" data-uat={product.isUatFixture ? "true" : undefined}>
      <article className="product-card__inner">
        <Link
          aria-label={`View ${product.title} details`}
          className="product-card__link"
          href={`/products/${product.slug}`}
        >
          <span className="product-card__media-placeholder">
            {product.images[0] ? (
              <Image
                alt={product.images[0].altText}
                className="product-card__image"
                height={800}
                src={product.images[0].url}
                unoptimized
                width={800}
              />
            ) : (
              <span className="product-card__no-image">
                <span aria-hidden="true" className="product-card__no-image-mark">
                  L
                </span>
                Product photographs will appear here
              </span>
            )}
          </span>
          <span className="product-card__content">
            {product.isUatFixture && (
              <span className="fixture-badge">UAT example · not for sale</span>
            )}
            {product.collections.length > 0 && (
              <span className="product-card__collection">
                {product.collections.map((collection) => collection.name).join(" · ")}
              </span>
            )}
            <span className="product-card__title">{product.title}</span>
            <span className="product-card__set-count">Set of {product.setCount} bangles</span>
            <span className="product-card__price">
              {lowestPrice === null
                ? "Currently unavailable"
                : `${product.isUatFixture ? "Test price · " : "From "}${formatLkrPrice(lowestPrice)} per set`}
            </span>
            {product.deliveryFeeMinor !== null && (
              <span className="product-card__delivery">
                {product.deliveryFeeMinor === 0
                  ? "Free delivery"
                  : `Delivery ${formatLkrPrice(product.deliveryFeeMinor)}`}
              </span>
            )}
            {product.offers[0] && (
              <span className="product-card__offer">
                {describeOfferTerms(product.offers[0])}
                {product.offers.length > 1 &&
                  ` Plus ${product.offers.length - 1} more offer${product.offers.length === 2 ? "" : "s"}.`}
              </span>
            )}
            <span className="product-card__sizes">
              {availableSizes.length > 0
                ? `Available sizes: ${availableSizes.join(", ")}`
                : "No sizes currently available"}
            </span>
          </span>
        </Link>
        <div className="product-card__footer">
          {lowestPrice !== null && !product.isUatFixture ? (
            <ProductSelectionDialog
              product={{
                slug: product.slug,
                title: product.title,
                setCount: product.setCount,
                isUatFixture: product.isUatFixture,
                image: product.images[0] ?? null,
                variants: product.variants,
              }}
            />
          ) : (
            <Link className="product-card__details-link" href={`/products/${product.slug}`}>
              {product.isUatFixture ? "Example details" : "View details"}
            </Link>
          )}
          <Link className="product-card__more-link" href={`/products/${product.slug}`}>
            More details <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

export function ProductGrid({ products }: { products: readonly PublicProduct[] }) {
  return (
    <ul aria-label="Bangle catalogue" className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
