import {
  AdminNotice,
  AdminPageHeader,
  AdminSectionHeading,
  StatusBadge,
} from "@/features/admin/components/admin-ui";
import { AdminFieldLabel } from "@/features/admin/components/admin-field-label";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { saveStaffMember } from "@/features/admin/server/staff-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";
import { Mail, ShieldCheck, ToggleLeft } from "lucide-react";

export default async function AdminTeamPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff(["owner"])]);
  const { data, error } = await supabase.rpc("list_staff_members_with_email");
  if (error) logAdminQueryFailure("loadStaffMembers", "staff_members", error.code);

  return (
    <>
      <AdminPageHeader eyebrow="Access control · owner only" title="Staff access" />
      {params.saved ? <AdminNotice tone="success">Staff membership saved.</AdminNotice> : null}
      {params.error ? (
        <AdminNotice tone="error">
          Staff access could not be changed. Check the email and keep at least one active owner.
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice tone="error">Staff access list could not be loaded.</AdminNotice>
      ) : null}

      <section className="admin-panel">
        <AdminSectionHeading eyebrow="Current team" title="Members" />
        {error ? null : data?.length ? (
          <div className="admin-table-wrap admin-table-wrap--cards">
            <table className="admin-table">
              <caption className="admin-sr-only">Staff members and access status</caption>
              <thead>
                <tr>
                  <th scope="col">Email address</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((member, index) => (
                  <tr key={`${member.email ?? "email-unavailable"}-${member.created_at}-${index}`}>
                    <th scope="row">{member.email ?? "Email unavailable"}</th>
                    <td data-label="Role">{member.role}</td>
                    <td data-label="Status">
                      <StatusBadge>{member.is_active ? "Active" : "Inactive"}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">No staff members were found.</p>
        )}
      </section>

      <section className="admin-panel admin-panel--narrow">
        <AdminSectionHeading eyebrow="Add or change access" title="Update staff access" />
        <p className="admin-muted">
          Create or invite the account first. You cannot change your own access.
        </p>
        <form action={saveStaffMember} className="admin-form">
          <label className="admin-field">
            <AdminFieldLabel icon={Mail}>Staff email</AdminFieldLabel>
            <input autoComplete="email" maxLength={254} name="email" required type="email" />
          </label>
          <div className="admin-form__row">
            <label className="admin-field">
              <AdminFieldLabel icon={ShieldCheck}>Role</AdminFieldLabel>
              <select defaultValue="staff" name="role">
                <option value="staff">Staff · catalogue</option>
                <option value="owner">Owner · full access</option>
              </select>
            </label>
            <label className="admin-field">
              <AdminFieldLabel icon={ToggleLeft}>Access</AdminFieldLabel>
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
