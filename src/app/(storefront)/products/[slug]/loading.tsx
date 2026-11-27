import { BangleLoader } from "@/components/shared/bangle-loader";

export default function ProductLoading() {
  return (
    <main aria-busy="true" className="app-loading" id="main-content">
      <BangleLoader label="Loading product details" />
    </main>
  );
}
