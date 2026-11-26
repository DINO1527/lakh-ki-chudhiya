import Image from "next/image";
import Link from "next/link";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { ImageUploadPreview } from "@/features/admin/components/image-upload-preview";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import {
  archiveCollectionImage,
  saveCollection,
  updateCollectionImage,
  uploadCollectionImage,
} from "@/features/admin/server/collection-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

const PAGE_SIZE = 12;

export default async function AdminCollectionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const createdId = Array.isArray(params.created) ? params.created[0] : params.created;
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
    .order("name");
  if (search) collectionQuery = collectionQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  collectionQuery = collectionQuery.range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
  const [collectionsResult, linksResult] = await Promise.all([
    collectionQuery,
    supabase.from("product_collections").select("collection_id"),
  ]);
  const counts = new Map<string, number>();
  for (const link of linksResult.data ?? [])
    counts.set(link.collection_id, (counts.get(link.collection_id) ?? 0) + 1);
  const collections = collectionsResult.data ?? [];
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
    [...imagesByCollectionId.entries()].map(([collectionId, images]) => {
      const cover = images[0];
      return [
        collectionId,
        {
          altText: cover.alt_text,
          url: signedUrlById.get(cover.id) ?? null,
        },
      ] as const;
    }),
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Collections"
        description="Group related products for shoppers. A collection stays private until you publish it."
        action={
          <Link className="admin-button admin-button--primary" href="#new-collection">
            Create collection
          </Link>
        }
      />
      {createdId ? (
        <AdminNotice tone="success">
          Draft created. Add its images, then set visibility to Published and save to show it in the
          storefront.
        </AdminNotice>
      ) : null}
      {params.saved && !createdId && !params.image ? (
        <AdminNotice tone="success">Collection changes saved.</AdminNotice>
      ) : null}
      {params.error ? (
        <AdminNotice tone="error">
          {params.error === "image_required"
            ? "Add at least one image before publishing this collection."
            : params.error === "last_image"
              ? "Keep one published image on a published collection. Move the collection to draft or archive first to remove the last image."
              : params.error === "image_limit"
                ? "A collection can have up to 20 active images. Archive one before adding another."
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
      {collectionsResult.error || linksResult.error || mediaResult.error || signedMedia.error ? (
        <AdminNotice tone="error">Collection data could not be loaded.</AdminNotice>
      ) : null}

      <section aria-labelledby="new-collection-heading" className="admin-panel" id="new-collection">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Step 1 · Create</p>
            <h2 id="new-collection-heading">Create a collection</h2>
          </div>
        </div>
        <p className="admin-muted">
          Begin with a name. Add collection images here, then assign products from each
          product&apos;s editor.
        </p>
        <form action={saveCollection} className="admin-form">
          <input name="collection_id" type="hidden" value="" />
          <label className="admin-field">
            <span>Collection name</span>
            <input maxLength={120} minLength={1} name="name" required />
          </label>
          <details className="admin-form-details">
            <summary>Add optional details now</summary>
            <div className="admin-form-details__content">
              <label className="admin-field">
                <span>
                  URL slug <small>Leave blank to derive it from the name.</small>
                </span>
                <input maxLength={100} name="slug" />
              </label>
              <label className="admin-field">
                <span>Description</span>
                <textarea maxLength={2_000} name="description" rows={3} />
              </label>
              <label className="admin-field">
                <span>Display order</span>
                <input
                  defaultValue="0"
                  max="2147483647"
                  min="-2147483648"
                  name="sort_order"
                  step="1"
                  type="number"
                />
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
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Step 2 · Images and visibility</p>
            <h2 id="existing-collections-heading">Existing collections</h2>
          </div>
        </div>
        <AdminSearchForm
          action="/admin/collections"
          label="Search collections"
          placeholder="Name or URL slug"
          query={search}
        />
        {collectionsResult.error ? null : collections.length ? (
          <div className="admin-collection-list">
            {collections.map((collection) => (
              <details
                className="admin-collection"
                id={`collection-${collection.id}`}
                key={collection.id}
                open={createdId === collection.id}
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
                  <span>Edit collection</span>
                </summary>
                <div className="admin-collection__actions">
                  <AdminDialog
                    description="Update the collection name, public URL, description, order and visibility."
                    title={collection.name}
                    triggerLabel="Edit collection"
                  >
                    <form action={saveCollection} className="admin-form">
                      <input name="collection_id" type="hidden" value={collection.id} />
                      <div className="admin-form__row">
                        <label className="admin-field">
                          <span>Name</span>
                          <input
                            defaultValue={collection.name}
                            maxLength={120}
                            minLength={1}
                            name="name"
                            required
                          />
                        </label>
                        <label className="admin-field">
                          <span>Slug</span>
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
                        <span>Description</span>
                        <textarea
                          defaultValue={collection.description}
                          maxLength={2_000}
                          name="description"
                          rows={3}
                        />
                      </label>
                      <div className="admin-form__row admin-form__row--small">
                        <label className="admin-field">
                          <span>Display order</span>
                          <input
                            defaultValue={collection.sort_order}
                            max="2147483647"
                            min="-2147483648"
                            name="sort_order"
                            step="1"
                            type="number"
                          />
                        </label>
                        <label className="admin-field">
                          <span>Visibility</span>
                          <select defaultValue={collection.status} name="status">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </select>
                          <small>
                            Publishing requires an image and makes the collection&apos;s draft
                            images public.
                          </small>
                        </label>
                      </div>
                      <AdminSubmitButton>Save collection</AdminSubmitButton>
                    </form>
                  </AdminDialog>
                  <AdminDialog
                    description="Choose a real collection image and preview it before uploading."
                    title={`Add photo to ${collection.name}`}
                    triggerLabel="Add photo"
                  >
                    <form action={uploadCollectionImage} className="admin-form">
                      <input name="collection_id" type="hidden" value={collection.id} />
                      <ImageUploadPreview />
                      <label className="admin-field">
                        <span>Alternative text</span>
                        <input maxLength={250} minLength={1} name="alt_text" required />
                        <small>
                          Describe the collection image for shoppers using assistive technology.
                        </small>
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
                      <AdminSubmitButton pendingLabel="Uploading…">
                        Add collection photo
                      </AdminSubmitButton>
                    </form>
                  </AdminDialog>
                </div>
                <div className="admin-collection__images">
                  <h3>Collection images</h3>
                  <p className="admin-muted">
                    Add a cover or several collection photos (up to 20). JPEG, PNG, WebP or AVIF, up
                    to 5 MiB each.
                  </p>
                  {imagesByCollectionId.get(collection.id)?.length ? (
                    <ul className="admin-media-grid">
                      {imagesByCollectionId.get(collection.id)?.map((item) => (
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
                          <AdminDialog
                            description="Adjust accessible text and the photo order for this collection."
                            title="Edit collection photo"
                            triggerLabel="Edit photo"
                          >
                            <form action={updateCollectionImage} className="admin-form">
                              <input name="collection_id" type="hidden" value={collection.id} />
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
                          {item.status !== "archived" ? (
                            <form action={archiveCollectionImage}>
                              <input name="collection_id" type="hidden" value={collection.id} />
                              <input name="media_id" type="hidden" value={item.id} />
                              <ConfirmButton
                                className="admin-button admin-button--quiet"
                                formAction={archiveCollectionImage}
                                message="Archive this image? It will stop being shown publicly."
                              >
                                Archive image
                              </ConfirmButton>
                            </form>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-muted">No collection images uploaded yet.</p>
                  )}
                </div>
              </details>
            ))}
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
