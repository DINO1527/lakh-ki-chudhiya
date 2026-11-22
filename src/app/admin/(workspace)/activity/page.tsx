import {
  AdminNotice,
  AdminPageHeader,
  formatAdminDate,
} from "@/features/admin/components/admin-ui";
import { requireStaff } from "@/features/admin/server/access";

export default async function AdminActivityPage() {
  const { supabase } = await requireStaff(["owner"]);
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, actor_user_id, resource_type, record_id, action, changed_fields, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <AdminPageHeader
        eyebrow="Owner only · audit"
        title="Activity"
        description="Recent product, variant, collection, media, content and staff changes. Inventory quantity adjustments are recorded in Inventory history."
      />
      {error ? <AdminNotice tone="error">Activity log could not be loaded.</AdminNotice> : null}
      {data?.length ? (
        <div className="admin-panel">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-sr-only">Recent administration changes</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Record</th>
                  <th scope="col">Change</th>
                  <th scope="col">Fields</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatAdminDate(entry.created_at)}</td>
                    <td>
                      <code>{entry.actor_user_id ?? "Account removed"}</code>
                    </td>
                    <td>
                      <strong>{entry.resource_type.replaceAll("_", " ")}</strong>
                      <span className="admin-table__subtext">
                        <code>{entry.record_id}</code>
                      </span>
                    </td>
                    <td>{entry.action}</td>
                    <td>{entry.changed_fields.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="admin-muted">
            Showing the latest 100 changes. This log stores changed field names, not old or new
            content values.
          </p>
        </div>
      ) : error ? null : (
        <section className="admin-empty-state">
          <h2>No activity recorded yet</h2>
          <p>
            Product and catalogue changes appear here as the team begins using the admin workspace.
          </p>
        </section>
      )}
    </>
  );
}
