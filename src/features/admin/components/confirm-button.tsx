"use client";

import { useId, useRef, type ReactNode } from "react";
import { AdminSubmitButton } from "./admin-submit-button";
import { AdminToastOutlet } from "./admin-toast-provider";

export function ConfirmButton({
  children,
  message,
  className,
  formAction,
  triggerRole,
  triggerAriaLabel,
  triggerAriaChecked,
  triggerAriaDescribedBy,
  triggerTitle,
  triggerDisabled = false,
  submitClassName = "admin-button admin-button--danger",
  submitLabel = "Confirm",
  submitPendingLabel = "Working…",
}: Readonly<{
  children: ReactNode;
  message: string;
  className: string;
  formAction: (formData: FormData) => void | Promise<void>;
  triggerRole?: "switch";
  triggerAriaLabel?: string;
  triggerAriaChecked?: boolean;
  triggerAriaDescribedBy?: string;
  triggerTitle?: string;
  triggerDisabled?: boolean;
  submitClassName?: string;
  submitLabel?: ReactNode;
  submitPendingLabel?: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  return (
    <>
      <button
        aria-checked={triggerAriaChecked}
        aria-describedby={triggerAriaDescribedBy}
        aria-label={triggerAriaLabel}
        className={className}
        disabled={triggerDisabled}
        onClick={() => dialogRef.current?.showModal()}
        role={triggerRole}
        title={triggerTitle}
        type="button"
      >
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
              className={submitClassName}
              formAction={formAction}
              pendingLabel={submitPendingLabel}
            >
              {submitLabel}
            </AdminSubmitButton>
          </div>
        </div>
        <AdminToastOutlet />
      </dialog>
    </>
  );
}
