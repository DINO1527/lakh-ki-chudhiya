"use client";

import { Children, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";

export type AdminProductSection = Readonly<{ id: string; label: string }>;

export function AdminProductSectionTabs({
  sections,
  children,
}: Readonly<{ sections: readonly AdminProductSection[]; children: ReactNode }>) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sectionNodes = Children.toArray(children);
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === activeId),
  );
  const activeSection = sections[activeIndex];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % sections.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + sections.length) % sections.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = sections.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveId(sections[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  if (!activeSection) return null;

  return (
    <>
      <nav aria-label="Product sections" className="admin-section-nav">
        <div
          aria-label="Product editing sections"
          className="admin-section-nav__tabs"
          role="tablist"
        >
          {sections.map((section, index) => (
            <button
              aria-controls={`${section.id}-panel`}
              aria-selected={section.id === activeSection.id}
              className="admin-section-nav__tab"
              id={`${section.id}-tab`}
              key={section.id}
              onClick={() => setActiveId(section.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={section.id === activeSection.id ? 0 : -1}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
        <Link className="admin-section-nav__inventory" href="/admin/inventory">
          Inventory
        </Link>
      </nav>
      <div
        aria-labelledby={`${activeSection.id}-tab`}
        className="admin-product-section-panel"
        id={`${activeSection.id}-panel`}
        role="tabpanel"
        tabIndex={0}
      >
        {sectionNodes[activeIndex] ?? null}
      </div>
    </>
  );
}
