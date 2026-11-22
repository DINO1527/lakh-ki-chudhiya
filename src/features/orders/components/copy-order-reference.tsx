"use client";

import { useState } from "react";

export function CopyOrderReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="order-reference-copy">
      <code>{reference}</code>
      <button className="button button--secondary" onClick={copyReference} type="button">
        {copied ? "Copied" : "Copy reference"}
      </button>
      <span aria-live="polite" className="sr-only" role="status">
        {copied ? "Order reference copied." : ""}
      </span>
    </div>
  );
}
