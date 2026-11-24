import Link from "next/link";
import { describeOfferTerms, type PublicStorefrontOffer } from "../domain/catalogue";

export function StorefrontOfferList({
  offers,
  compact = false,
}: {
  offers: readonly PublicStorefrontOffer[];
  compact?: boolean;
}) {
  if (offers.length === 0) return null;

  return (
    <ul
      aria-label="Current offers"
      className={`storefront-offers${compact ? " storefront-offers--compact" : ""}`}
    >
      {offers.map((offer) => {
        const targetHref =
          offer.targetType === "product"
            ? `/products/${offer.targetSlug}`
            : `/collections/${offer.targetSlug}`;

        return (
          <li className="storefront-offer" key={offer.id}>
            <p className="storefront-offer__eyebrow">Current offer</p>
            <h3>{offer.name}</h3>
            <p>{describeOfferTerms(offer)}</p>
            {!compact && (
              <Link className="storefront-offer__link" href={targetHref}>
                Shop this offer <span aria-hidden="true">→</span>
              </Link>
            )}
            {offer.endsAt && (
              <p className="storefront-offer__expiry">
                Ends{" "}
                <time dateTime={offer.endsAt}>
                  {new Intl.DateTimeFormat("en-LK", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Colombo",
                  }).format(new Date(offer.endsAt))}
                </time>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
