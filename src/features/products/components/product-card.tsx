import Link from "next/link";
import Image from "next/image";
import { formatLkrPrice } from "../domain/product-variant";
import type { PublicProduct } from "../domain/catalogue";

export function ProductCard({ product }: { product: PublicProduct }) {
  const prices = product.variants
    .filter((variant) => variant.isAvailable)
    .map((variant) => variant.priceMinor);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <li className="product-card">
      <Link className="product-card__link" href={`/products/${product.slug}`}>
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
            <span>Photography forthcoming</span>
          )}
        </span>
        <span className="product-card__content">
          {product.isUatFixture && (
            <span className="fixture-badge">UAT example · not for sale</span>
          )}
          <span className="product-card__title">{product.title}</span>
          {product.collections.length > 0 && (
            <span className="product-card__collection">
              {product.collections.map((collection) => collection.name).join(" · ")}
            </span>
          )}
          <span className="product-card__price">
            {lowestPrice === null
              ? "Currently unavailable"
              : `${product.isUatFixture ? "Test price · " : "From "}${formatLkrPrice(lowestPrice)}`}
          </span>
        </span>
      </Link>
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
