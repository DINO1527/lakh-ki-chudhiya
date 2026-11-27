import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { formatLkrPrice } from "../domain/product-variant";
import { formatDiscountPercent, priceAfterOffer } from "../domain/merchandising";
import type { PublicProduct } from "../domain/catalogue";

export function ProductCard({
  product,
  priorityImage = false,
}: {
  product: PublicProduct;
  priorityImage?: boolean;
}) {
  const availableVariants = product.variants.filter((variant) => variant.isAvailable);
  const lowestPrice =
    availableVariants.length > 0
      ? Math.min(...availableVariants.map((variant) => variant.priceMinor))
      : null;
  const availableSizes = availableVariants
    .map((variant) => variant.sizeCode)
    .filter((sizeCode): sizeCode is string => Boolean(sizeCode));
  const sizePreview = availableSizes.slice(0, 3).join(" / ");
  const sizeSummary =
    availableSizes.length > 3 ? `${sizePreview} +${availableSizes.length - 3} more` : sizePreview;
  const offer = [...product.offers].sort(
    (left, right) =>
      right.discountBasisPoints - left.discountBasisPoints || left.minimumSets - right.minimumSets,
  )[0];
  const offerPrice =
    lowestPrice !== null && offer ? priceAfterOffer(lowestPrice, offer.discountBasisPoints) : null;
  const lowestStock = [...product.lowStockVariants].sort(
    (left, right) => left.availableSets - right.availableSets,
  )[0];
  const roundedRating = Math.round(product.averageRating);

  return (
    <li className="product-card">
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
                fill
                loading={priorityImage ? "eager" : "lazy"}
                sizes="(max-width: 36rem) calc(50vw - 1.2rem), (max-width: 70rem) 31vw, 22rem"
                src={product.images[0].url}
                unoptimized
              />
            ) : (
              <span className="product-card__no-image">
                <span aria-hidden="true" className="product-card__no-image-mark">
                  L
                </span>
                Product photographs will appear here
              </span>
            )}
            {offer && (
              <span className="product-card__offer-badge">
                Save {formatDiscountPercent(offer.discountBasisPoints)}%
                {offer.minimumSets > 1 ? ` · ${offer.minimumSets}+ sets` : ""}
              </span>
            )}
          </span>
          <span className="product-card__content">
            {product.collections.length > 0 && (
              <span className="product-card__collection">
                {product.collections.map((collection) => collection.name).join(" · ")}
              </span>
            )}
            <span className="product-card__title">{product.title}</span>
            {product.reviewsEnabled && product.reviewCount > 0 && (
              <span className="product-card__rating">
                {product.reviewCount > 0 ? (
                  <>
                    <span aria-label={`${product.averageRating.toFixed(1)} out of 5 stars`}>
                      <span aria-hidden="true">
                        {"★".repeat(roundedRating)}
                        {"☆".repeat(5 - roundedRating)}
                      </span>
                    </span>
                    <span>
                      {product.averageRating.toFixed(1)} · {product.reviewCount}{" "}
                      {product.reviewCount === 1 ? "review" : "reviews"}
                    </span>
                  </>
                ) : (
                  <span>No reviews yet</span>
                )}
              </span>
            )}
            <span className="product-card__price-line">
              {offerPrice !== null && lowestPrice !== null ? (
                <>
                  <strong className="product-card__price">{formatLkrPrice(offerPrice)}</strong>
                  <s>{formatLkrPrice(lowestPrice)}</s>
                  <small>
                    {offer && offer.minimumSets > 1
                      ? `per set with ${offer.minimumSets}+ sets`
                      : "per set"}
                  </small>
                </>
              ) : lowestPrice !== null ? (
                <strong className="product-card__price">
                  From {formatLkrPrice(lowestPrice)} per set
                </strong>
              ) : null}
            </span>
            <span className="product-card__metadata">
              Set of {product.setCount} · {sizeSummary || "Size unavailable"}
            </span>
            {lowestStock && (
              <span className="product-card__stock">
                Only {lowestStock.availableSets} left
                {lowestStock.sizeCode ? ` in size ${lowestStock.sizeCode}` : ""}
              </span>
            )}
          </span>
        </Link>
        <div className="product-card__footer">
          <Link
            aria-label={`View ${product.title}, choose a size and add it to your bag`}
            className="product-card__view-button"
            href={`/products/${product.slug}`}
          >
            <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>View design</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

export function ProductGrid({
  products,
  ariaLabel = "Bangle catalogue",
  priorityFirstImage = false,
}: {
  products: readonly PublicProduct[];
  ariaLabel?: string;
  priorityFirstImage?: boolean;
}) {
  return (
    <ul aria-label={ariaLabel} className="product-grid">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          priorityImage={priorityFirstImage && index === 0}
          product={product}
        />
      ))}
    </ul>
  );
}
