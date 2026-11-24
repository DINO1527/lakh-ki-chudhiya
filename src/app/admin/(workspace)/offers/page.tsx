import { AdminNotice, AdminPageHeader, StatusBadge } from "@/features/admin/components/admin-ui";
import { OfferForm, type OfferFormValues } from "@/features/promotions/components/offer-form";
import { utcToColomboDateTimeLocal } from "@/features/promotions/domain/schedule";
import { requireStaff } from "@/features/admin/server/access";

export default async function AdminOffersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const [{ supabase }, params] = await Promise.all([requireStaff(), searchParams]);
  const [offersResult, productsResult, collectionsResult] = await Promise.all([
    supabase.from("offers").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("products").select("id, title, status").order("title").limit(1_000),
    supabase.from("collections").select("id, name, status").order("name").limit(1_000),
  ]);
  const queryError = offersResult.error || productsResult.error || collectionsResult.error;
  const offers = offersResult.data ?? [];
  const productTargets = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    label: `${product.title} · ${product.status}`,
  }));
  const collectionTargets = (collectionsResult.data ?? []).map((collection) => ({
    id: collection.id,
    label: `${collection.name} · ${collection.status}`,
  }));
  const saved = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <>
      <AdminPageHeader
        eyebrow="Promotions"
        title="Offers"
        description="Create product or collection offers. Checkout calculates the discount again from current server data."
      />
      {saved ? <AdminNotice tone="success">Offer saved.</AdminNotice> : null}
      {error ? (
        <AdminNotice tone="error">
          Offer could not be saved. Check its target, discount and schedule.
        </AdminNotice>
      ) : null}
      {queryError ? (
        <AdminNotice tone="error">Offers or catalogue targets could not be loaded.</AdminNotice>
      ) : null}

      <section aria-labelledby="new-offer-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">New promotion</p>
            <h2 id="new-offer-heading">Create an offer</h2>
          </div>
        </div>
        <OfferForm collections={collectionTargets} products={productTargets} />
      </section>

      <section aria-labelledby="offer-list-heading" className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Saved rules</p>
            <h2 id="offer-list-heading">Offer list</h2>
          </div>
        </div>
        {offers.length ? (
          <div className="admin-offer-list">
            {offers.map((offer) => {
              const targetType = offer.target_type;
              const targetId =
                targetType === "product" ? offer.target_product_id : offer.target_collection_id;
              const targetLabel =
                (targetType === "product" ? productTargets : collectionTargets).find(
                  (target) => target.id === targetId,
                )?.label ?? "Target missing";
              const values: OfferFormValues = {
                id: offer.id,
                name: offer.name,
                targetType,
                targetId: targetId ?? "",
                minimumSets: offer.minimum_sets,
                discountBasisPoints: offer.discount_basis_points,
                startsAt: utcToColomboDateTimeLocal(offer.starts_at),
                endsAt: utcToColomboDateTimeLocal(offer.ends_at),
                isEnabled: offer.is_enabled,
              };
              return (
                <article className="admin-offer-card" key={offer.id}>
                  <div className="admin-offer-card__heading">
                    <div>
                      <h3>{offer.name}</h3>
                      <p>
                        {targetLabel} · {offer.minimum_sets}+ sets ·{" "}
                        {formatPercent(offer.discount_basis_points)}% off
                      </p>
                    </div>
                    <StatusBadge>{offer.is_enabled ? "on" : "off"}</StatusBadge>
                  </div>
                  <details>
                    <summary>Edit offer</summary>
                    <OfferForm
                      collections={collectionTargets}
                      offer={values}
                      products={productTargets}
                    />
                  </details>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="admin-muted">No offers have been created.</p>
        )}
      </section>
    </>
  );
}

function formatPercent(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2).replace(/\.?0+$/, "");
}
