"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { saveOffer } from "@/features/admin/server/commerce-actions";
import { AdminSubmitButton } from "@/features/admin/components/admin-submit-button";

type OfferTargetType = "product" | "collection";
type OfferTarget = { id: string; label: string; isPublished?: boolean };

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
  hasPublishedBanner = false,
  showEnableToggle = true,
  returnSearch = "",
  returnPage,
}: Readonly<{
  offer?: OfferFormValues;
  products: readonly OfferTarget[];
  collections: readonly OfferTarget[];
  hasPublishedBanner?: boolean;
  showEnableToggle?: boolean;
  returnSearch?: string;
  returnPage?: number;
}>) {
  const [targetType, setTargetType] = useState<OfferTargetType>(offer?.targetType ?? "product");
  const [targetId, setTargetId] = useState(offer?.targetId ?? "");
  const [isEnabled, setIsEnabled] = useState(offer?.isEnabled ?? false);
  const startsAtRef = useRef<HTMLInputElement>(null);
  const endsAtRef = useRef<HTMLInputElement>(null);
  const enableRef = useRef<HTMLInputElement>(null);
  const targets = targetType === "product" ? products : collections;
  const selectedTarget = targets.find((target) => target.id === targetId);
  const canEnable = hasPublishedBanner && selectedTarget?.isPublished === true;

  function updateEnableValidity(
    nextType: OfferTargetType,
    nextTargetId: string,
    shouldEnable: boolean,
  ) {
    const nextTargets = nextType === "product" ? products : collections;
    const selectedTarget = nextTargets.find((target) => target.id === nextTargetId);
    const missingRequirement = !hasPublishedBanner
      ? "Publish an offer banner before enabling this offer."
      : !selectedTarget?.isPublished
        ? "Choose a published product or collection before enabling this offer."
        : "";
    enableRef.current?.setCustomValidity(shouldEnable ? missingRequirement : "");
  }

  function validateSchedule(event: ChangeEvent<HTMLInputElement>) {
    const startsAt =
      event.currentTarget.name === "starts_at"
        ? event.currentTarget.value
        : (startsAtRef.current?.value ?? "");
    const endsAt =
      event.currentTarget.name === "ends_at"
        ? event.currentTarget.value
        : (endsAtRef.current?.value ?? "");
    endsAtRef.current?.setCustomValidity(
      startsAt && endsAt && endsAt <= startsAt ? "Choose an end time after the start time." : "",
    );
  }

  return (
    <form action={saveOffer} className="admin-form offer-form">
      <input name="offer_id" type="hidden" value={offer?.id ?? ""} />
      <input name="return_q" type="hidden" value={returnSearch} />
      {returnPage ? <input name="return_page" type="hidden" value={returnPage} /> : null}
      <p className="admin-eyebrow">1 · Name the offer and choose what it applies to</p>
      <label className="admin-field">
        <span>Offer name</span>
        <input
          defaultValue={offer?.name ?? ""}
          maxLength={120}
          minLength={1}
          name="name"
          required
        />
      </label>
      <div className="admin-form__row">
        <label className="admin-field">
          <span>Offer applies to</span>
          <select
            name="target_type"
            onChange={(event) => {
              const nextType = event.target.value as OfferTargetType;
              setTargetType(nextType);
              setTargetId("");
              setIsEnabled(enableRef.current?.checked ?? false);
              updateEnableValidity(nextType, "", enableRef.current?.checked ?? false);
            }}
            required
            value={targetType}
          >
            <option value="product">One product</option>
            <option value="collection">A collection</option>
          </select>
        </label>
        <label className="admin-field">
          <span>{targetType === "product" ? "Product" : "Collection"}</span>
          <select
            key={`${targetType}-${offer?.targetId ?? "new"}`}
            name="target_id"
            onChange={(event) => {
              const nextTargetId = event.target.value;
              setTargetId(nextTargetId);
              updateEnableValidity(targetType, nextTargetId, enableRef.current?.checked ?? false);
            }}
            required
            value={targetId}
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
      <p className="admin-eyebrow">2 · Set the discount rule</p>
      <div className="admin-form__row">
        <label className="admin-field">
          <span>Minimum complete sets</span>
          <input
            defaultValue={offer?.minimumSets ?? undefined}
            max="1000"
            min="1"
            name="minimum_sets"
            placeholder="3"
            required
            type="number"
          />
          <small>
            For a collection offer, quantities from that collection are combined in one order.
          </small>
        </label>
        <label className="admin-field">
          <span>Discount percent</span>
          <input
            defaultValue={offer ? formatPercent(offer.discountBasisPoints ?? 0) : undefined}
            max="100"
            min="0.01"
            name="discount_percent"
            placeholder="10"
            required
            step="0.01"
            type="number"
          />
        </label>
      </div>
      <p className="admin-eyebrow">3 · Choose when it is available</p>
      <p className="admin-muted">
        Leave the start blank to begin immediately and the end blank for no expiry. Entered times
        use Colombo time.
      </p>
      <div className="admin-form__row">
        <label className="admin-field">
          <span>
            Starts in Colombo time <small>Optional</small>
          </span>
          <input
            defaultValue={offer?.startsAt ?? ""}
            name="starts_at"
            onChange={validateSchedule}
            ref={startsAtRef}
            type="datetime-local"
          />
        </label>
        <label className="admin-field">
          <span>
            Ends in Colombo time <small>Optional</small>
          </span>
          <input
            defaultValue={offer?.endsAt ?? ""}
            name="ends_at"
            onChange={validateSchedule}
            ref={endsAtRef}
            type="datetime-local"
          />
        </label>
      </div>
      {showEnableToggle ? (
        <label className="admin-checkbox">
          <input
            checked={isEnabled}
            disabled={!isEnabled && !canEnable}
            name="is_enabled"
            onChange={(event) => {
              setIsEnabled(event.currentTarget.checked);
              updateEnableValidity(targetType, targetId, event.currentTarget.checked);
            }}
            ref={enableRef}
            type="checkbox"
          />
          <span>
            Enable this offer
            <small>
              {!hasPublishedBanner
                ? "Publish a banner before enabling this offer. "
                : !selectedTarget?.isPublished
                  ? "Choose a published product or collection before enabling this offer. "
                  : "A published banner and target are ready. "}
              Checkout uses the best single eligible offer; discounts do not stack. Scheduled or
              expired offers do not apply.
            </small>
          </span>
        </label>
      ) : offer?.isEnabled ? (
        <input name="is_enabled" type="hidden" value="on" />
      ) : null}
      <div className="admin-form__actions">
        <AdminSubmitButton
          className="admin-button admin-button--secondary"
          disabled={!targets.length}
          name="save_intent"
          value="save"
          pendingLabel={offer ? "Saving offer…" : "Creating offer…"}
        >
          {offer ? "Save" : "Create offer"}
        </AdminSubmitButton>
        <AdminSubmitButton
          disabled={!targets.length}
          name="save_intent"
          value="banner"
          pendingLabel="Saving and opening banner…"
        >
          {offer ? "Save and continue to banner" : "Create and continue to banner"}
        </AdminSubmitButton>
      </div>
      {!targets.length ? (
        <p className="admin-muted">Create a {targetType} before you can attach an offer to it.</p>
      ) : null}
    </form>
  );
}

function formatPercent(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2).replace(/\.?0+$/, "");
}
