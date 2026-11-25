import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueNotice, UatFixtureNotice } from "@/features/products/components/catalogue-notice";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { StorefrontOfferList } from "@/features/products/components/storefront-offers";
import { VariantPicker } from "@/features/products/components/variant-picker";
import { formatLkrPrice } from "@/features/products/domain/product-variant";
import { getPublicProductBySlug } from "@/features/products/server/public-catalogue";

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
    robots: result.data.isUatFixture ? { index: false, follow: false } : undefined,
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

  return (
    <main className="page-shell product-page" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/shop">Shop</Link>
        {product.collections[0] && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/collections/${product.collections[0].slug}`}>
              {product.collections[0].name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.title}</span>
      </nav>

      <div className="product-detail">
        <ProductGallery
          className="product-detail__media"
          images={product.images}
          label={product.title}
        />

        <section aria-labelledby="product-title" className="product-detail__content">
          <p className="eyebrow">{product.collections[0]?.name ?? "Handcrafted lac bangles"}</p>
          <h1 className="page-heading" id="product-title">
            {product.title}
          </h1>
          {product.isUatFixture && <UatFixtureNotice />}
          <p className="product-detail__description">
            {product.description ||
              "A description will be added when product details are confirmed."}
          </p>

          <dl className="product-facts">
            <div>
              <dt>Sold as</dt>
              <dd>{`Set of ${product.setCount} bangles`}</dd>
            </div>
            {product.deliveryFeeMinor !== null ? (
              <div>
                <dt>Delivery</dt>
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

          {product.variants.length > 0 ? (
            <VariantPicker isUatFixture={product.isUatFixture} variants={product.variants} />
          ) : (
            <p className="product-detail__availability" role="status">
              Available sizes are being confirmed.
            </p>
          )}

          {product.careInstructions && (
            <details className="product-care">
              <summary>Care guidance</summary>
              <p>{product.careInstructions}</p>
            </details>
          )}

          <p className="product-detail__note">
            Availability is confirmed before fulfilment. Product details are published after they
            are verified.
          </p>
          <Link className="text-link" href="/size-guide">
            Read the size guide <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
