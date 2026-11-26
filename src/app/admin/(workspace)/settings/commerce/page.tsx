import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";
import { saveCommerceSettings } from "@/features/admin/server/commerce-actions";

export default async function CommerceSettingsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [{ supabase }, params] = await Promise.all([requireStaff(["owner"]), searchParams]);
  const { data, error } = await supabase
    .from("store_settings")
    .select("singleton, cod_enabled, whatsapp_number, updated_at")
    .eq("singleton", true)
    .maybeSingle();
  if (error) logAdminQueryFailure("loadCommerceSettings", "store_settings", error.code);
  const notice = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <>
      <AdminPageHeader
        eyebrow="Store setup"
        title="Checkout settings"
        description="Set the verified store contact and decide whether cash on delivery can be offered. Online payments are not available yet."
      />
      {notice ? <AdminNotice tone="success">Commerce settings saved.</AdminNotice> : null}
      {errorCode ? (
        <AdminNotice tone="error">
          {errorCode === "phone_required"
            ? "Add the verified WhatsApp number before enabling COD."
            : "Settings could not be saved. Check the phone format and try again."}
        </AdminNotice>
      ) : null}
      {error ? (
        <AdminNotice tone="error">Commerce settings could not be loaded.</AdminNotice>
      ) : null}

      {data ? (
        <section
          aria-labelledby="commerce-contact-heading"
          className="admin-panel admin-panel--narrow"
        >
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Order contact and payment</p>
              <h2 id="commerce-contact-heading">Customer checkout</h2>
            </div>
          </div>
          <form action={saveCommerceSettings} className="admin-form">
            <label className="admin-field">
              <span>Verified WhatsApp number</span>
              <input
                autoComplete="off"
                defaultValue={data.whatsapp_number ?? ""}
                inputMode="tel"
                maxLength={32}
                minLength={8}
                name="whatsapp_number"
                pattern="[+]?[0-9 ()-]{8,32}"
                placeholder="94771234567"
                type="tel"
              />
              <small>
                Country code then digits only, without “+”, spaces or dashes. Customers choose when
                to open WhatsApp.
              </small>
            </label>
            <label className="admin-checkbox">
              <input defaultChecked={data.cod_enabled} name="cod_enabled" type="checkbox" />
              <span>
                Allow cash on delivery (COD) at checkout
                <small>
                  COD is available only when this setting, the verified WhatsApp number and every
                  product in the order allow it.
                </small>
              </span>
            </label>
            <AdminSubmitButton>Save checkout settings</AdminSubmitButton>
          </form>

          <div className="admin-readonly-setting">
            <strong>Online payment</strong>
            <p>
              Unavailable until a real provider is integrated, its credentials are secured, and
              sandbox verification passes. This app does not take online payments or mark orders
              paid automatically.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
