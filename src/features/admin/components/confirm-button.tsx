"use client";

import { useId, useRef, type ReactNode } from "react";
import { AdminSubmitButton } from "./admin-submit-button";
import { AdminToastOutlet } from "./admin-toast-provider";

export function ConfirmButton({
  children,
  message,
  className,
  formAction,
}: Readonly<{
  children: ReactNode;
  message: string;
  className: string;
  formAction: (formData: FormData) => void | Promise<void>;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  return (
    <>
      <button className={className} onClick={() => dialogRef.current?.showModal()} type="button">
        {children}
      </button>
      <dialog
        aria-describedby={messageId}
        aria-labelledby={titleId}
        className="admin-dialog admin-dialog--confirm"
        ref={dialogRef}
      >
        <div className="admin-dialog__panel admin-dialog__panel--compact">
          <h2 id={titleId}>Are you sure?</h2>
          <p id={messageId}>{message}</p>
          <div className="admin-form__actions">
            <button
              className="admin-button admin-button--quiet"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <AdminSubmitButton
              className="admin-button admin-button--danger"
              formAction={formAction}
              pendingLabel="Working…"
            >
              Confirm
            </AdminSubmitButton>
          </div>
        </div>
        <AdminToastOutlet />
      </dialog>
    </>
  );
}
