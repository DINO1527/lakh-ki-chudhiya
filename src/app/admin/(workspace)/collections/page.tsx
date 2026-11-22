import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { saveCollection } from "@/features/admin/server/collection-actions";
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
          Collection could not be saved. Check the title and unique URL slug.
        </AdminNotice>
      ) : null}
      {collectionsResult.error || linksResult.error ? (
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
            <label className="admin-field">
              <span>Visibility</span>
              <select defaultValue="draft" name="status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
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
        {collectionsResult.data?.length ? (
          <div className="admin-collection-list">
            {collectionsResult.data.map((collection) => (
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
