import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    files: ["src/**/*.{js,mjs,ts,tsx}"],
    rules: {
      "no-console": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "coverage/**",
      "cloudflare-env.d.ts",
      "src/types/cloudflare-env.generated.d.ts",
    ],
  },
];

export default config;
