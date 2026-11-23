import { BangleLoader } from "@/components/shared/bangle-loader";

export default function Loading() {
  return (
    <main className="app-loading">
      <BangleLoader label="Preparing your Lacora experience" />
    </main>
  );
}
