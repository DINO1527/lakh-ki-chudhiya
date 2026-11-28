"use client";

import { useId, useRef, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";
import { AdminToastOutlet } from "./admin-toast-provider";

export function AdminDialog({
  triggerLabel,
  title,
  description,
  children,
  triggerClassName = "admin-button admin-button--secondary",
  triggerAriaLabel,
  eyebrow = "Workspace action",
}: Readonly<{
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  eyebrow?: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        {triggerLabel.startsWith("Edit") ? (
          <Pencil aria-hidden="true" className="admin-button__icon" size={16} strokeWidth={1.8} />
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
              <X aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
          </header>
          <div className="admin-dialog__content">{children}</div>
        </div>
        <AdminToastOutlet />
      </dialog>
    </>
  );
}
