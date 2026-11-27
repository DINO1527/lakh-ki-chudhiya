import {
  AdminNotice,
  AdminPageHeader,
  formatAdminDate,
} from "@/features/admin/components/admin-ui";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";
import { requireStaff } from "@/features/admin/server/access";

export default async function AdminActivityPage() {
  const { supabase } = await requireStaff(["owner"]);
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, actor_user_id, resource_type, record_id, action, changed_fields, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const actorIds = [
    ...new Set((data ?? []).flatMap((entry) => (entry.actor_user_id ? [entry.actor_user_id] : []))),
  ];
  const actorEmailsResult = actorIds.length
    ? await supabase.rpc("get_admin_actor_emails", { p_user_ids: actorIds })
    : { data: [], error: null };
  if (actorEmailsResult.error) {
    logAdminQueryFailure("loadActivityActorEmails", "staff_members", actorEmailsResult.error.code);
  }
  const actorEmailById = new Map(
    (actorEmailsResult.data ?? []).map((actor) => [actor.user_id, actor.email]),
  );

  return (
    <>
      <AdminPageHeader eyebrow="Owner only · audit" title="Activity" />
      {error ? <AdminNotice tone="error">Activity log could not be loaded.</AdminNotice> : null}
      {data?.length ? (
        <div className="admin-panel">
          <div className="admin-table-wrap admin-table-wrap--cards">
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
                    <td data-label="When">{formatAdminDate(entry.created_at)}</td>
                    <td data-label="Actor">
                      {entry.actor_user_id
                        ? (actorEmailById.get(entry.actor_user_id) ?? "Staff account")
                        : "Account removed"}
                    </td>
                    <td data-label="Record">
                      <strong>{entry.resource_type.replaceAll("_", " ")}</strong>
                      <span className="admin-table__subtext">
                        <code>{entry.record_id}</code>
                      </span>
                    </td>
                    <td data-label="Change">{entry.action}</td>
                    <td data-label="Fields">{entry.changed_fields.join(", ")}</td>
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
          <p>Product and catalogue changes will appear here.</p>
        </section>
      )}
    </>
  );
}
