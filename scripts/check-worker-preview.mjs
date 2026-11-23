const baseUrl = process.env.WORKER_PREVIEW_URL ?? "http://127.0.0.1:8787";
const failures = [];

async function check(name, operation) {
  try {
    const result = await operation();
    console.log(`PASS ${name}: ${result}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`FAIL ${name}: ${message}`);
  }
}

await check("dynamic SSR response", async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();
  if (!response.ok || !html.includes("Colour with a story of its own.")) {
    throw new Error(`expected rendered home page, received ${response.status}`);
  }
  return `HTTP ${response.status}`;
});

await check("Stage 1 catalogue routes", async () => {
  const routes = [
    ["/shop", "Shop bangles"],
    ["/collections", "Collections"],
    ["/size-guide", "Size guide"],
    ["/collections/uat-fixtures-not-for-sale", null],
    ["/products/uat-sample-bangle-not-for-sale", null],
  ];
  for (const [path, expectedHeading] of routes) {
    const response = await fetch(`${baseUrl}${path}`);
    const html = await response.text();
    const isExpectedNotFound = expectedHeading === null && response.status === 404;
    if (
      (!response.ok && !isExpectedNotFound) ||
      (expectedHeading && !html.includes(expectedHeading)) ||
      (expectedHeading === null && response.ok && !html.includes('id="main-content"'))
    ) {
      throw new Error(`${path} did not render its expected heading (${response.status})`);
    }
  }
  return `${routes.length} catalogue routes responded`;
});

await check("published and draft fixture visibility", async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health/supabase`);
  const health = await healthResponse.json();
  if (healthResponse.status !== 200 || health.status !== "ok") {
    if (process.env.SUPABASE_SMOKE_REQUIRED === "1") {
      throw new Error("Supabase is required for this smoke run but is not configured");
    }
    console.log(
      `SKIP catalogue RLS smoke: Supabase returned ${healthResponse.status} (${health.status}); UAT visibility remains unverified.`,
    );
    return "backend unavailable; UAT visibility remains unverified";
  }

  const publishedResponse = await fetch(`${baseUrl}/products/uat-sample-bangle-not-for-sale`);
  const publishedHtml = await publishedResponse.text();
  if (publishedResponse.status === 404 && process.env.SUPABASE_SMOKE_REQUIRED !== "1") {
    console.log("SKIP catalogue RLS smoke: UAT fixture seed is not present.");
    return "UAT fixture seed absent";
  }
  if (!publishedResponse.ok || !publishedHtml.includes("UAT Sample Bangle")) {
    throw new Error(`published UAT fixture is not visible (${publishedResponse.status})`);
  }

  const draftResponse = await fetch(`${baseUrl}/products/uat-draft-fixture-hidden`);
  if (draftResponse.status !== 404) {
    throw new Error(`draft fixture should be hidden, received ${draftResponse.status}`);
  }
  return "published fixture visible and draft fixture returns 404";
});

await check("route handler and no-store policy", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  if (
    !response.ok ||
    body.status !== "ok" ||
    !response.headers.get("cache-control")?.includes("no-store")
  ) {
    throw new Error(`unexpected status or cache policy (${response.status})`);
  }
  return `HTTP ${response.status}, ${response.headers.get("cache-control")}`;
});

await check("private Supabase cache policy", async () => {
  const response = await fetch(`${baseUrl}/api/health/supabase`);
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!cacheControl.includes("private") || !cacheControl.includes("no-store")) {
    throw new Error(`private response lacks no-store policy (${response.status})`);
  }
  const body = await response.json();
  if (response.status === 200 && body.status === "ok")
    return "configured Auth/query path returned 200";
  if (
    response.status === 503 &&
    ["unconfigured", "unavailable"].includes(body.status) &&
    process.env.SUPABASE_SMOKE_REQUIRED !== "1"
  ) {
    console.log(
      `SKIP Supabase auth/query behavior: backend returned 503 (${body.status}); connectivity and auth/query behavior remain unverified.`,
    );
    return "private no-store verified; backend behavior skipped";
  }
  throw new Error(`unexpected Supabase smoke response (${response.status}, ${body.status})`);
});

await check("manifest and service-worker resources", async () => {
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
  return "manifest, service worker, private-route exclusions present";
});

if (failures.length > 0) {
  process.exitCode = 1;
}
