import Image from "next/image";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { ImageUploadPreview } from "@/features/admin/components/image-upload-preview";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import {
  archiveOfferBanner,
  publishOfferBanner,
  updateOfferBanner,
  uploadOfferBanner,
} from "@/features/admin/server/commerce-actions";
import { OfferForm, type OfferFormValues } from "@/features/promotions/components/offer-form";
import { utcToColomboDateTimeLocal } from "@/features/promotions/domain/schedule";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

const PAGE_SIZE = 20;

export default async function AdminOffersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [{ supabase }, params] = await Promise.all([requireStaff(), searchParams]);
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageNumber = rawPage && /^[0-9]{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .slice(0, 64)
    .trim();
  let offersQuery = supabase
    .from("offers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (search) offersQuery = offersQuery.ilike("name", `%${search}%`);
  offersQuery = offersQuery.range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
  const [offersResult, productsResult, collectionsResult] = await Promise.all([
    offersQuery,
    supabase.from("products").select("id, title, status").order("title").limit(1_000),
    supabase.from("collections").select("id, name, status").order("name").limit(1_000),
  ]);
  const offers = offersResult.data ?? [];
  const bannerResult = offers.length
    ? await supabase
        .from("offer_media")
        .select("id, offer_id, storage_path, alt_text, status")
        .in(
          "offer_id",
          offers.map((offer) => offer.id),
        )
        .neq("status", "archived")
        .order("created_at")
    : { data: [], error: null };
  const bannerRows = bannerResult.data ?? [];
  const signedBanners = bannerRows.length
    ? await supabase.storage.from("product-media").createSignedUrls(
        bannerRows.map((banner) => banner.storage_path),
        300,
      )
    : { data: [], error: null };
  const queryError =
    offersResult.error || productsResult.error || collectionsResult.error || bannerResult.error;
  if (offersResult.error) logAdminQueryFailure("loadOffers", "offers", offersResult.error.code);
  if (productsResult.error)
    logAdminQueryFailure("loadOfferProductTargets", "products", productsResult.error.code);
  if (collectionsResult.error)
    logAdminQueryFailure("loadOfferCollectionTargets", "collections", collectionsResult.error.code);
  if (bannerResult.error)
    logAdminQueryFailure("loadOfferBanners", "offer_media", bannerResult.error.code);
  if (signedBanners.error)
    logAdminQueryFailure("signOfferBanners", "product-media", signedBanners.error.name);
  const bannerByOffer = new Map(
    bannerRows.map((banner, index) => [
      banner.offer_id,
      { ...banner, signedUrl: signedBanners.data?.[index]?.signedUrl ?? null },
    ]),
  );
  const productTargets = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    label: `${product.title} · ${product.status}`,
    isPublished: product.status === "published",
  }));
  const collectionTargets = (collectionsResult.data ?? []).map((collection) => ({
    id: collection.id,
    label: `${collection.name} · ${collection.status}`,
    isPublished: collection.status === "published",
  }));
  const saved = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const bannerFlash = Array.isArray(params.banner) ? params.banner[0] : params.banner;

  return (
    <>
      <AdminPageHeader
        eyebrow="Promotions"
        title="Offers"
        description="Create product or collection offers. Checkout calculates the discount again from current server data."
      />
      {saved ? <AdminNotice tone="success">Offer saved.</AdminNotice> : null}
      {bannerFlash ? (
        <AdminNotice tone="success">
          {bannerFlash === "uploaded"
            ? "Offer banner uploaded privately. Publish the banner before enabling the offer."
            : bannerFlash === "published"
              ? "Offer banner published. It remains private until the offer is enabled and eligible."
              : bannerFlash === "archived"
                ? "Offer banner archived."
                : "Offer banner details saved."}
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice tone="error">
          {error === "banner_required"
            ? "Publish an offer banner before enabling this offer."
            : error === "banner_active"
              ? "Disable the offer before archiving its only published banner."
              : error === "banner_exists"
                ? "This offer already has a banner. Archive it before adding a replacement."
                : error.startsWith("banner_")
                  ? "Offer banner could not be saved. Check the image type, size and required text."
                  : "Offer could not be saved. Check its target, discount and schedule."}
        </AdminNotice>
      ) : null}
      {queryError ? (
        <AdminNotice tone="error">Offers or catalogue targets could not be loaded.</AdminNotice>
      ) : null}

      <section aria-labelledby="new-offer-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">New promotion</p>
            <h2 id="new-offer-heading">Create an offer</h2>
          </div>
        </div>
        <OfferForm collections={collectionTargets} products={productTargets} />
      </section>

      <section aria-labelledby="offer-list-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Saved rules</p>
            <h2 id="offer-list-heading">Offer list</h2>
          </div>
        </div>
        <AdminSearchForm
          action="/admin/offers"
          label="Search offers"
          placeholder="Offer name"
          query={search}
        />
        {offersResult.error || bannerResult.error || signedBanners.error ? null : offers.length ? (
          <div className="admin-offer-list">
            {offers.map((offer) => {
              const targetType = offer.target_type;
              const targetId =
                targetType === "product" ? offer.target_product_id : offer.target_collection_id;
              const targetLabel =
                (targetType === "product" ? productTargets : collectionTargets).find(
                  (target) => target.id === targetId,
                )?.label ?? "Target missing";
              const values: OfferFormValues = {
                id: offer.id,
                name: offer.name,
                targetType,
                targetId: targetId ?? "",
                minimumSets: offer.minimum_sets,
                discountBasisPoints: offer.discount_basis_points,
                startsAt: utcToColomboDateTimeLocal(offer.starts_at),
                endsAt: utcToColomboDateTimeLocal(offer.ends_at),
                isEnabled: offer.is_enabled,
              };
              const banner = bannerByOffer.get(offer.id);
              return (
                <article className="admin-offer-card" key={offer.id}>
                  {banner?.signedUrl ? (
                    <Image
                      alt={banner.alt_text}
                      className="admin-offer-card__banner"
                      height={240}
                      src={banner.signedUrl}
                      unoptimized
                      width={960}
                    />
                  ) : (
                    <div
                      aria-label="No offer banner uploaded"
                      className="admin-offer-card__banner admin-offer-card__banner--empty"
                      role="img"
                    >
                      Add an offer banner
                    </div>
                  )}
                  <div className="admin-offer-card__heading">
                    <div>
                      <h3>{offer.name}</h3>
                      <p>
                        {targetLabel} · {offer.minimum_sets}+ sets ·{" "}
                        {formatPercent(offer.discount_basis_points)}% off
                      </p>
                    </div>
                    <StatusBadge>{offer.is_enabled ? "on" : "off"}</StatusBadge>
                  </div>
                  <AdminDialog
                    description="Update the target, minimum set count, discount and availability schedule."
                    title={offer.name}
                    triggerLabel="Edit offer"
                  >
                    <OfferForm
                      collections={collectionTargets}
                      hasPublishedBanner={banner?.status === "published"}
                      offer={values}
                      products={productTargets}
                    />
                  </AdminDialog>
                  <AdminDialog
                    description="Upload a private banner, preview and crop it, then publish it before enabling the offer."
                    title={`${offer.name} banner`}
                    triggerLabel={banner ? "Edit banner" : "Add banner"}
                  >
                    {banner ? (
                      <div className="admin-form">
                        {banner.signedUrl ? (
                          <Image
                            alt={banner.alt_text}
                            className="admin-offer-card__banner"
                            height={240}
                            src={banner.signedUrl}
                            unoptimized
                            width={960}
                          />
                        ) : null}
                        <StatusBadge>{banner.status}</StatusBadge>
                        <form action={updateOfferBanner} className="admin-form">
                          <input name="offer_id" type="hidden" value={offer.id} />
                          <input name="media_id" type="hidden" value={banner.id} />
                          <label className="admin-field">
                            <span>Alternative text</span>
                            <input
                              defaultValue={banner.alt_text}
                              maxLength={250}
                              minLength={1}
                              name="alt_text"
                              required
                            />
                          </label>
                          <AdminSubmitButton>Save banner details</AdminSubmitButton>
                        </form>
                        {banner.status === "draft" ? (
                          <form action={publishOfferBanner}>
                            <input name="offer_id" type="hidden" value={offer.id} />
                            <input name="media_id" type="hidden" value={banner.id} />
                            <AdminSubmitButton className="admin-button admin-button--primary">
                              Publish banner
                            </AdminSubmitButton>
                          </form>
                        ) : null}
                        <form action={archiveOfferBanner}>
                          <input name="offer_id" type="hidden" value={offer.id} />
                          <input name="media_id" type="hidden" value={banner.id} />
                          <ConfirmButton
                            className="admin-button admin-button--danger"
                            formAction={archiveOfferBanner}
                            message="Archive this offer banner? It will no longer be available for signing."
                          >
                            Archive banner
                          </ConfirmButton>
                        </form>
                      </div>
                    ) : (
                      <form action={uploadOfferBanner} className="admin-form">
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <ImageUploadPreview aspectRatio={3} />
                        <label className="admin-field">
                          <span>Alternative text</span>
                          <input
                            maxLength={250}
                            minLength={1}
                            name="alt_text"
                            placeholder="Describe the offer banner"
                            required
                          />
                        </label>
                        <AdminSubmitButton pendingLabel="Uploading banner…">
                          Upload banner
                        </AdminSubmitButton>
                      </form>
                    )}
                  </AdminDialog>
                </article>
              );
            })}
            <AdminPagination
              action="/admin/offers"
              itemLabel="offers"
              page={pageNumber}
              pageSize={PAGE_SIZE}
              query={params}
              total={offersResult.count ?? 0}
            />
          </div>
        ) : (
          <p className="admin-muted">
            {search ? "No offers match that search." : "No offers have been created."}
          </p>
        )}
      </section>
    </>
  );
}

function formatPercent(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2).replace(/\.?0+$/, "");
}
