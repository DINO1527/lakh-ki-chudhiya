import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { saveHomepageContent } from "@/features/admin/server/content-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

export default async function AdminContentPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const { data, error } = await supabase
    .from("site_content")
    .select("eyebrow, title, body, cta_label, cta_href, status, updated_at")
    .eq("content_key", "home_hero")
    .maybeSingle();
  if (error) logAdminQueryFailure("loadHomepageContent", "site_content", error.code);

  return (
    <>
      <AdminPageHeader eyebrow="Store content" title="Homepage hero" />
      {params.saved ? <AdminNotice tone="success">Homepage content saved.</AdminNotice> : null}
      {params.error ? (
        <AdminNotice tone="error">
          Content could not be saved. Check the text, status and internal link.
        </AdminNotice>
      ) : null}
      {error ? <AdminNotice tone="error">Homepage content could not be loaded.</AdminNotice> : null}
      {data ? (
        <p className="admin-content-status">
          Current visibility <StatusBadge>{data.status}</StatusBadge>
          {data.updated_at ? (
            <span>
              {" "}
              · Updated{" "}
              {new Intl.DateTimeFormat("en-LK", {
                dateStyle: "medium",
                timeZone: "Asia/Colombo",
              }).format(new Date(data.updated_at))}
            </span>
          ) : null}
        </p>
      ) : null}
      <section className="admin-panel admin-panel--narrow">
        <form action={saveHomepageContent} className="admin-form">
          <label className="admin-field">
            <span>Eyebrow</span>
            <input defaultValue={data?.eyebrow ?? ""} maxLength={120} name="eyebrow" />
          </label>
          <label className="admin-field">
            <span>Headline</span>
            <input defaultValue={data?.title ?? ""} maxLength={160} name="title" required />
          </label>
          <label className="admin-field">
            <span>Description</span>
            <textarea defaultValue={data?.body ?? ""} maxLength={4_000} name="body" rows={6} />
          </label>
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Button label</span>
              <input defaultValue={data?.cta_label ?? ""} maxLength={80} name="cta_label" />
            </label>
            <label className="admin-field">
              <span>Internal destination</span>
              <input
                defaultValue={data?.cta_href ?? "/shop"}
                maxLength={300}
                name="cta_href"
                placeholder="/shop"
              />
            </label>
          </div>
          <label className="admin-field">
            <span>Visibility</span>
            <select defaultValue={data?.status ?? "published"} name="status">
              <option value="draft">Draft · hidden on the homepage</option>
              <option value="published">Published</option>
              <option value="archived">Archived · hidden on the homepage</option>
            </select>
          </label>
          <p className="admin-muted">
            Only internal paths beginning with one slash are accepted. Use owner-approved product
            claims and images.
          </p>
          <AdminSubmitButton>Save homepage content</AdminSubmitButton>
        </form>
      </section>
    </>
  );
}
