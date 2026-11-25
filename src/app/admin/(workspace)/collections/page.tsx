import Image from "next/image";
import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import {
  archiveCollectionImage,
  saveCollection,
  updateCollectionImage,
  uploadCollectionImage,
} from "@/features/admin/server/collection-actions";
import { requireStaff } from "@/features/admin/server/access";

export default async function AdminCollectionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const [collectionsResult, linksResult] = await Promise.all([
    supabase
      .from("collections")
      .select("id, slug, name, description, status, sort_order, updated_at")
      .order("sort_order")
      .order("name"),
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
  const signedUrlById = new Map(
    mediaRows.map((item, index) => [item.id, signedMedia.data?.[index]?.signedUrl ?? null]),
  );
  const imagesByCollectionId = new Map<string, typeof mediaRows>();
  for (const image of mediaRows) {
    const current = imagesByCollectionId.get(image.collection_id) ?? [];
    current.push(image);
    imagesByCollectionId.set(image.collection_id, current);
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Collections"
        description="Organize products into public collections or keep working collections in draft."
      />
      {params.saved ? <AdminNotice tone="success">Collection saved.</AdminNotice> : null}
      {params.error ? (
        <AdminNotice tone="error">
          {params.error === "image_required"
            ? "Add at least one image before publishing this collection."
            : params.error === "last_image"
              ? "Keep one published image on a published collection. Move the collection to draft or archive first to remove the last image."
              : params.error === "image_limit"
                ? "A collection can have up to 20 active images. Archive one before adding another."
                : "Collection could not be saved. Check the title, unique URL slug and image upload."}
        </AdminNotice>
      ) : null}
      {params.image === "uploaded" ? (
        <AdminNotice tone="success">Collection image uploaded privately.</AdminNotice>
      ) : null}
      {params.image === "archived" ? (
        <AdminNotice tone="success">Collection image archived.</AdminNotice>
      ) : null}
      {collectionsResult.error || linksResult.error || mediaResult.error || signedMedia.error ? (
        <AdminNotice tone="error">Collection data could not be loaded.</AdminNotice>
      ) : null}

      <section aria-labelledby="new-collection-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Start here</p>
            <h2 id="new-collection-heading">Create a collection</h2>
          </div>
        </div>
        <form action={saveCollection} className="admin-form">
          <input name="collection_id" type="hidden" value="" />
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Name</span>
              <input maxLength={120} name="name" required />
            </label>
            <label className="admin-field">
              <span>
                Slug <small>Leave blank to derive from the name.</small>
              </span>
              <input maxLength={100} name="slug" />
            </label>
          </div>
          <label className="admin-field">
            <span>Description</span>
            <textarea maxLength={2_000} name="description" rows={3} />
          </label>
          <div className="admin-form__row admin-form__row--small">
            <label className="admin-field">
              <span>Display order</span>
              <input defaultValue="0" name="sort_order" type="number" />
            </label>
          </div>
          <p className="admin-muted">
            New collections start as drafts. Add an image, then publish from the collection editor.
          </p>
          <button className="admin-button admin-button--primary" type="submit">
            Create collection
          </button>
        </form>
      </section>

      <section aria-labelledby="existing-collections-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Current catalogue</p>
            <h2 id="existing-collections-heading">Edit collections</h2>
          </div>
        </div>
        {collections.length ? (
          <div className="admin-collection-list">
            {collections.map((collection) => (
              <details className="admin-collection" key={collection.id}>
                <summary>
                  <span>
                    <strong>{collection.name}</strong>
                    <StatusBadge>{collection.status}</StatusBadge>
                    <span className="admin-muted">
                      {counts.get(collection.id) ?? 0} product links
                    </span>
                  </span>
                  <span aria-hidden="true">Edit</span>
                </summary>
                <form action={saveCollection} className="admin-form">
                  <input name="collection_id" type="hidden" value={collection.id} />
                  <div className="admin-form__row">
                    <label className="admin-field">
                      <span>Name</span>
                      <input defaultValue={collection.name} maxLength={120} name="name" required />
                    </label>
                    <label className="admin-field">
                      <span>Slug</span>
                      <input defaultValue={collection.slug} maxLength={100} name="slug" required />
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
                      <input defaultValue={collection.sort_order} name="sort_order" type="number" />
                    </label>
                    <label className="admin-field">
                      <span>Visibility</span>
                      <select defaultValue={collection.status} name="status">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                  </div>
                  <button className="admin-button admin-button--secondary" type="submit">
                    Save collection
                  </button>
                </form>
                <div className="admin-collection__images">
                  <h3>Collection images</h3>
                  <p className="admin-muted">
                    Add a cover or several collection photos (up to 20). JPEG, PNG, WebP or AVIF, up
                    to 5 MiB each.
                  </p>
                  <form
                    action={uploadCollectionImage}
                    className="admin-form admin-upload-form"
                    encType="multipart/form-data"
                  >
                    <input name="collection_id" type="hidden" value={collection.id} />
                    <label className="admin-field">
                      <span>Choose image</span>
                      <input
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        name="file"
                        required
                        type="file"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Alternative text</span>
                      <input maxLength={250} name="alt_text" required />
                    </label>
                    <label className="admin-field">
                      <span>Photo order</span>
                      <input defaultValue="0" name="sort_order" type="number" />
                    </label>
                    <button className="admin-button admin-button--secondary" type="submit">
                      Upload private image
                    </button>
                  </form>
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
                          <form action={updateCollectionImage} className="admin-form">
                            <input name="collection_id" type="hidden" value={collection.id} />
                            <input name="media_id" type="hidden" value={item.id} />
                            <label className="admin-field">
                              <span>Alternative text</span>
                              <input
                                defaultValue={item.alt_text}
                                maxLength={250}
                                name="alt_text"
                                required
                              />
                            </label>
                            <label className="admin-field">
                              <span>Photo order</span>
                              <input
                                defaultValue={item.sort_order}
                                name="sort_order"
                                type="number"
                              />
                            </label>
                            <button className="admin-button admin-button--secondary" type="submit">
                              Save photo details
                            </button>
                          </form>
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
          </div>
        ) : (
          <p className="admin-muted">No collections created yet.</p>
        )}
      </section>
    </>
  );
}
