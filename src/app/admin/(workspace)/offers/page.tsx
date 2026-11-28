import Image from "next/image";
import { Trash2 } from "lucide-react";
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
  deleteOffer,
  deleteOfferBanner,
  publishOfferBanner,
  replaceOfferBanner,
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
  const bannersByOffer = new Map<
    string,
    Array<(typeof bannerRows)[number] & { signedUrl: string | null }>
  >();
  bannerRows.forEach((banner, index) => {
    const list = bannersByOffer.get(banner.offer_id) ?? [];
    list.push({ ...banner, signedUrl: signedBanners.data?.[index]?.signedUrl ?? null });
    bannersByOffer.set(banner.offer_id, list);
  });
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
      <nav aria-label="Offer workflow" className="admin-section-nav admin-workflow-nav">
        <a className="admin-section-nav__tab" href="#new-offer">
          1. Create
        </a>
        <a className="admin-section-nav__tab" href="#saved-offers">
          2. Details
        </a>
        <a className="admin-section-nav__tab" href="#saved-offers">
          3. Banner
        </a>
        <a className="admin-section-nav__tab" href="#saved-offers">
          4. Publish
        </a>
      </nav>
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
      {params.deleted ? (
        <AdminNotice tone="success">
          Offer, its banners, and private image files were deleted.
        </AdminNotice>
      ) : null}
      {bannerFlash ? (
        <AdminNotice tone={bannerFlash === "cleanup_pending" ? "error" : "success"}>
          {bannerFlash === "uploaded"
            ? params.publish === "1"
              ? "Offer banner uploaded and published. Enable the offer when its target is published."
              : "Offer banner uploaded privately. Publish the banner before enabling the offer."
            : bannerFlash === "published"
              ? "Offer banner published. It remains private until the offer is enabled and eligible."
              : bannerFlash === "deleted"
                ? "Offer banner and its private image file were deleted."
                : bannerFlash === "replaced"
                  ? params.publish === "1"
                    ? "Banner replaced and published. The offer remains disabled until you enable it."
                    : "Banner replaced with a private draft. Publish it before enabling this offer."
                  : bannerFlash === "cleanup_pending"
                    ? "Banner replaced, but an older private image file could not be removed. Ask an owner to review storage cleanup."
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
                      ? "Disable the offer before replacing or deleting its published banner."
                      : error === "banner_exists"
                        ? "This offer already has a banner. Use Replace banner in its workspace."
                        : error === "missing_record"
                          ? "This offer is no longer available. Refresh the list."
                          : error === "storage_cleanup"
                            ? "The database record was deleted, but a private image file could not be removed. Ask an owner to review storage cleanup."
                            : error === "database_update"
                              ? "The database is missing an admin workflow update. Apply the current admin migrations, then retry."
                              : error === "offer_delete"
                                ? "The offer could not be deleted. Refresh the list and try again."
                                : error === "banner_delete"
                                  ? "The banner could not be deleted. Refresh the list and try again."
                                  : error === "banner_replace"
                                    ? "The banner could not be replaced. Check the image and try again."
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
      {signedBanners.error ? (
        <AdminNotice tone="error">
          Offer image previews could not be loaded. Banner details and delete actions remain
          available.
        </AdminNotice>
      ) : null}

      <section aria-labelledby="new-offer-heading" className="admin-panel" id="new-offer">
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

      <section aria-labelledby="offer-list-heading" className="admin-panel" id="saved-offers">
        <AdminSectionHeading eyebrow="Saved rules" id="offer-list-heading" title="Offer list" />
        <AdminSearchForm
          action="/admin/offers"
          label="Search offers"
          placeholder="Offer name"
          query={search}
        />
        {offersResult.error || bannerResult.error ? null : offers.length ? (
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
              const banners = bannersByOffer.get(offer.id) ?? [];
              const banner = banners.find((item) => item.status !== "archived");
              const archivedBanners = banners.filter((item) => item.status === "archived");
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
                    <nav
                      aria-label={`${offer.name} setup`}
                      className="admin-section-nav admin-workflow-nav"
                    >
                      <a className="admin-section-nav__tab" href={`#offer-details-${offer.id}`}>
                        Details
                      </a>
                      <a className="admin-section-nav__tab" href={`#offer-banner-${offer.id}`}>
                        Banner
                      </a>
                      <a className="admin-section-nav__tab" href={`#offer-publish-${offer.id}`}>
                        Publish
                      </a>
                    </nav>
                    <section>
                      <div id={`offer-details-${offer.id}`} />
                      <p className="admin-eyebrow">Offer details and availability</p>
                      <div id={`offer-publish-${offer.id}`} />
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
                    <section id={`offer-banner-${offer.id}`}>
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
                          <form action={deleteOfferBanner}>
                            <input name="offer_id" type="hidden" value={offer.id} />
                            <input name="media_id" type="hidden" value={banner.id} />
                            <input name="return_q" type="hidden" value={search} />
                            <input name="return_page" type="hidden" value={pageNumber} />
                            <ConfirmButton
                              className="admin-button admin-button--danger"
                              formAction={deleteOfferBanner}
                              message="Permanently delete this banner and its stored image file?"
                              submitLabel="Delete banner"
                              triggerAriaLabel={`Delete banner for ${offer.name}`}
                              triggerDisabled={offer.is_enabled && banner.status === "published"}
                              triggerTitle={
                                offer.is_enabled && banner.status === "published"
                                  ? "Disable this offer before deleting its published banner"
                                  : "Delete this banner permanently"
                              }
                            >
                              <Trash2 aria-hidden="true" size={16} />
                              Delete banner
                            </ConfirmButton>
                          </form>
                          {offer.is_enabled ? (
                            <p className="admin-muted">
                              Disable this offer before replacing or deleting its published banner.
                            </p>
                          ) : (
                            <form action={replaceOfferBanner} className="admin-form">
                              <input name="offer_id" type="hidden" value={offer.id} />
                              <input name="return_q" type="hidden" value={search} />
                              <input name="return_page" type="hidden" value={pageNumber} />
                              <p className="admin-eyebrow">Replace banner</p>
                              <p className="admin-muted">
                                The new image will be saved as a private draft. Publish it before
                                enabling the offer.
                              </p>
                              <ImageUploadPreview aspectRatio={3} />
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
                              <label className="admin-checkbox">
                                <input name="publish_after_upload" type="checkbox" />
                                <span>
                                  Publish replacement when uploaded
                                  <small>The offer must remain disabled until you enable it.</small>
                                </span>
                              </label>
                              <AdminSubmitButton pendingLabel="Replacing banner…">
                                Replace banner
                              </AdminSubmitButton>
                            </form>
                          )}
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
                          <label className="admin-checkbox">
                            <input name="publish_after_upload" type="checkbox" />
                            <span>
                              Publish banner when uploaded
                              <small>You can enable the offer after its target is published.</small>
                            </span>
                          </label>
                          <AdminSubmitButton pendingLabel="Uploading banner…">
                            Upload banner
                          </AdminSubmitButton>
                        </form>
                      )}
                      {archivedBanners.length ? (
                        <div className="admin-form">
                          <p className="admin-eyebrow">Archived banners</p>
                          <p className="admin-muted">
                            These older images are hidden. Delete them to remove their stored files.
                          </p>
                          <ul className="admin-media-grid">
                            {archivedBanners.map((archivedBanner) => (
                              <li className="admin-media-card" key={archivedBanner.id}>
                                {archivedBanner.signedUrl ? (
                                  <Image
                                    alt={archivedBanner.alt_text}
                                    height={120}
                                    src={archivedBanner.signedUrl}
                                    unoptimized
                                    width={360}
                                  />
                                ) : null}
                                <StatusBadge>archived</StatusBadge>
                                <form action={deleteOfferBanner}>
                                  <input name="offer_id" type="hidden" value={offer.id} />
                                  <input name="media_id" type="hidden" value={archivedBanner.id} />
                                  <input name="return_q" type="hidden" value={search} />
                                  <input name="return_page" type="hidden" value={pageNumber} />
                                  <ConfirmButton
                                    className="admin-button admin-button--quiet"
                                    formAction={deleteOfferBanner}
                                    message="Permanently delete this archived banner and its stored image file?"
                                    submitLabel="Delete banner"
                                    triggerAriaLabel={`Delete archived banner for ${offer.name}`}
                                    triggerTitle="Delete archived banner permanently"
                                  >
                                    <Trash2 aria-hidden="true" size={16} />
                                    Delete archived banner
                                  </ConfirmButton>
                                </form>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </section>
                  </div>
                  <form action={deleteOffer} className="admin-form">
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_q" type="hidden" value={search} />
                    <input name="return_page" type="hidden" value={pageNumber} />
                    <ConfirmButton
                      className="admin-button admin-button--danger"
                      formAction={deleteOffer}
                      message={`Permanently delete “${offer.name}” and its banners? Existing order records will keep their saved offer details.`}
                      submitLabel="Delete offer"
                      triggerAriaLabel={`Delete offer: ${offer.name}`}
                      triggerTitle="Delete offer permanently"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                      Delete offer
                    </ConfirmButton>
                  </form>
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
