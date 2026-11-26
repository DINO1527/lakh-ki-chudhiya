import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminProductSectionTabs } from "@/features/admin/components/admin-product-section-tabs";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { ImageUploadPreview } from "@/features/admin/components/image-upload-preview";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import {
  archiveProduct,
  archiveProductImage,
  publishProduct,
  publishProductImage,
  saveProductVariant,
  setProductCollections,
  updateProductImage,
  updateProduct,
  uploadProductImage,
} from "@/features/admin/server/product-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusMessages: Record<string, string> = {
  saved: "Changes saved.",
  created: "Draft created. Add at least one variant and image before publishing.",
  published: "Product published. It is now eligible to appear in the public catalogue.",
  archived: "Product archived and removed from public catalogue results.",
  "media=uploaded": "Image uploaded privately as a draft asset.",
  "media=archived": "Image archived. It can no longer be signed for public viewing.",
  "media=updated": "Image details saved.",
  "media=published": "Image published to the product gallery.",
};

export default async function AdminProductEditorPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ id }, query, { supabase }] = await Promise.all([params, searchParams, requireStaff()]);
  if (!UUID_PATTERN.test(id)) notFound();

  const [
    productResult,
    variantsResult,
    collectionsResult,
    linksResult,
    mediaResult,
    productCountResult,
    reviewSettingsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, title, description, material, care_instructions, set_count, delivery_fee_minor, cod_enabled, status, sort_order, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("product_variants")
      .select(
        "id, sku, size_code, inner_diameter_mm, price_minor, compare_at_price_minor, stock_on_hand, reserved_quantity, is_active, is_available",
      )
      .eq("product_id", id)
      .order("sku", { ascending: true })
      .limit(500),
    supabase
      .from("collections")
      .select("id, name, status")
      .order("sort_order")
      .order("name")
      .limit(1_000),
    supabase.from("product_collections").select("collection_id").eq("product_id", id).limit(1_000),
    supabase
      .from("product_media")
      .select("id, storage_path, alt_text, status, sort_order")
      .eq("product_id", id)
      .order("sort_order")
      .limit(100),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("reviews_enabled").eq("id", id).maybeSingle(),
  ]);

  if (productResult.error)
    logAdminQueryFailure("loadProduct", "products", productResult.error.code);
  if (variantsResult.error)
    logAdminQueryFailure("loadProductVariants", "product_variants", variantsResult.error.code);
  if (collectionsResult.error)
    logAdminQueryFailure("loadProductCollections", "collections", collectionsResult.error.code);
  if (linksResult.error)
    logAdminQueryFailure(
      "loadProductCollectionLinks",
      "product_collections",
      linksResult.error.code,
    );
  if (mediaResult.error)
    logAdminQueryFailure("loadProductMedia", "product_media", mediaResult.error.code);
  if (productCountResult.error)
    logAdminQueryFailure("countProductsForOrder", "products", productCountResult.error.code);
  const reviewSettingColumnMissing = ["PGRST204", "42703", "42501"].includes(
    reviewSettingsResult.error?.code ?? "",
  );
  if (reviewSettingsResult.error && !reviewSettingColumnMissing)
    logAdminQueryFailure("loadProductReviewSetting", "products", reviewSettingsResult.error.code);
  if (!productResult.data) notFound();
  const product = {
    ...productResult.data,
    reviews_enabled: reviewSettingsResult.data?.reviews_enabled ?? true,
  };
  const maximumProductPosition = Math.max(0, (productCountResult.count ?? 1) - 1);
  const productDisplayPosition = Math.min(maximumProductPosition, Math.max(0, product.sort_order));
  const variants = variantsResult.data ?? [];
  const collections = collectionsResult.data ?? [];
  const selectedCollectionIds = new Set((linksResult.data ?? []).map((link) => link.collection_id));
  const media = await Promise.all(
    (mediaResult.data ?? []).map(async (item) => {
      const { data } = await supabase.storage
        .from("product-media")
        .createSignedUrl(item.storage_path, 300);
      return { ...item, signedUrl: data?.signedUrl ?? null };
    }),
  );
  const errorValue = Array.isArray(query.error) ? query.error[0] : query.error;
  const flashValue = [
    query.saved ? "saved" : "",
    query.created ? "created" : "",
    query.published ? "published" : "",
    query.archived ? "archived" : "",
  ].find(Boolean);

  return (
    <>
      <AdminPageHeader
        eyebrow={`Product · ${product.slug}`}
        title={product.title}
        description="Edit the catalogue details, then manage sizes, collections and photos one focused task at a time."
        action={
          <Link
            className="admin-button admin-button--secondary"
            href={`/admin/products/${id}/preview`}
          >
            Private preview
          </Link>
        }
      />
      {flashValue ? <AdminNotice tone="success">{statusMessages[flashValue]}</AdminNotice> : null}
      {query.media === "uploaded" ? (
        <AdminNotice tone="success">{statusMessages["media=uploaded"]}</AdminNotice>
      ) : null}
      {query.media === "archived" ? (
        <AdminNotice tone="success">{statusMessages["media=archived"]}</AdminNotice>
      ) : null}
      {query.media === "updated" || query.media === "published" ? (
        <AdminNotice tone="success">{statusMessages[`media=${query.media}`]}</AdminNotice>
      ) : null}
      {errorValue ? (
        <AdminNotice tone="error">
          {errorValue === "media_limit"
            ? "A product can have up to 20 active gallery images. Archive one before adding another."
            : errorValue === "last_image"
              ? "Keep one published image on a published product. Archive the product first to remove the last image."
              : errorValue === "order"
                ? "Product details were saved, but the catalogue position could not be updated. Refresh the database setup and try again."
                : errorValue === "publish_requirements"
                  ? "Before publishing, complete the care instructions, set a delivery fee, add an active size and upload at least one product image."
                  : "The change could not be saved. Check required fields and try again."}
        </AdminNotice>
      ) : null}
      {productResult.error ||
      variantsResult.error ||
      collectionsResult.error ||
      linksResult.error ||
      mediaResult.error ? (
        <AdminNotice tone="error">
          Some product information could not be loaded. Refresh or contact the owner.
        </AdminNotice>
      ) : null}

      <div className="admin-product-toolbar">
        <div className="admin-product-status" id="product-actions">
          <div>
            <p className="admin-eyebrow">Product status</p>
            <StatusBadge>{product.status}</StatusBadge>
          </div>
          <p>
            Only published products appear in the storefront. Save section changes before
            publishing.
          </p>
        </div>
        <div className="admin-inline-actions">
          {product.status !== "published" ? (
            <form action={publishProduct}>
              <input name="product_id" type="hidden" value={id} />
              <ConfirmButton
                className="admin-button admin-button--primary"
                formAction={publishProduct}
                message="Publish this product? Shoppers will be able to see eligible product details and images."
              >
                Review and publish
              </ConfirmButton>
            </form>
          ) : null}
          {product.status !== "archived" ? (
            <form action={archiveProduct}>
              <input name="product_id" type="hidden" value={id} />
              <ConfirmButton
                className="admin-button admin-button--danger"
                formAction={archiveProduct}
                message="Archive this product? It will disappear from the public catalogue."
              >
                Archive product
              </ConfirmButton>
            </form>
          ) : null}
          <Link className="admin-button admin-button--quiet" href="/admin/products">
            Back to products
          </Link>
        </div>
      </div>

      <AdminProductSectionTabs
        sections={[
          { id: "product-details", label: "Details & reviews" },
          { id: "product-collections", label: "Collections" },
          { id: "product-variants", label: "Sizes & prices" },
          { id: "product-images", label: "Photos" },
        ]}
      >
        <section
          aria-labelledby="product-details-heading"
          className="admin-panel"
          id="product-details"
        >
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Catalogue copy</p>
              <h2 id="product-details-heading">Product details</h2>
            </div>
          </div>
          <form action={updateProduct} className="admin-form">
            <input name="product_id" type="hidden" value={id} />
            <div className="admin-form__row">
              <label className="admin-field">
                <span>Product name</span>
                <input
                  defaultValue={product.title}
                  maxLength={160}
                  minLength={1}
                  name="title"
                  required
                />
                <small>Include the colour in the name. Each colour is a separate product.</small>
              </label>
              <label className="admin-field">
                <span>Slug</span>
                <input defaultValue={product.slug} maxLength={100} name="slug" required />
              </label>
            </div>
            <label className="admin-field">
              <span>Description</span>
              <textarea
                defaultValue={product.description}
                maxLength={8_000}
                name="description"
                rows={5}
              />
            </label>
            <label className="admin-field">
              <span>Material</span>
              <input defaultValue={product.material} maxLength={160} name="material" />
            </label>
            <label className="admin-field">
              <span>Care instructions</span>
              <textarea
                defaultValue={product.care_instructions}
                maxLength={2_000}
                name="care_instructions"
                required={product.status === "published"}
                rows={4}
              />
            </label>
            <div className="admin-form__row">
              <label className="admin-field">
                <span>Bangles in each set</span>
                <input
                  defaultValue={product.set_count}
                  max="32"
                  min="2"
                  name="set_count"
                  required
                  step="1"
                  type="number"
                />
              </label>
              <label className="admin-field">
                <span>Display order</span>
                <input
                  defaultValue={productDisplayPosition}
                  max={maximumProductPosition}
                  min="0"
                  name="sort_order"
                  required
                  step="1"
                  type="number"
                />
                <small>
                  Choose a position from 0 to {maximumProductPosition}. Other products shift to keep
                  the order unique.
                </small>
              </label>
            </div>
            <label className="admin-field">
              <span>Delivery fee per order (LKR)</span>
              <input
                defaultValue={
                  product.delivery_fee_minor === null
                    ? ""
                    : formatMinorInput(product.delivery_fee_minor)
                }
                inputMode="decimal"
                max="21474836.47"
                min="0"
                name="delivery_fee_lkr"
                placeholder="Enter 0 for free delivery"
                step="0.01"
                type="number"
              />
              <small>
                {product.delivery_fee_minor === null
                  ? "Required before publishing."
                  : "The highest fee in a cart is charged once."}
              </small>
            </label>
            <label className="admin-checkbox">
              <input defaultChecked={product.cod_enabled} name="cod_enabled" type="checkbox" />
              <span>
                Allow cash on delivery for this product
                <small>Cash on delivery also needs to be enabled in Commerce settings.</small>
              </span>
            </label>
            <label className="admin-checkbox admin-checkbox--wide" id="product-reviews">
              <input
                defaultChecked={product.reviews_enabled}
                disabled={reviewSettingColumnMissing}
                name="reviews_enabled"
                type="checkbox"
              />
              <span>
                Allow verified customers to review this product
                <small>
                  {reviewSettingColumnMissing
                    ? "Review settings are available after the current UAT database update."
                    : "Reviews can be left after delivery and appear once approved."}
                </small>
              </span>
            </label>
            <ConfirmButton
              className="admin-button admin-button--primary"
              formAction={updateProduct}
              message="Save these product details? If you changed the display order, products between the old and new positions will move to keep the catalogue in a clear order."
            >
              Save product details
            </ConfirmButton>
          </form>
        </section>

        <section
          aria-labelledby="product-collections-heading"
          className="admin-panel"
          id="product-collections"
        >
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Discovery</p>
              <h2 id="product-collections-heading">Collections</h2>
            </div>
          </div>
          {collectionsResult.error ? null : collections.length ? (
            <div className="admin-section-actions">
              <p className="admin-muted">
                {selectedCollectionIds.size
                  ? `${selectedCollectionIds.size} collection${selectedCollectionIds.size === 1 ? "" : "s"} selected`
                  : "This product is not assigned to a collection."}
              </p>
              <AdminDialog
                description="Choose where this product appears in the storefront."
                title="Collections"
                triggerLabel="Edit assignments"
              >
                <form action={setProductCollections} className="admin-form">
                  <input name="product_id" type="hidden" value={id} />
                  <div className="admin-checkbox-list">
                    {collections.map((collection) => (
                      <label className="admin-checkbox" key={collection.id}>
                        <input
                          defaultChecked={selectedCollectionIds.has(collection.id)}
                          name="collection_ids"
                          type="checkbox"
                          value={collection.id}
                        />
                        <span>
                          {collection.name}
                          <small>{collection.status}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <AdminSubmitButton>Save assignments</AdminSubmitButton>
                </form>
              </AdminDialog>
            </div>
          ) : (
            <p className="admin-muted">Create a collection before assigning this product.</p>
          )}
        </section>

        <section
          aria-labelledby="product-variants-heading"
          className="admin-panel"
          id="product-variants"
        >
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Sellable SKUs</p>
              <h2 id="product-variants-heading">Sizes and prices</h2>
            </div>
            <Link className="admin-text-link" href="/admin/inventory">
              Open inventory
            </Link>
          </div>
          <p className="admin-muted">
            Each size is one SKU for this named product. Stock and price are for complete sets. New
            sizes start with zero stock; adjust quantities from Inventory with a reason.
          </p>
          {variants.length ? (
            <div className="admin-variant-list">
              {variants.map((variant) => (
                <article className="admin-variant-card" key={variant.id}>
                  <div className="admin-variant-card__heading">
                    <div>
                      <strong>{variant.sku}</strong>
                      <span>
                        {variant.is_active ? "Active" : "Inactive"} · On hand{" "}
                        {variant.stock_on_hand} · Reserved {variant.reserved_quantity} · Available{" "}
                        {variant.stock_on_hand - variant.reserved_quantity}
                      </span>
                    </div>
                    <Link
                      className="admin-text-link"
                      href={`/admin/inventory?q=${encodeURIComponent(variant.sku)}`}
                    >
                      Manage this size&apos;s stock
                    </Link>
                  </div>
                  <AdminDialog
                    description="Update the SKU, size, set price and storefront availability. Stock changes stay in Inventory."
                    title={`Edit ${variant.sku}`}
                    triggerLabel="Edit size and price"
                  >
                    <form action={saveProductVariant} className="admin-form">
                      <input name="product_id" type="hidden" value={id} />
                      <input name="variant_id" type="hidden" value={variant.id} />
                      <VariantFields variant={variant} />
                      <AdminSubmitButton>Save size and price</AdminSubmitButton>
                    </form>
                  </AdminDialog>
                </article>
              ))}
            </div>
          ) : variantsResult.error ? null : (
            <p className="admin-muted">
              No variants yet. Add at least one active variant before publishing.
            </p>
          )}
          <AdminDialog
            description="A new size starts with zero stock. Add complete sets later from Inventory."
            title="Add a size"
            triggerLabel="Add size"
            triggerClassName="admin-button admin-button--primary"
          >
            <form action={saveProductVariant} className="admin-form">
              <input name="product_id" type="hidden" value={id} />
              <input name="variant_id" type="hidden" value="" />
              <VariantFields />
              <AdminSubmitButton>Add size and price</AdminSubmitButton>
            </form>
          </AdminDialog>
        </section>

        <section
          aria-labelledby="product-images-heading"
          className="admin-panel"
          id="product-images"
        >
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Private media</p>
              <h2 id="product-images-heading">Product images</h2>
            </div>
          </div>
          <p className="admin-muted">
            Add up to 20 angle photos. JPEG, PNG, WebP or AVIF, up to 5 MiB each. New uploads stay
            private until you publish the image or product.
          </p>
          <AdminDialog
            description="The file stays private until the product and image are approved for the storefront."
            title="Add product photo"
            triggerLabel="Add photo"
          >
            <form action={uploadProductImage} className="admin-form">
              <input name="product_id" type="hidden" value={id} />
              <ImageUploadPreview />
              <label className="admin-field">
                <span>Alternative text</span>
                <input maxLength={250} minLength={1} name="alt_text" required />
                <small>Describe the visible product, colour and angle.</small>
              </label>
              <label className="admin-field">
                <span>Photo order</span>
                <input
                  defaultValue="0"
                  max="2147483647"
                  min="-2147483648"
                  name="sort_order"
                  step="1"
                  type="number"
                />
              </label>
              <AdminSubmitButton pendingLabel="Uploading…">Upload photo</AdminSubmitButton>
            </form>
          </AdminDialog>
          {media.length ? (
            <ul className="admin-media-grid">
              {media.map((item) => (
                <li className="admin-media-card" key={item.id}>
                  {item.signedUrl ? (
                    <Image
                      alt={item.alt_text}
                      height={300}
                      src={item.signedUrl}
                      unoptimized
                      width={240}
                    />
                  ) : (
                    <div className="admin-media-card__missing">Private image unavailable</div>
                  )}
                  <AdminDialog
                    description="Update how the image is described and ordered in the product gallery."
                    title="Edit photo details"
                    triggerLabel="Edit photo"
                  >
                    <form action={updateProductImage} className="admin-form">
                      <input name="product_id" type="hidden" value={id} />
                      <input name="media_id" type="hidden" value={item.id} />
                      <label className="admin-field">
                        <span>Alternative text</span>
                        <input
                          defaultValue={item.alt_text}
                          maxLength={250}
                          minLength={1}
                          name="alt_text"
                          required
                        />
                      </label>
                      <label className="admin-field">
                        <span>Photo order</span>
                        <input
                          defaultValue={item.sort_order}
                          max="2147483647"
                          min="-2147483648"
                          name="sort_order"
                          step="1"
                          type="number"
                        />
                      </label>
                      <AdminSubmitButton>Save photo details</AdminSubmitButton>
                    </form>
                  </AdminDialog>
                  <StatusBadge>{item.status}</StatusBadge>
                  {product.status === "published" && item.status === "draft" ? (
                    <form action={publishProductImage}>
                      <input name="product_id" type="hidden" value={id} />
                      <input name="media_id" type="hidden" value={item.id} />
                      <ConfirmButton
                        className="admin-button admin-button--secondary"
                        formAction={publishProductImage}
                        message="Publish this image to the product gallery?"
                      >
                        Review and publish image
                      </ConfirmButton>
                    </form>
                  ) : null}
                  {item.status !== "archived" ? (
                    <form action={archiveProductImage}>
                      <input name="product_id" type="hidden" value={id} />
                      <input name="media_id" type="hidden" value={item.id} />
                      <ConfirmButton
                        className="admin-button admin-button--quiet"
                        formAction={archiveProductImage}
                        message="Archive this image? It will stop being available to the public."
                      >
                        Archive image
                      </ConfirmButton>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : mediaResult.error ? null : (
            <p className="admin-muted">No images uploaded.</p>
          )}
        </section>
      </AdminProductSectionTabs>
    </>
  );
}

function VariantFields({
  variant,
}: Readonly<{
  variant?: {
    sku: string;
    size_code: string | null;
    inner_diameter_mm: number | null;
    price_minor: number;
    compare_at_price_minor: number | null;
    is_active: boolean;
  };
}>) {
  return (
    <div className="admin-form__row admin-form__row--variant">
      <label className="admin-field">
        <span>SKU</span>
        <input
          defaultValue={variant?.sku}
          maxLength={64}
          name="sku"
          pattern="[A-Za-z0-9][A-Za-z0-9-]{0,63}"
          required
        />
      </label>
      <label className="admin-field">
        <span>Size code</span>
        <input
          defaultValue={variant?.size_code ?? ""}
          maxLength={16}
          name="size_code"
          pattern="[\p{L}\p{N}-]+"
        />
      </label>
      <label className="admin-field">
        <span>Inner diameter (mm)</span>
        <input
          defaultValue={variant?.inner_diameter_mm ?? ""}
          max="999.99"
          min="0.01"
          name="inner_diameter_mm"
          step="0.01"
          type="number"
        />
      </label>
      <label className="admin-field">
        <span>Price (LKR)</span>
        <input
          defaultValue={variant ? formatMinorInput(variant.price_minor) : ""}
          inputMode="decimal"
          max="21474836.47"
          min="0.01"
          name="price_lkr"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="admin-field">
        <span>Compare at (LKR)</span>
        <input
          defaultValue={
            variant?.compare_at_price_minor ? formatMinorInput(variant.compare_at_price_minor) : ""
          }
          inputMode="decimal"
          max="21474836.47"
          min="0.01"
          name="compare_at_price_lkr"
          step="0.01"
          type="number"
        />
      </label>
      <label className="admin-field">
        <span>Availability</span>
        <select
          defaultValue={variant?.is_active === false ? "inactive" : "active"}
          name="is_active"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
    </div>
  );
}

function formatMinorInput(amount: number): string {
  const whole = Math.floor(amount / 100);
  const fraction = String(amount % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
