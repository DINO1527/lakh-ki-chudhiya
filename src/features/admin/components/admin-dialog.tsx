"use client";

import { useId, useRef, type ReactNode } from "react";
import { AdminToastOutlet } from "./admin-toast-provider";

export function AdminDialog({
  triggerLabel,
  title,
  description,
  children,
  triggerClassName = "admin-button admin-button--secondary",
  eyebrow = "Workspace action",
}: Readonly<{
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
  eyebrow?: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        className={triggerClassName}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {triggerLabel.startsWith("Edit") ? (
          <svg aria-hidden="true" className="admin-button__icon" fill="none" viewBox="0 0 20 20">
            <path
              d="m13.2 3.4 3.4 3.4M4 16l3.1-.6L16 6.5 13.5 4 4.6 12.9 4 16Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
          </svg>
        ) : null}
        {triggerLabel}
      </button>
      <dialog
        aria-labelledby={titleId}
        className="admin-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        ref={dialogRef}
      >
        <div className="admin-dialog__panel">
          <header className="admin-dialog__header">
            <div>
              <p className="admin-eyebrow">{eyebrow}</p>
              <h2 id={titleId}>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
            <button
              aria-label={`Close ${title}`}
              className="admin-button admin-button--icon admin-button--quiet"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
                <path
                  d="m5 5 10 10M15 5 5 15"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          </header>
          <div className="admin-dialog__content">{children}</div>
        </div>
        <AdminToastOutlet />
      </dialog>
    </>
  );
}
