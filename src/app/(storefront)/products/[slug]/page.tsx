import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Package, Truck } from "lucide-react";
import { CatalogueNotice } from "@/features/products/components/catalogue-notice";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { StorefrontOfferList } from "@/features/products/components/storefront-offers";
import { VariantPicker } from "@/features/products/components/variant-picker";
import { ProductReviews } from "@/features/products/components/product-reviews";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import { getPublicProductBySlug } from "@/features/products/server/public-catalogue";
import { getPublicProductReviews } from "@/features/products/server/review-data";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicProductBySlug(slug);

  if (result.status !== "ready" || !result.data) {
    return { title: "Product | Lacora" };
  }

  return {
    title: `${result.data.title} | Lacora`,
    description: result.data.description || `Product details for ${result.data.title}.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getPublicProductBySlug(slug);
  if (result.status === "ready" && !result.data) notFound();

  if (result.status !== "ready") {
    return (
      <main className="page-shell" id="main-content">
        <p className="eyebrow">Product details</p>
        <h1 className="page-heading">Product catalogue unavailable</h1>
        <CatalogueNotice state={result.status} />
      </main>
    );
  }

  const product = result.data;
  if (!product) notFound();
  const reviews = product.reviewsEnabled ? await getPublicProductReviews(product.id) : null;

  return (
    <main className="page-shell product-page" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/shop">Shop</Link>
        {product.collections[0] && (
          <>
            <ChevronRight aria-hidden="true" size={15} />
            <Link href={`/shop?collection=${encodeURIComponent(product.collections[0].slug)}`}>
              {product.collections[0].name}
            </Link>
          </>
        )}
        <ChevronRight aria-hidden="true" size={15} />
        <span aria-current="page">{product.title}</span>
      </nav>

      <div className="product-detail">
        <ProductGallery
          className="product-detail__media"
          images={product.images}
          label={product.title}
          priority
        />

        <section aria-labelledby="product-title" className="product-detail__content">
          <header className="product-detail__header">
            <p className="eyebrow">{product.collections[0]?.name ?? "Handcrafted lac bangles"}</p>
            <h1 className="page-heading" id="product-title">
              {product.title}
            </h1>
            {product.variants.length > 0 ? (
              <p className="product-detail__starting-price">
                {product.variants.some((variant) => variant.isAvailable)
                  ? `From ${formatLkrPrice(
                      Math.min(
                        ...product.variants
                          .filter((variant) => variant.isAvailable)
                          .map((variant) => variant.priceMinor),
                      ),
                    )} per complete set`
                  : "Currently unavailable"}
              </p>
            ) : null}
          </header>
          <p className="product-detail__description">
            {product.description ||
              "A description will be added when product details are confirmed."}
          </p>

          <dl className="product-facts">
            <div>
              <dt>
                <Package aria-hidden="true" size={16} /> Sold as
              </dt>
              <dd>{`Set of ${product.setCount} bangles`}</dd>
            </div>
            {product.deliveryFeeMinor !== null ? (
              <div>
                <dt>
                  <Truck aria-hidden="true" size={16} /> Delivery
                </dt>
                <dd>
                  {product.deliveryFeeMinor === 0
                    ? "Free"
                    : formatLkrPrice(product.deliveryFeeMinor)}
                </dd>
              </div>
            ) : null}
            {product.material && (
              <div>
                <dt>Material</dt>
                <dd>{product.material}</dd>
              </div>
            )}
          </dl>

          <StorefrontOfferList compact offers={product.offers} />

          <div className="product-detail__purchase-card">
            {product.variants.length > 0 ? (
              <VariantPicker variants={product.variants} />
            ) : (
              <p className="product-detail__availability" role="status">
                Available sizes are being confirmed.
              </p>
            )}
          </div>

          {product.careInstructions && (
            <details className="product-care">
              <summary>Care guidance</summary>
              <p>{product.careInstructions}</p>
            </details>
          )}

          <p className="product-detail__note">
            Your selected size and current price are checked again before order confirmation. Adding
            an item to your bag does not reserve stock.
          </p>
        </section>
      </div>
      {product.reviewsEnabled ? <ProductReviews data={reviews} /> : null}
    </main>
  );
}
