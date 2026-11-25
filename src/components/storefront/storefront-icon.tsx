import type { ReactNode } from "react";

type StorefrontIconName =
  | "search"
  | "user"
  | "bag"
  | "home"
  | "grid"
  | "gem"
  | "ruler"
  | "truck"
  | "message";

const iconPaths: Record<StorefrontIconName, ReactNode> = {
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.1 3.2-5 7-5s6.3 1.9 7 5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l1 12H4L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  gem: <path d="m12 2 8 7-8 13L4 9l8-7Zm-8 7h16M8 5l4 4 4-4m-4 4v13" />,
  ruler: (
    <>
      <path d="M4 17 17 4l3 3L7 20l-3-3Z" />
      <path d="m13 8 2 2m-5 1 2 2m-5 1 2 2" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </>
  ),
  message: (
    <>
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.2-3.4A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M9 11h.01M13 11h.01M17 11h.01" />
    </>
  ),
};

export function StorefrontIcon({ name, size = 20 }: { name: StorefrontIconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="storefront-icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.65"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}
