import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Allow multipart overhead for the 5 MiB product-image validation in the upload action.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev({ persist: { path: ".wrangler/state" } });
}
