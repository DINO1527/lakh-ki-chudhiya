import Image from "next/image";
import {
  AdminNotice,
  AdminPageHeader,
  AdminSectionHeading,
  StatusBadge,
} from "@/features/admin/components/admin-ui";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { AdminStatusSwitch } from "@/features/admin/components/admin-status-switch";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { ImageUploadPreview } from "@/features/admin/components/image-upload-preview";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import {
  archiveOfferBanner,
  publishOfferBanner,
  updateOfferBanner,
  toggleOfferPublication,
  uploadOfferBanner,
} from "@/features/admin/server/commerce-actions";
import { OfferForm, type OfferFormValues } from "@/features/promotions/components/offer-form";
import { utcToColomboDateTimeLocal } from "@/features/promotions/domain/schedule";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

const PAGE_SIZE = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminOffersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [{ supabase }, params] = await Promise.all([requireStaff(), searchParams]);
  const rawOfferId = Array.isArray(params.offer) ? params.offer[0] : params.offer;
  const selectedOfferId =
    typeof rawOfferId === "string" && UUID_PATTERN.test(rawOfferId) ? rawOfferId : null;
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
  const [offersResult, productsResult, collectionsResult, selectedOfferResult] = await Promise.all([
    offersQuery,
    supabase.from("products").select("id, title, status").order("title").limit(1_000),
    supabase.from("collections").select("id, name, status").order("name").limit(1_000),
    selectedOfferId
      ? supabase.from("offers").select("*").eq("id", selectedOfferId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const offers = [...(offersResult.data ?? [])];
  if (
    selectedOfferResult.data &&
    !offers.some((offer) => offer.id === selectedOfferResult.data?.id)
  ) {
    offers.unshift(selectedOfferResult.data);
  }
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
    offersResult.error ||
    selectedOfferResult.error ||
    productsResult.error ||
    collectionsResult.error ||
    bannerResult.error;
  if (offersResult.error) logAdminQueryFailure("loadOffers", "offers", offersResult.error.code);
  if (selectedOfferResult.error)
    logAdminQueryFailure("loadSelectedOffer", "offers", selectedOfferResult.error.code);
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
  const created = Array.isArray(params.created) ? params.created[0] : params.created;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const bannerFlash = Array.isArray(params.banner) ? params.banner[0] : params.banner;

  return (
    <>
      <AdminPageHeader eyebrow="Promotions" title="Offers" />
      {params.changed === "enabled" ? (
        <AdminNotice tone="success">
          Offer enabled. Checkout will apply it when eligible.
        </AdminNotice>
      ) : null}
      {params.changed === "disabled" ? (
        <AdminNotice tone="success">Offer disabled.</AdminNotice>
      ) : null}
      {created ? (
        <AdminNotice tone="success">
          Draft offer created and opened below. Add and publish its banner, then enable it in the
          same offer workspace.
        </AdminNotice>
      ) : saved ? (
        <AdminNotice tone="success">Offer saved. Its workspace is open below.</AdminNotice>
      ) : null}
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
            : error === "target_required"
              ? "Publish the selected product or collection before enabling this offer."
              : error === "target_check"
                ? "The selected target could not be checked. Refresh the list and try again."
                : error === "target_missing"
                  ? "The selected target no longer exists. Choose another target."
                  : error === "invalid"
                    ? "Check the offer name, target, discount and schedule."
                    : error === "banner_active"
                      ? "Disable the offer before archiving its only published banner."
                      : error === "banner_exists"
                        ? "This offer already has a banner. Archive it before adding a replacement."
                        : error === "missing_record"
                          ? "This offer is no longer available. Refresh the list."
                          : error === "toggle"
                            ? "Offer availability could not be changed. Refresh the list and retry."
                            : error.startsWith("banner_")
                              ? "Offer banner could not be saved. Check the image type, size and required text."
                              : "Offer could not be saved. Check its target, discount and schedule."}
        </AdminNotice>
      ) : null}
      {queryError ? (
        <AdminNotice tone="error">Offers or catalogue targets could not be loaded.</AdminNotice>
      ) : null}

      <section aria-labelledby="new-offer-heading" className="admin-panel">
        <AdminSectionHeading
          eyebrow="New promotion"
          id="new-offer-heading"
          title="Create an offer"
        />
        <OfferForm
          collections={collectionTargets}
          products={productTargets}
          returnPage={pageNumber}
          returnSearch={search}
          showEnableToggle={false}
        />
      </section>

      <section aria-labelledby="offer-list-heading" className="admin-panel">
        <AdminSectionHeading eyebrow="Saved rules" id="offer-list-heading" title="Offer list" />
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
              const targetIsPublished =
                (targetType === "product" ? productTargets : collectionTargets).find(
                  (target) => target.id === targetId,
                )?.isPublished ?? false;
              const canEnable = banner?.status === "published" && targetIsPublished;
              return (
                <details
                  className="admin-offer-card"
                  id={"offer-" + offer.id}
                  key={offer.id}
                  open={selectedOfferId === offer.id}
                >
                  <summary className="admin-offer-card__summary">
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
                      <span>
                        <strong>{offer.name}</strong>
                        <span>
                          {targetLabel} · {offer.minimum_sets}+ sets ·{" "}
                          {formatPercent(offer.discount_basis_points)}% off
                        </span>
                      </span>
                      <StatusBadge>{offer.is_enabled ? "enabled" : "draft"}</StatusBadge>
                    </div>
                    <span className="admin-muted">Open offer workspace</span>
                  </summary>
                  <div className="admin-offer-card__workspace">
                    <section>
                      <p className="admin-eyebrow">Offer details and availability</p>
                      <div className="admin-offer-card__availability">
                        <AdminStatusSwitch
                          action={toggleOfferPublication}
                          checked={offer.is_enabled}
                          disabled={!offer.is_enabled && !canEnable}
                          disabledHint={
                            !offer.is_enabled && !canEnable
                              ? banner?.status !== "published"
                                ? "Publish a banner first."
                                : "Publish the target first."
                              : undefined
                          }
                          fields={{
                            offer_id: offer.id,
                            next_enabled: String(!offer.is_enabled),
                            return_q: search,
                            return_page: String(pageNumber),
                          }}
                          label={(offer.is_enabled ? "Disable " : "Enable ") + offer.name}
                          message={
                            offer.is_enabled
                              ? "Disable " +
                                offer.name +
                                "? Checkout will stop applying this offer."
                              : "Enable " +
                                offer.name +
                                "? Checkout may apply it when the target, schedule and minimum quantity match."
                          }
                          offLabel="Disabled"
                          onLabel="Enabled"
                          submitLabel={offer.is_enabled ? "Disable offer" : "Enable offer"}
                        />
                      </div>
                      <OfferForm
                        collections={collectionTargets}
                        hasPublishedBanner={banner?.status === "published"}
                        offer={values}
                        products={productTargets}
                        returnPage={pageNumber}
                        returnSearch={search}
                        showEnableToggle={false}
                      />
                    </section>
                    <section>
                      <p className="admin-eyebrow">Offer banner</p>
                      <StatusBadge>{banner?.status ?? "not added"}</StatusBadge>
                      {banner ? (
                        <>
                          <form action={updateOfferBanner} className="admin-form">
                            <input name="offer_id" type="hidden" value={offer.id} />
                            <input name="media_id" type="hidden" value={banner.id} />
                            <input name="return_q" type="hidden" value={search} />
                            <input name="return_page" type="hidden" value={pageNumber} />
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
                              <input name="return_q" type="hidden" value={search} />
                              <input name="return_page" type="hidden" value={pageNumber} />
                              <AdminSubmitButton className="admin-button admin-button--primary">
                                Publish banner
                              </AdminSubmitButton>
                            </form>
                          ) : null}
                          <form action={archiveOfferBanner}>
                            <input name="offer_id" type="hidden" value={offer.id} />
                            <input name="media_id" type="hidden" value={banner.id} />
                            <input name="return_q" type="hidden" value={search} />
                            <input name="return_page" type="hidden" value={pageNumber} />
                            <ConfirmButton
                              className="admin-button admin-button--danger"
                              formAction={archiveOfferBanner}
                              message="Archive this offer banner? It will no longer be available for signing."
                            >
                              Archive banner
                            </ConfirmButton>
                          </form>
                        </>
                      ) : (
                        <form action={uploadOfferBanner} className="admin-form">
                          <input name="offer_id" type="hidden" value={offer.id} />
                          <input name="return_q" type="hidden" value={search} />
                          <input name="return_page" type="hidden" value={pageNumber} />
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
                    </section>
                  </div>
                </details>
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
