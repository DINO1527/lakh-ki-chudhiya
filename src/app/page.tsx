import Link from "next/link";

export default function HomePage() {
  return (
    <main id="main-content">
      <section aria-labelledby="home-title" className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Lac bangles, made by hand</p>
          <h1 className="hero__title" id="home-title">
            Colour with a story of its own.
          </h1>
          <p className="hero__description">
            We are preparing a thoughtful collection of handcrafted lac bangles. The pieces, sizes
            and details will be shared here once they are ready.
          </p>
          <Link className="button button--primary" href="/shop">
            Explore the collection
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div aria-hidden="true" className="hero-art">
          <span className="hero-art__ring hero-art__ring--outer" />
          <span className="hero-art__ring hero-art__ring--middle" />
          <span className="hero-art__ring hero-art__ring--inner" />
          <span className="hero-art__caption">Crafted with care</span>
        </div>
      </section>

      <section aria-labelledby="story-title" className="story-section">
        <div className="story-section__label">
          <span className="eyebrow">The craft</span>
          <span aria-hidden="true" className="story-section__rule" />
        </div>
        <div className="story-section__content">
          <h2 className="section-title" id="story-title">
            Made slowly. Meant to be kept.
          </h2>
          <p className="body-copy">
            Lac bangle making brings warmth, colour and patient handwork together. We are gathering
            the details and imagery for our first collection before opening the shop.
          </p>
          <Link className="text-link" href="/collections">
            About the collection <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="welcome-title" className="welcome-panel">
        <p className="eyebrow">A little more time</p>
        <h2 id="welcome-title">Our first collection is being prepared.</h2>
        <p>
          Product photographs, verified sizes and current prices will appear here as soon as they
          are ready.
        </p>
        <Link className="button button--outline" href="/size-guide">
          Visit the size guide
        </Link>
      </section>
    </main>
  );
}
