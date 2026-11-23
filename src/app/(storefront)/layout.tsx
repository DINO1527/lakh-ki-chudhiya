import type { ReactNode } from "react";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { MobileNavigation } from "@/components/storefront/mobile-navigation";

export default function StorefrontLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="storefront-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileNavigation />
    </div>
  );
}
