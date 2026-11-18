import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Size guide | Lakh Ki Chudhiya",
  description: "Learn what bangle sizing information to check before ordering.",
};

export default function SizeGuidePage() {
  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">Find your fit</p>
      <h1 className="page-heading">Size guide</h1>
      <p className="page-intro">
        Bangle sizing depends on the inside diameter and the way a bangle passes over your hand. We
        are verifying the maker’s size chart before listing sizes for sale.
      </p>

      <div className="size-notes">
        <section aria-labelledby="measure-title" className="size-note">
          <h2 id="measure-title">Measure a bangle you own</h2>
          <p>
            Lay a well-fitting rigid bangle flat and measure straight across its inside opening,
            from inner edge to inner edge. Record the result in millimetres and compare it with the
            verified measurement shown on a product page.
          </p>
        </section>
        <section aria-labelledby="chart-title" className="size-note">
          <h2 id="chart-title">Use verified measurements</h2>
          <p>
            Traditional size codes vary between makers. We will publish the matching codes and
            measured inside diameters once the supplier’s chart has been confirmed. No conversion
            table is available yet.
          </p>
        </section>
      </div>
    </main>
  );
}
