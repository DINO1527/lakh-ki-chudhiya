import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { changeAdminPassword } from "@/features/admin/server/auth-actions";
import { requireStaff } from "@/features/admin/server/access";

const errorMessages: Record<string, string> = {
  current: "The current password could not be verified.",
  invalid: "Enter the current password and matching new passwords of at least 12 characters.",
  update: "The password could not be changed. Try again or contact the store owner.",
};

export default async function AdminSecurityPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params] = await Promise.all([searchParams, requireStaff()]);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <>
      <AdminPageHeader
        eyebrow="Your account"
        title="Account security"
        description="Change your staff account password. Your current password is checked again before the change is saved."
      />
      {params.status === "updated" ? (
        <AdminNotice tone="success">Your password has been updated.</AdminNotice>
      ) : null}
      {error && errorMessages[error] ? (
        <AdminNotice tone="error">{errorMessages[error]}</AdminNotice>
      ) : null}

      <section
        aria-labelledby="change-password-heading"
        className="admin-panel admin-panel--narrow"
      >
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Password</p>
            <h2 id="change-password-heading">Set a new password</h2>
          </div>
        </div>
        <form action={changeAdminPassword} className="admin-form">
          <label className="admin-field">
            <span>Current password</span>
            <input
              autoComplete="current-password"
              name="current_password"
              required
              type="password"
            />
          </label>
          <label className="admin-field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              name="new_password"
              required
              type="password"
            />
          </label>
          <label className="admin-field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              name="confirm_password"
              required
              type="password"
            />
          </label>
          <AdminSubmitButton pendingLabel="Updating password…">Change password</AdminSubmitButton>
        </form>
      </section>
    </>
  );
}
