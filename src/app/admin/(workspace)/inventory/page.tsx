import Link from "next/link";
import { ArrowDownUp, ClipboardList } from "lucide-react";
import {
  AdminNotice,
  AdminPageHeader,
  AdminSectionHeading,
  StatusBadge,
  formatAdminDate,
} from "@/features/admin/components/admin-ui";
import { AdminDialog } from "@/features/admin/components/admin-dialog";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminSearchForm } from "@/features/admin/components/admin-search-form";
import { ConfirmButton } from "@/features/admin/components/confirm-button";
import { adjustInventory } from "@/features/admin/server/inventory-actions";
import { requireStaff } from "@/features/admin/server/access";
import { logAdminQueryFailure } from "@/features/admin/server/action-logger";
import { AdminFieldLabel } from "@/features/admin/components/admin-field-label";

const PAGE_SIZE = 25;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminInventoryPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [params, { supabase }] = await Promise.all([searchParams, requireStaff()]);
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .slice(0, 64)
    .trim();
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageNumber = rawPage && /^[0-9]{1,5}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
  const unavailableOnly = params.availability === "unavailable";
  const rawReturnProductId = Array.isArray(params.return_product_id)
    ? params.return_product_id[0]
    : params.return_product_id;
  const returnProductId =
    rawReturnProductId && UUID_PATTERN.test(rawReturnProductId) ? rawReturnProductId : null;
  let variantsQuery = supabase
    .from("product_variants")
    .select(
      "id, product_id, sku, size_code, stock_on_hand, reserved_quantity, is_active, is_available",
      { count: "exact" },
    )
    .order("sku", { ascending: true })
    .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
  if (search) variantsQuery = variantsQuery.ilike("sku", `%${search}%`);
  if (unavailableOnly) variantsQuery = variantsQuery.eq("is_available", false);
  const [variantsResult, movementResult] = await Promise.all([
    variantsQuery,
    supabase
      .from("inventory_movements")
      .select(
        "id, variant_id, movement_type, on_hand_delta, reserved_delta, reason, actor_user_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const variantRows = variantsResult.data ?? [];
  const relevantIds = [
    ...new Set([
      ...variantRows.map((variant) => variant.id),
      ...(movementResult.data ?? []).map((movement) => movement.variant_id),
    ]),
  ];
  const actorIds = [
    ...new Set(
      (movementResult.data ?? []).flatMap((movement) =>
        movement.actor_user_id ? [movement.actor_user_id] : [],
      ),
    ),
  ];
  const [productResult, variantLookupResult, actorEmailsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, slug")
      .in("id", [
        ...new Set([
          ...variantRows.map((variant) => variant.product_id),
          ...(returnProductId ? [returnProductId] : []),
        ]),
      ]),
    relevantIds.length
      ? supabase
          .from("product_variants")
          .select("id, product_id, sku, size_code")
          .in("id", relevantIds)
      : Promise.resolve({ data: [], error: null }),
    actorIds.length
      ? supabase.rpc("get_admin_actor_emails", { p_user_ids: actorIds })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (variantsResult.error)
    logAdminQueryFailure("loadInventoryVariants", "product_variants", variantsResult.error.code);
  if (movementResult.error)
    logAdminQueryFailure(
      "loadInventoryMovements",
      "inventory_movements",
      movementResult.error.code,
    );
  if (productResult.error)
    logAdminQueryFailure("loadInventoryProducts", "products", productResult.error.code);
  if (variantLookupResult.error)
    logAdminQueryFailure(
      "loadInventoryVariantLabels",
      "product_variants",
      variantLookupResult.error.code,
    );
  if (actorEmailsResult.error)
    logAdminQueryFailure("loadInventoryActorEmails", "staff_members", actorEmailsResult.error.code);
  const productById = new Map((productResult.data ?? []).map((product) => [product.id, product]));
  const variantById = new Map(
    (variantLookupResult.data ?? []).map((variant) => [variant.id, variant]),
  );
  const actorEmailById = new Map(
    (actorEmailsResult.data ?? []).map((actor) => [actor.user_id, actor.email]),
  );
  const returnProduct = returnProductId ? productById.get(returnProductId) : undefined;

  return (
    <>
      <AdminPageHeader
        eyebrow="Stock control"
        title="Inventory"
        action={
          <Link
            className="admin-button admin-button--quiet"
            href={
              returnProduct
                ? `/admin/products/${returnProduct.id}?section=product-variants`
                : "/admin/products"
            }
          >
            {returnProduct ? "Back to product setup" : "Back to products"}
          </Link>
        }
      />
      {params.saved ? <AdminNotice tone="success">Stock adjustment recorded.</AdminNotice> : null}
      {params.error ? (
        <AdminNotice tone="error">
          {params.error === "invalid"
            ? "Enter a nonzero whole-number quantity change and a reason."
            : params.error === "database_update"
              ? "The UAT database is missing the current inventory update. Apply the current inventory migrations, then retry."
              : params.error === "permission"
                ? "Your staff access does not allow this stock adjustment."
                : "Stock was not changed. It cannot be reduced below reserved stock; check the quantity and try again."}
        </AdminNotice>
      ) : null}
      {variantsResult.error ||
      movementResult.error ||
      productResult.error ||
      variantLookupResult.error ? (
        <AdminNotice tone="error">Some inventory data could not be loaded.</AdminNotice>
      ) : null}
      <AdminNotice>
        Available = on hand − reserved. Confirmed orders reserve sets; dispatch consumes them, and
        pre-dispatch cancellation releases them. Adjustments cannot go below reserved stock.
      </AdminNotice>

      <section aria-labelledby="inventory-list-heading" className="admin-panel">
        <AdminSectionHeading
          eyebrow="Per-variant quantities"
          id="inventory-list-heading"
          title="Stock by SKU"
        />
        <AdminSearchForm
          action="/admin/inventory"
          hasFilters={unavailableOnly}
          label="Search by SKU"
          placeholder="Enter a SKU"
          query={search}
        >
          <label className="admin-checkbox">
            <input
              defaultChecked={unavailableOnly}
              name="availability"
              type="checkbox"
              value="unavailable"
            />
            <span>Unavailable only</span>
          </label>
        </AdminSearchForm>
        {variantRows.length ? (
          <div className="admin-table-wrap admin-table-wrap--cards">
            <table className="admin-table admin-inventory-table">
              <caption className="admin-sr-only">
                On-hand stock, reserved quantities and adjustments by product variant
              </caption>
              <thead>
                <tr>
                  <th scope="col">SKU and product</th>
                  <th scope="col">On hand</th>
                  <th scope="col">Reserved</th>
                  <th scope="col">Available</th>
                  <th scope="col">Add or remove stock</th>
                </tr>
              </thead>
              <tbody>
                {variantRows.map((variant) => {
                  const product = productById.get(variant.product_id);
                  return (
                    <tr key={variant.id}>
                      <th scope="row">
                        <strong>{variant.sku}</strong>
                        <span className="admin-table__subtext">
                          {product ? (
                            <Link
                              className="admin-text-link"
                              href={`/admin/products/${product.id}?section=product-variants`}
                            >
                              {product.title}
                            </Link>
                          ) : (
                            "Unknown product"
                          )}{" "}
                          · {variant.size_code ?? "One size"}
                        </span>
                        <span className="admin-table__subtext">
                          {variant.is_active ? "Active" : "Inactive"}
                        </span>
                      </th>
                      <td data-label="On hand">{variant.stock_on_hand}</td>
                      <td data-label="Reserved">{variant.reserved_quantity}</td>
                      <td data-label="Available">
                        <StatusBadge>
                          {variant.is_available
                            ? String(variant.stock_on_hand - variant.reserved_quantity)
                            : "Unavailable"}
                        </StatusBadge>
                      </td>
                      <td data-label="Actions">
                        <AdminDialog
                          description="Adjust complete sets by a positive or negative amount. The reason is added to the stock audit trail."
                          title={`Adjust ${variant.sku}`}
                          triggerAriaLabel={`Adjust stock for ${variant.sku}`}
                          triggerLabel="Adjust stock"
                          triggerClassName="admin-button admin-button--secondary admin-button--compact"
                        >
                          <form action={adjustInventory} className="admin-form">
                            <input name="variant_id" type="hidden" value={variant.id} />
                            {returnProductId === variant.product_id ? (
                              <input
                                name="return_product_id"
                                type="hidden"
                                value={returnProductId}
                              />
                            ) : null}
                            <input name="return_sku" type="hidden" value={variant.sku} />
                            <label className="admin-field">
                              <AdminFieldLabel icon={ArrowDownUp}>Quantity change</AdminFieldLabel>
                              <input
                                aria-describedby={`quantity-help-${variant.id}`}
                                inputMode="numeric"
                                max="2147483647"
                                min="-2147483648"
                                name="quantity_delta"
                                placeholder="e.g. 5"
                                required
                                step="1"
                                type="number"
                              />
                              <small id={`quantity-help-${variant.id}`}>
                                Use a minus sign to remove sets. Changes below reserved stock are
                                rejected.
                              </small>
                            </label>
                            <label className="admin-field">
                              <AdminFieldLabel icon={ClipboardList}>Reason</AdminFieldLabel>
                              <input
                                maxLength={500}
                                minLength={1}
                                name="reason"
                                placeholder="Stock count or delivery received"
                                required
                              />
                            </label>
                            <ConfirmButton
                              className="admin-button admin-button--primary"
                              formAction={adjustInventory}
                              message={`Record the stock adjustment for ${variant.sku}?`}
                            >
                              Review stock adjustment
                            </ConfirmButton>
                          </form>
                        </AdminDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !variantsResult.error ? (
          <p className="admin-muted">
            No variants match this view. Add product variants in the catalogue.
          </p>
        ) : null}
        <AdminPagination
          action="/admin/inventory"
          itemLabel="SKUs"
          page={pageNumber}
          pageSize={PAGE_SIZE}
          query={params}
          total={variantsResult.count ?? 0}
        />
      </section>

      <section aria-labelledby="inventory-history-heading" className="admin-panel">
        <AdminSectionHeading
          eyebrow="Audit trail"
          id="inventory-history-heading"
          title="Recent stock movements"
        />
        {movementResult.data?.length ? (
          <div className="admin-table-wrap admin-table-wrap--cards">
            <table className="admin-table">
              <caption className="admin-sr-only">Most recent inventory adjustments</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Change</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Actor</th>
                </tr>
              </thead>
              <tbody>
                {movementResult.data.map((movement) => {
                  const variant = variantById.get(movement.variant_id);
                  return (
                    <tr key={movement.id}>
                      <td data-label="Time">{formatAdminDate(movement.created_at)}</td>
                      <td data-label="SKU">{variant?.sku ?? "SKU no longer available"}</td>
                      <td data-label="Change">
                        {movement.on_hand_delta > 0 ? "+" : ""}
                        {movement.on_hand_delta}
                      </td>
                      <td data-label="Reason">{movement.reason}</td>
                      <td data-label="Actor">
                        {movement.actor_user_id
                          ? (actorEmailById.get(movement.actor_user_id) ?? "Staff account")
                          : "Account removed"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !movementResult.error ? (
          <p className="admin-muted">No inventory movements recorded yet.</p>
        ) : null}
      </section>
    </>
  );
}
