import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { requireStaff } from "@/features/admin/server/access";
import { formatLkrPrice } from "@/features/products/domain/product-variant";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PrivateProductPreviewPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, { supabase }] = await Promise.all([params, requireStaff()]);
  if (!UUID_PATTERN.test(id)) notFound();

  const [productResult, variantsResult, mediaResult, collectionsResult, linksResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, slug, title, description, material, care_instructions, set_count, status")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("product_variants")
        .select("id, size_code, price_minor, is_available")
        .eq("product_id", id)
        .eq("is_active", true)
        .order("size_code", { ascending: true, nullsFirst: true })
        .limit(500),
      supabase
        .from("product_media")
        .select("storage_path, alt_text, status, sort_order")
        .eq("product_id", id)
        .neq("status", "archived")
        .order("sort_order")
        .limit(100),
      supabase.from("collections").select("id, name, slug").limit(1_000),
      supabase
        .from("product_collections")
        .select("collection_id")
        .eq("product_id", id)
        .limit(1_000),
    ]);

  if (!productResult.data) notFound();
  const media = await Promise.all(
    (mediaResult.data ?? []).map(async (item) => {
      const { data } = await supabase.storage
        .from("product-media")
        .createSignedUrl(item.storage_path, 300);
      return { ...item, signedUrl: data?.signedUrl ?? null };
    }),
  );
  const collectionIds = new Set((linksResult.data ?? []).map((link) => link.collection_id));
  const collections = (collectionsResult.data ?? []).filter((collection) =>
    collectionIds.has(collection.id),
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Private draft preview"
        title={productResult.data.title}
        description="This page is visible only to signed-in staff. Signed image links expire after five minutes."
        action={
          <Link className="admin-button admin-button--secondary" href={`/admin/products/${id}`}>
            Back to editor
          </Link>
        }
      />
      <AdminNotice>
        Preview · {productResult.data.status} · Hidden from search engines and public catalogue.
      </AdminNotice>
      {productResult.error ||
      variantsResult.error ||
      mediaResult.error ||
      collectionsResult.error ||
      linksResult.error ? (
        <AdminNotice tone="error">Some preview details could not be loaded.</AdminNotice>
      ) : null}
      <article className="admin-preview">
        <div className="admin-preview__media">
          {media.length ? (
            media.map((item) =>
              item.signedUrl ? (
                <Image
                  alt={item.alt_text}
                  height={600}
                  key={item.storage_path}
                  src={item.signedUrl}
                  unoptimized
                  width={480}
                />
              ) : (
                <div className="admin-media-card__missing" key={item.storage_path}>
                  Private image unavailable
                </div>
              ),
            )
          ) : (
            <div className="admin-media-card__missing">No active product images</div>
          )}
        </div>
        <div className="admin-preview__copy">
          <StatusBadge>{productResult.data.status}</StatusBadge>
          <h2>{productResult.data.title}</h2>
          <p>{productResult.data.description || "No description added yet."}</p>
          {productResult.data.material ? (
            <p>
              <strong>Material</strong> · {productResult.data.material}
            </p>
          ) : null}
          <p>
            <strong>One sellable set</strong> · {productResult.data.set_count} bangles
          </p>
          {productResult.data.care_instructions ? (
            <p>
              <strong>Care</strong> · {productResult.data.care_instructions}
            </p>
          ) : null}
          {collections.length ? (
            <p>
              <strong>Collections</strong> ·{" "}
              {collections.map((collection) => collection.name).join(", ")}
            </p>
          ) : null}
          <h3>Available variants</h3>
          {variantsResult.data?.length ? (
            <ul className="admin-preview__variants">
              {variantsResult.data.map((variant) => (
                <li key={variant.id}>
                  <span>{variant.size_code ? `Size ${variant.size_code}` : "One size"} · </span>
                  <span>
                    {formatLkrPrice(variant.price_minor)} ·{" "}
                    {variant.is_available ? "In stock" : "Unavailable"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No active variants.</p>
          )}
        </div>
      </article>
    </>
  );
}
