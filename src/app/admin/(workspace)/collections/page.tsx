import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Eye,
  FileText,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  Tag,
} from "lucide-react";
import {
  AdminNotice,
  AdminPageHeader,
  AdminSectionHeading,
  StatusBadge,
} from "@/features/admin/components/admin-ui";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { AdminStatusSwitch } from "@/features/admin/components/admin-status-switch";
import { ImageUploadPreview } from "@/features/admin/components/image-upload-preview";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import { AdminFieldLabel } from "@/features/admin/components/admin-field-label";
import {
  archiveCollectionImage,
  moveCollectionImageOrder,
  moveCollectionOrder,
  saveCollection,
  toggleCollectionPublication,
  updateCollectionImage,
  uploadCollectionImage,
} from "@/features/admin/server/collection-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

const PAGE_SIZE = 12;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminCollectionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const rawCreatedId = Array.isArray(params.created) ? params.created[0] : params.created;
  const createdId =
    typeof rawCreatedId === "string" && UUID_PATTERN.test(rawCreatedId) ? rawCreatedId : null;
  const rawOpenId = Array.isArray(params.open) ? params.open[0] : params.open;
  const openCollectionId =
    typeof rawOpenId === "string" && UUID_PATTERN.test(rawOpenId) ? rawOpenId : createdId;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageNumber = rawPage && /^[0-9]{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .slice(0, 64)
    .trim();
  let collectionQuery = supabase
    .from("collections")
    .select("id, slug, name, description, status, sort_order", { count: "exact" })
    .order("sort_order")
    .order("name")
    .order("id");
  if (search) collectionQuery = collectionQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  collectionQuery = collectionQuery.range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
  const [collectionsResult, linksResult, selectedCollectionResult] = await Promise.all([
    collectionQuery,
    supabase.from("product_collections").select("collection_id"),
    openCollectionId
      ? supabase
          .from("collections")
          .select("id, slug, name, description, status, sort_order")
          .eq("id", openCollectionId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const counts = new Map<string, number>();
  for (const link of linksResult.data ?? [])
    counts.set(link.collection_id, (counts.get(link.collection_id) ?? 0) + 1);
  const pageCollections = collectionsResult.data ?? [];
  const collections = [...pageCollections];
  if (
    selectedCollectionResult.data &&
    !collections.some((collection) => collection.id === selectedCollectionResult.data?.id)
  ) {
    collections.unshift(selectedCollectionResult.data);
  }
  const mediaResult = collections.length
    ? await supabase
        .from("collection_media")
        .select("id, collection_id, storage_path, alt_text, status, sort_order")
        .in(
          "collection_id",
          collections.map((collection) => collection.id),
        )
        .order("collection_id")
        .order("sort_order")
        .order("id")
        .limit(1_000)
    : { data: [], error: null };
  const mediaRows = mediaResult.data ?? [];
  const signedMedia = mediaRows.length
    ? await supabase.storage.from("product-media").createSignedUrls(
        mediaRows.map((item) => item.storage_path),
        300,
      )
    : { data: [], error: null };
  if (collectionsResult.error) {
    logAdminQueryFailure("loadCollections", "collections", collectionsResult.error.code);
  }
  if (selectedCollectionResult.error) {
    logAdminQueryFailure(
      "loadSelectedCollection",
      "collections",
      selectedCollectionResult.error.code,
    );
  }
  if (linksResult.error)
    logAdminQueryFailure("loadCollectionLinks", "product_collections", linksResult.error.code);
  if (mediaResult.error)
    logAdminQueryFailure("loadCollectionMedia", "collection_media", mediaResult.error.code);
  if (signedMedia.error)
    logAdminQueryFailure("signCollectionMedia", "product-media", signedMedia.error.name);
  const signedUrlById = new Map(
    mediaRows.map((item, index) => [item.id, signedMedia.data?.[index]?.signedUrl ?? null]),
  );
  const imagesByCollectionId = new Map<string, typeof mediaRows>();
  for (const image of mediaRows) {
    const current = imagesByCollectionId.get(image.collection_id) ?? [];
    current.push(image);
    imagesByCollectionId.set(image.collection_id, current);
  }
  const coverByCollection = new Map(
    [...imagesByCollectionId.entries()].flatMap(([collectionId, images]) => {
      const cover = images.find((image) => image.status !== "archived");
      return cover
        ? [
            [
              collectionId,
              { altText: cover.alt_text, url: signedUrlById.get(cover.id) ?? null },
            ] as const,
          ]
        : [];
    }),
  );
  const pageCount = Math.ceil((collectionsResult.count ?? 0) / PAGE_SIZE);

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Collections"
        action={
          <Link className="admin-button admin-button--primary" href="#new-collection">
            Create collection
          </Link>
        }
      />
      {params.changed === "published" ? (
        <AdminNotice tone="success">
          Collection published and visible in the storefront.
        </AdminNotice>
      ) : null}
      {params.changed === "draft" ? (
        <AdminNotice tone="success">
          Collection moved to drafts and hidden from shoppers.
        </AdminNotice>
      ) : null}
      {createdId ? (
        <AdminNotice tone="success">
          Draft created and opened below. Update its details, add photos and publish it from the
          same workspace.
        </AdminNotice>
      ) : null}
      {params.saved && !createdId && !params.image && !params.order ? (
        <AdminNotice tone="success">Collection changes saved.</AdminNotice>
      ) : null}
      {params.error ? (
        <AdminNotice tone="error">
          {params.error === "permission"
            ? "Your staff access does not allow this change. Ask the store owner to check your role."
            : params.error === "missing_record"
              ? "This collection is no longer available. Refresh the list."
              : params.error === "image_required"
                ? "Add at least one image before publishing this collection."
                : params.error === "last_image"
                  ? "Keep one published image on a published collection. Move the collection to draft or archive first to remove the last image."
                  : params.error === "image_limit"
                    ? "A collection can have up to 20 active images. Archive one before adding another."
                    : params.error === "order"
                      ? "Display order could not be updated. Refresh the list and try again."
                      : params.error === "image"
                        ? "Image could not be saved. Check the image type, size and required alternative text."
                        : "Collection changes were not saved. Check the form values and retry. If the error continues, ask an owner to review database access."}
        </AdminNotice>
      ) : null}
      {params.image === "uploaded" ? (
        <AdminNotice tone="success">
          Image added as a private draft. Publishing the collection makes its draft images public.
        </AdminNotice>
      ) : null}
      {params.image === "archived" ? (
        <AdminNotice tone="success">Collection image archived.</AdminNotice>
      ) : null}
      {params.image === "updated" ? (
        <AdminNotice tone="success">Collection image details saved.</AdminNotice>
      ) : null}
      {params.order === "updated" ? (
        <AdminNotice tone="success">
          Display order updated. Positions were renumbered automatically.
        </AdminNotice>
      ) : params.order === "first" || params.order === "last" ? (
        <AdminNotice tone="success">This item is already at that end of its list.</AdminNotice>
      ) : null}
      {collectionsResult.error ||
      selectedCollectionResult.error ||
      linksResult.error ||
      mediaResult.error ||
      signedMedia.error ? (
        <AdminNotice tone="error">Collection data could not be loaded.</AdminNotice>
      ) : null}

      <section aria-labelledby="new-collection-heading" className="admin-panel" id="new-collection">
        <AdminSectionHeading
          eyebrow="Step 1 · Create"
          id="new-collection-heading"
          title="Create a collection"
        />
        <p className="admin-muted">
          Start with a name. Its position is assigned automatically and can be changed later.
        </p>
        <form action={saveCollection} className="admin-form">
          <input name="collection_id" type="hidden" value="" />
          <label className="admin-field">
            <AdminFieldLabel icon={Tag}>Collection name</AdminFieldLabel>
            <input maxLength={120} minLength={1} name="name" required />
          </label>
          <details className="admin-form-details">
            <summary>Add optional details now</summary>
            <div className="admin-form-details__content">
              <label className="admin-field">
                <AdminFieldLabel icon={Link2}>
                  URL slug <small>Leave blank to derive it from the name.</small>
                </AdminFieldLabel>
                <input maxLength={100} name="slug" />
              </label>
              <label className="admin-field">
                <AdminFieldLabel icon={FileText}>Description</AdminFieldLabel>
                <textarea maxLength={2_000} name="description" rows={3} />
              </label>
            </div>
          </details>
          <AdminSubmitButton pendingLabel="Creating draft…">
            Create draft and continue
          </AdminSubmitButton>
        </form>
      </section>

      <section
        aria-labelledby="existing-collections-heading"
        className="admin-panel"
        id="existing-collections"
      >
        <AdminSectionHeading
          eyebrow="Step 2 · Images and visibility"
          id="existing-collections-heading"
          title="Existing collections"
        />
        <AdminSearchForm
          action="/admin/collections"
          label="Search collections"
          placeholder="Name or URL slug"
          query={search}
        />
        {collectionsResult.error ? null : collections.length ? (
          <div className="admin-collection-list">
            {collections.map((collection) => {
              const collectionImages = imagesByCollectionId.get(collection.id) ?? [];
              const activeImages = collectionImages.filter((image) => image.status !== "archived");
              const pageIndex = pageCollections.findIndex((item) => item.id === collection.id);
              const canMoveUp = !search && (pageIndex < 0 || pageNumber > 1 || pageIndex > 0);
              const canMoveDown =
                !search &&
                (pageIndex < 0 || pageIndex < pageCollections.length - 1 || pageNumber < pageCount);
              return (
                <details
                  className="admin-collection"
                  id={`collection-${collection.id}`}
                  key={collection.id}
                  open={openCollectionId === collection.id}
                >
                  <summary>
                    <div className="admin-collection__summary">
                      {coverByCollection.get(collection.id)?.url ? (
                        <Image
                          alt={coverByCollection.get(collection.id)?.altText ?? ""}
                          className="admin-collection__cover"
                          height={96}
                          src={coverByCollection.get(collection.id)?.url ?? ""}
                          unoptimized
                          width={144}
                        />
                      ) : (
                        <div
                          aria-label="No collection image uploaded"
                          className="admin-collection__cover admin-collection__cover--empty"
                          role="img"
                        >
                          No cover image
                        </div>
                      )}
                      <span>
                        <strong>{collection.name}</strong>
                        <StatusBadge>{collection.status}</StatusBadge>
                        <span className="admin-muted">
                          {counts.get(collection.id) ?? 0} products assigned
                        </span>
                      </span>
                    </div>
                    <span className="admin-collection__toggle">
                      Manage collection
                      <ChevronDown aria-hidden="true" size={18} strokeWidth={1.8} />
                    </span>
                  </summary>
                  <div className="admin-collection__actions">
                    <div className="admin-collection__order">
                      <div>
                        <p className="admin-eyebrow">Collection position</p>
                        <p className="admin-muted">New collections go to the end automatically.</p>
                      </div>
                      {search ? (
                        <p className="admin-muted">Clear search to change collection order.</p>
                      ) : (
                        <div className="admin-collection__order-buttons">
                          {(["up", "down"] as const).map((direction) => (
                            <form action={moveCollectionOrder} key={direction}>
                              <input name="collection_id" type="hidden" value={collection.id} />
                              <input name="direction" type="hidden" value={direction} />
                              <input name="return_q" type="hidden" value={search} />
                              <input name="return_page" type="hidden" value={pageNumber} />
                              <AdminSubmitButton
                                className="admin-button admin-button--quiet admin-button--compact"
                                disabled={direction === "up" ? !canMoveUp : !canMoveDown}
                              >
                                Move {direction}
                              </AdminSubmitButton>
                            </form>
                          ))}
                        </div>
                      )}
                    </div>
                    {collection.status !== "archived" ? (
                      <AdminStatusSwitch
                        action={toggleCollectionPublication}
                        checked={collection.status === "published"}
                        disabled={collection.status === "draft" && !activeImages.length}
                        disabledHint={
                          collection.status === "draft" && !activeImages.length
                            ? "Add an image before publishing."
                            : undefined
                        }
                        fields={{
                          collection_id: collection.id,
                          next_status: collection.status === "published" ? "draft" : "published",
                          return_q: search,
                          return_page: String(pageNumber),
                        }}
                        label={
                          (collection.status === "published" ? "Move " : "Publish ") +
                          collection.name
                        }
                        message={
                          collection.status === "published"
                            ? "Move " +
                              collection.name +
                              " back to drafts? It will no longer appear in the storefront."
                            : "Publish " +
                              collection.name +
                              "? Its active images will be visible in the storefront."
                        }
                        offLabel="Draft"
                        onLabel="Published"
                        submitLabel={
                          collection.status === "published"
                            ? "Move to drafts"
                            : "Publish collection"
                        }
                      />
                    ) : null}
                    <form action={saveCollection} className="admin-form">
                      <input name="collection_id" type="hidden" value={collection.id} />
                      <input name="return_q" type="hidden" value={search} />
                      <input name="return_page" type="hidden" value={pageNumber} />
                      <p className="admin-eyebrow">Collection details</p>
                      <div className="admin-form__row">
                        <label className="admin-field">
                          <AdminFieldLabel icon={Tag}>Name</AdminFieldLabel>
                          <input
                            defaultValue={collection.name}
                            maxLength={120}
                            minLength={1}
                            name="name"
                            required
                          />
                        </label>
                        <label className="admin-field">
                          <AdminFieldLabel icon={Link2}>Slug</AdminFieldLabel>
                          <input
                            defaultValue={collection.slug}
                            maxLength={100}
                            minLength={1}
                            name="slug"
                            required
                          />
                        </label>
                      </div>
                      <label className="admin-field">
                        <AdminFieldLabel icon={FileText}>Description</AdminFieldLabel>
                        <textarea
                          defaultValue={collection.description}
                          maxLength={2_000}
                          name="description"
                          rows={3}
                        />
                      </label>
                      <label className="admin-field">
                        <AdminFieldLabel icon={Eye}>Visibility</AdminFieldLabel>
                        <select defaultValue={collection.status} name="status">
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                        <small>
                          Publishing requires an active image. Archiving hides the collection from
                          shoppers.
                        </small>
                      </label>
                      <AdminSubmitButton>Save collection details</AdminSubmitButton>
                    </form>
                    <form action={uploadCollectionImage} className="admin-form">
                      <input name="collection_id" type="hidden" value={collection.id} />
                      <input name="return_q" type="hidden" value={search} />
                      <input name="return_page" type="hidden" value={pageNumber} />
                      <p className="admin-eyebrow">Add collection photos</p>
                      <ImageUploadPreview />
                      <label className="admin-field">
                        <AdminFieldLabel icon={ImageIcon}>Alternative text</AdminFieldLabel>
                        <input maxLength={250} minLength={1} name="alt_text" required />
                        <small>Describe the photo for shoppers using assistive technology.</small>
                      </label>
                      <AdminSubmitButton pendingLabel="Uploading…">Add photo</AdminSubmitButton>
                    </form>
                  </div>
                  <div className="admin-collection__images">
                    <h3>Collection images</h3>
                    <p className="admin-muted">
                      Add a cover or several collection photos (up to 20). JPEG, PNG, WebP or AVIF,
                      up to 5 MiB each.
                    </p>
                    {collectionImages.length ? (
                      <ul className="admin-media-grid">
                        {collectionImages.map((item) => {
                          const activeIndex = activeImages.findIndex(
                            (image) => image.id === item.id,
                          );
                          return (
                            <li className="admin-media-card" key={item.id}>
                              {signedUrlById.get(item.id) ? (
                                <Image
                                  alt={item.alt_text}
                                  height={300}
                                  src={signedUrlById.get(item.id) ?? ""}
                                  unoptimized
                                  width={240}
                                />
                              ) : (
                                <div className="admin-media-card__missing">
                                  Private image unavailable
                                </div>
                              )}
                              <form action={updateCollectionImage} className="admin-form">
                                <input name="collection_id" type="hidden" value={collection.id} />
                                <input name="media_id" type="hidden" value={item.id} />
                                <input name="return_q" type="hidden" value={search} />
                                <input name="return_page" type="hidden" value={pageNumber} />
                                <label className="admin-field">
                                  <AdminFieldLabel icon={ImageIcon}>
                                    Alternative text
                                  </AdminFieldLabel>
                                  <input
                                    defaultValue={item.alt_text}
                                    maxLength={250}
                                    minLength={1}
                                    name="alt_text"
                                    required
                                  />
                                </label>
                                <AdminSubmitButton>Save photo details</AdminSubmitButton>
                              </form>
                              <StatusBadge>{item.status}</StatusBadge>
                              {item.status !== "archived" ? (
                                <>
                                  <p className="admin-muted">
                                    Photo {activeIndex + 1} of {activeImages.length}
                                  </p>
                                  <div className="admin-media-card__order">
                                    {(["up", "down"] as const).map((direction) => (
                                      <form action={moveCollectionImageOrder} key={direction}>
                                        <input
                                          name="collection_id"
                                          type="hidden"
                                          value={collection.id}
                                        />
                                        <input name="media_id" type="hidden" value={item.id} />
                                        <input name="direction" type="hidden" value={direction} />
                                        <input name="return_q" type="hidden" value={search} />
                                        <input
                                          name="return_page"
                                          type="hidden"
                                          value={pageNumber}
                                        />
                                        <AdminSubmitButton
                                          className="admin-button admin-button--quiet admin-button--compact"
                                          disabled={
                                            direction === "up"
                                              ? activeIndex === 0
                                              : activeIndex === activeImages.length - 1
                                          }
                                        >
                                          {direction === "up" ? "Move earlier" : "Move later"}
                                        </AdminSubmitButton>
                                      </form>
                                    ))}
                                  </div>
                                  <form action={archiveCollectionImage}>
                                    <input
                                      name="collection_id"
                                      type="hidden"
                                      value={collection.id}
                                    />
                                    <input name="media_id" type="hidden" value={item.id} />
                                    <input name="return_q" type="hidden" value={search} />
                                    <input name="return_page" type="hidden" value={pageNumber} />
                                    <ConfirmButton
                                      className="admin-button admin-button--quiet"
                                      formAction={archiveCollectionImage}
                                      message="Archive this image? It will stop being shown publicly."
                                      triggerAriaLabel={`Archive a photo for ${collection.name}`}
                                    >
                                      Archive image
                                    </ConfirmButton>
                                  </form>
                                </>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="admin-muted">No collection images uploaded yet.</p>
                    )}
                  </div>
                </details>
              );
            })}
            <AdminPagination
              action="/admin/collections"
              itemLabel="collections"
              page={pageNumber}
              pageSize={PAGE_SIZE}
              query={params}
              total={collectionsResult.count ?? 0}
            />
          </div>
        ) : (
          <div className="admin-empty-state">
            <h2>{search ? "No matching collections" : "No collections created yet"}</h2>
            <p>
              {search
                ? "Change the search term to see more collections."
                : "Create a collection to group products for shoppers."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
