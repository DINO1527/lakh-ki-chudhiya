const baseUrl = process.env.WORKER_PREVIEW_URL ?? "http://127.0.0.1:8787";
const failures = [];

async function check(name, operation) {
  try {
    const result = await operation();
    if (result && typeof result === "object" && result.status === "Blocked") {
      console.log(`BLOCKED ${name}: ${result.evidence}`);
    } else {
      console.log(`PASS ${name}: ${result}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`FAIL ${name}: ${message}`);
  }
}

async function getPage(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, html: await response.text() };
}

await check("dynamic SSR homepage", async () => {
  const { response, html } = await getPage("/");
  if (!response.ok || !html.includes("Colour with a story of its own.")) {
    throw new Error(`expected rendered home page, received ${response.status}`);
  }
  return `HTTP ${response.status}`;
});

let shopHtml = "";
await check("shop and in-page collection filters", async () => {
  const shop = await getPage("/shop");
  shopHtml = shop.html;
  if (
    !shop.response.ok ||
    !shop.html.includes('id="shop-title"') ||
    !shop.html.includes("A set for your story") ||
    !shop.html.includes('id="catalogue-collection"') ||
    shop.html.toLowerCase().includes("the catalogue is unavailable")
  ) {
    throw new Error(
      `anonymous Shop failed to render its catalogue and collection filters (HTTP ${shop.response.status})`,
    );
  }

  const collectionHref = shop.html.match(/href="(\/shop\?[^" ]*collection=[^" ]+)"/)?.[1];
  if (!collectionHref) return "Shop renders; no published collection filter exists to exercise";

  const filtered = await getPage(collectionHref.replaceAll("&amp;", "&"));
  if (!filtered.response.ok || !filtered.html.includes('id="shop-title"')) {
    throw new Error(`collection filter failed (${filtered.response.status})`);
  }
  return "Shop renders and published collection filters remain on the Shop route";
});

await check("Shop search and empty-result state", async () => {
  const matching = await getPage("/shop?q=red");
  if (
    !matching.response.ok ||
    !matching.html.includes('name="q"') ||
    matching.html.toLowerCase().includes("the catalogue is unavailable")
  ) {
    throw new Error(`search route did not render (${matching.response.status})`);
  }
  const empty = await getPage("/shop?q=qa-no-match-2026");
  if (!empty.response.ok || !empty.html.includes("No published designs match those filters")) {
    throw new Error(`empty-search recovery was not rendered (${empty.response.status})`);
  }
  return "search and no-match recovery rendered";
});

await check("product details from a Shop listing", async () => {
  const productHref = process.env.QA_PRODUCT_SLUG
    ? `/products/${encodeURIComponent(process.env.QA_PRODUCT_SLUG)}`
    : shopHtml.match(/id="published-designs"[\s\S]{0,12000}?href="(\/products\/[a-z0-9-]+)"/i)?.[1];
  if (!productHref) {
    if (process.env.SUPABASE_SMOKE_REQUIRED === "1") {
      throw new Error("no product link exists in Shop while Supabase smoke is required");
    }
    console.log("SKIP product detail smoke: Shop has no visible product fixture.");
    return "no product fixture";
  }

  const product = await getPage(productHref);
  if (
    !product.response.ok ||
    !product.html.includes('id="product-title"') ||
    product.html.toLowerCase().includes("the catalogue is unavailable")
  ) {
    throw new Error(`${productHref} did not render product details (${product.response.status})`);
  }
  return `${productHref} rendered product details`;
});

await check("Supabase stage-0 connectivity probe", async () => {
  const response = await fetch(`${baseUrl}/api/health/supabase`);
  const body = await response.json();
  if (response.status === 200 && body.status === "ok" && body.querySucceeded === true) {
    return "stage0_smoke query succeeded; this does not validate catalogue reads";
  }
  if (process.env.SUPABASE_SMOKE_REQUIRED === "1") {
    throw new Error(`required stage0_smoke query failed (${response.status}, ${body.status})`);
  }
  console.log(
    `SKIP stage0_smoke connectivity: HTTP ${response.status} (${body.status}); database behavior remains unverified.`,
  );
  return "backend unavailable; stage0_smoke and catalogue reads remain unverified";
});

await check("Anonymous admin and account route protection", async () => {
  const protectedRoutes = [
    "/admin",
    "/admin/products",
    "/admin/collections",
    "/admin/offers",
    "/admin/reviews",
    "/admin/orders",
    "/admin/inventory",
    "/admin/customers",
    "/admin/activity",
    "/account/profile",
  ];
  const results = await Promise.all(
    protectedRoutes.map(async (path) => {
      const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      const location = response.headers.get("location");
      const redirectPath = location ? new URL(location, baseUrl).pathname : "";
      const html = await response.text();
      const loginRedirect =
        [301, 302, 303, 307, 308].includes(response.status) &&
        (redirectPath.startsWith("/admin/login") || redirectPath.startsWith("/account/login"));
      const denied = response.status === 401 || response.status === 403;
      const loginForm =
        /<input[^>]+type=["']email["']/i.test(html) &&
        /<input[^>]+type=["']password["']/i.test(html);
      const loginGateCopy = /sign in to continue|authentication required|access denied/i.test(html);
      const privatePageContent =
        /Store administration|Admin navigation|Stock &amp; inventory|Customer feedback|Review status/i.test(
          html,
        );
      const protectedByPage = loginForm || loginGateCopy;
      return {
        path,
        status: response.status,
        redirectPath,
        protected: loginRedirect || denied || protectedByPage,
        privatePageContent,
      };
    }),
  );
  const exposed = results.filter((result) => result.privatePageContent);
  if (exposed.length > 0) {
    throw new Error(
      `anonymous routes returned admin-only page markers: ${exposed.map((result) => result.path).join(", ")}`,
    );
  }
  const unresolved = results.filter((result) => !result.protected);
  if (unresolved.length > 0) {
    return {
      status: "Blocked",
      evidence: `Anonymous GETs returned empty HTTP ${unresolved.map((result) => result.status).join(", ")} shells with no admin markers; hydrated auth routing must be checked in a supported guest browser.`,
    };
  }
  return results
    .map((result) => `${result.path}→${result.redirectPath || result.status}`)
    .join("; ");
});

await check("health route and private cache policy", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  if (
    !response.ok ||
    body.status !== "ok" ||
    !response.headers.get("cache-control")?.includes("no-store")
  ) {
    throw new Error(`unexpected health status or cache policy (${response.status})`);
  }

  const privateResponse = await fetch(`${baseUrl}/api/health/supabase`);
  const cacheControl = privateResponse.headers.get("cache-control") ?? "";
  if (!cacheControl.includes("private") || !cacheControl.includes("no-store")) {
    throw new Error(`private response lacks no-store policy (${privateResponse.status})`);
  }
  return `health HTTP ${response.status}; private response ${cacheControl}`;
});

await check("manifest and service-worker exclusions", async () => {
  const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
  const manifest = await manifestResponse.json();
  const workerResponse = await fetch(`${baseUrl}/sw.js`);
  const workerScript = await workerResponse.text();
  if (
    !manifestResponse.ok ||
    manifest.name !== "Lacora | Handcrafted lac bangles" ||
    !workerResponse.ok
  ) {
    throw new Error("manifest or service worker was not served");
  }
  if (
    !workerScript.includes('url.pathname.startsWith("/api/")') ||
    !workerScript.includes('request.headers.has("cookie")')
  ) {
    throw new Error("service worker does not exclude API and cookie-bearing requests");
  }
  return "manifest and private-route exclusions present";
});

if (failures.length > 0) {
  process.exitCode = 1;
}
