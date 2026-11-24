"use client";

import { useState } from "react";
import { saveOffer } from "@/features/admin/server/commerce-actions";

type OfferTargetType = "product" | "collection";
type OfferTarget = { id: string; label: string };

export type OfferFormValues = {
  id?: string;
  name?: string;
  targetType?: OfferTargetType;
  targetId?: string;
  minimumSets?: number;
  discountBasisPoints?: number;
  startsAt?: string;
  endsAt?: string;
  isEnabled?: boolean;
};

export function OfferForm({
  offer,
  products,
  collections,
}: Readonly<{
  offer?: OfferFormValues;
  products: readonly OfferTarget[];
  collections: readonly OfferTarget[];
}>) {
  const [targetType, setTargetType] = useState<OfferTargetType>(offer?.targetType ?? "product");
  const targets = targetType === "product" ? products : collections;

  return (
    <form action={saveOffer} className="admin-form offer-form">
      <input name="offer_id" type="hidden" value={offer?.id ?? ""} />
      <label className="admin-field">
        <span>Offer name</span>
        <input defaultValue={offer?.name ?? ""} maxLength={120} name="name" required />
      </label>
      <div className="admin-form__row">
        <label className="admin-field">
          <span>Offer applies to</span>
          <select
            name="target_type"
            onChange={(event) => setTargetType(event.target.value as OfferTargetType)}
            value={targetType}
          >
            <option value="product">One product</option>
            <option value="collection">A collection</option>
          </select>
        </label>
        <label className="admin-field">
          <span>{targetType === "product" ? "Product" : "Collection"}</span>
          <select
            defaultValue={offer?.targetId ?? ""}
            key={`${targetType}-${offer?.targetId ?? "new"}`}
            name="target_id"
            required
          >
            <option disabled value="">
              Choose a target
            </option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form__row">
        <label className="admin-field">
          <span>Minimum complete sets</span>
          <input
            defaultValue={offer?.minimumSets ?? 3}
            max="1000"
            min="1"
            name="minimum_sets"
            required
            type="number"
          />
        </label>
        <label className="admin-field">
          <span>Discount percent</span>
          <input
            defaultValue={offer ? formatPercent(offer.discountBasisPoints ?? 0) : "10"}
            max="100"
            min="0.01"
            name="discount_percent"
            required
            step="0.01"
            type="number"
          />
        </label>
      </div>
      <p className="admin-muted">
        For a collection offer, the qualifying quantity is the combined number of complete sets from
        that collection in one order. The best single valid offer is applied; offers never stack.
      </p>
      <div className="admin-form__row">
        <label className="admin-field">
          <span>
            Starts (Colombo time) <small>Optional</small>
          </span>
          <input defaultValue={offer?.startsAt ?? ""} name="starts_at" type="datetime-local" />
        </label>
        <label className="admin-field">
          <span>
            Ends (Colombo time) <small>Optional</small>
          </span>
          <input defaultValue={offer?.endsAt ?? ""} name="ends_at" type="datetime-local" />
        </label>
      </div>
      <label className="admin-checkbox">
        <input defaultChecked={offer?.isEnabled ?? false} name="is_enabled" type="checkbox" />
        <span>
          Offer is on
          <small>Future and expired offers remain stored but do not discount orders.</small>
        </span>
      </label>
      <button className="admin-button admin-button--secondary" type="submit">
        {offer ? "Save offer" : "Create offer"}
      </button>
    </form>
  );
}

function formatPercent(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2).replace(/\.?0+$/, "");
}
