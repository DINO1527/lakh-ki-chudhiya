import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { saveStaffMember } from "@/features/admin/server/staff-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";

export default async function AdminTeamPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff(["owner"])]);
  const { data, error } = await supabase
    .from("staff_members")
    .select("user_id, role, is_active, created_at")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) logAdminQueryFailure("loadStaffMembers", "staff_members", error.code);

  return (
    <>
      <AdminPageHeader
        eyebrow="Access control · owner only"
        title="Staff access"
        description="Assign roles to existing Supabase Auth accounts. Public users cannot grant themselves staff access."
      />
      {params.saved ? <AdminNotice tone="success">Staff membership saved.</AdminNotice> : null}
      {params.error ? (
        <AdminNotice tone="error">
          Membership could not be changed. Verify the Auth user ID and keep at least one active
          owner.
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice tone="error">Staff access list could not be loaded.</AdminNotice>
      ) : null}

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Current team</p>
            <h2>Members</h2>
          </div>
        </div>
        {error ? null : data?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-sr-only">
                Staff account identifiers and access status
              </caption>
              <thead>
                <tr>
                  <th scope="col">Supabase Auth user ID</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((member) => (
                  <tr key={member.user_id}>
                    <th scope="row">
                      <code>{member.user_id}</code>
                    </th>
                    <td>{member.role}</td>
                    <td>
                      <StatusBadge>{member.is_active ? "Active" : "Inactive"}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">
            No staff membership rows were found. Create the initial owner through the documented
            database-owner bootstrap step.
          </p>
        )}
      </section>

      <section className="admin-panel admin-panel--narrow">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Add or change access</p>
            <h2>Save a staff member</h2>
          </div>
        </div>
        <p className="admin-muted">
          Create or invite the user through Supabase Auth first, then paste their Auth user UUID. To
          change an existing member, use the same UUID. You cannot edit your own membership here.
        </p>
        <form action={saveStaffMember} className="admin-form">
          <label className="admin-field">
            <span>Auth user UUID</span>
            <input
              autoComplete="off"
              maxLength={36}
              name="user_id"
              pattern="[0-9a-fA-F-]{36}"
              required
            />
          </label>
          <div className="admin-form__row">
            <label className="admin-field">
              <span>Role</span>
              <select defaultValue="staff" name="role">
                <option value="staff">Staff · catalogue and inventory</option>
                <option value="owner">Owner · all admin controls</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Access</span>
              <select defaultValue="active" name="is_active">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          <AdminSubmitButton>Save access</AdminSubmitButton>
        </form>
      </section>
    </>
  );
}
