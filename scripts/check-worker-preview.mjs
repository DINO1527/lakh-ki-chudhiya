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
  ];
  for (const [path, expectedHeading] of routes) {
    const response = await fetch(`${baseUrl}${path}`);
    const html = await response.text();
    if (!response.ok || !html.includes(expectedHeading)) {
      throw new Error(`${path} did not render its expected heading (${response.status})`);
    }
  }
  return `${routes.length} catalogue routes returned their expected headings`;
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

await check("local R2 fixture read", async () => {
  const response = await fetch(`${baseUrl}/api/health/r2`);
  const body = await response.text();
  if (!response.ok || !body.includes("Local-only Stage 0 R2 binding fixture.")) {
    throw new Error(`expected local R2 fixture, received ${response.status}`);
  }
  return `HTTP ${response.status}, no-store`;
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
    body.status === "unconfigured" &&
    process.env.SUPABASE_SMOKE_REQUIRED !== "1"
  ) {
    console.log("SKIP Supabase auth/query behavior: no local Supabase project is configured.");
    return "private no-store verified; backend behavior skipped";
  }
  throw new Error(`unexpected Supabase smoke response (${response.status}, ${body.status})`);
});

await check("manifest and service-worker resources", async () => {
  const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
  const manifest = await manifestResponse.json();
  const workerResponse = await fetch(`${baseUrl}/sw.js`);
  const workerScript = await workerResponse.text();
  if (!manifestResponse.ok || manifest.name !== "Lakh Ki Chudhiya" || !workerResponse.ok) {
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
