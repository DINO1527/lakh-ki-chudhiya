import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "./service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lakh Ki Chudhiya",
  description: "Discover handcrafted lac bangles from Lakh Ki Chudhiya.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
