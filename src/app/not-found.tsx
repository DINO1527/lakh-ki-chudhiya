import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell" id="main-content">
      <p className="eyebrow">Page not found</p>
      <h1 className="page-heading">This page is not here.</h1>
      <p className="page-intro">The page may have moved, or its address may be incorrect.</p>
      <p>
        <Link className="text-link" href="/">
          Return home <span aria-hidden="true">→</span>
        </Link>
      </p>
    </main>
  );
}
