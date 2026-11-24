import { AdminNotice, AdminPageHeader } from "@/features/admin/components/admin-ui";
import { requireStaff } from "@/features/admin/server/access";
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
  const notice = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <>
      <AdminPageHeader
        eyebrow="Store setup"
        title="Commerce settings"
        description="Set the verified store contact and decide whether COD can be offered. Product eligibility is controlled on each product."
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
                maxLength={16}
                name="whatsapp_number"
                placeholder="94771234567"
              />
              <small>
                Country code then digits only, without “+”, spaces or dashes. Customers choose when
                to open WhatsApp.
              </small>
            </label>
            <label className="admin-checkbox">
              <input defaultChecked={data.cod_enabled} name="cod_enabled" type="checkbox" />
              <span>
                Enable cash on delivery
                <small>COD is offered only when every product in the order also allows COD.</small>
              </span>
            </label>
            <button className="admin-button admin-button--primary" type="submit">
              Save checkout settings
            </button>
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
