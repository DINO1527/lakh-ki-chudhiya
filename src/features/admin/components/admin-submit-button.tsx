"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function AdminSubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "admin-button admin-button--primary",
  disabled = false,
  formAction,
  name,
  value,
}: Readonly<{
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
}>) {
  const { action, pending } = useFormStatus();
  const isThisActionPending = pending && (!formAction || action === formAction);

  return (
    <button
      aria-busy={isThisActionPending || undefined}
      className={className}
      disabled={disabled || pending}
      formAction={formAction}
      name={name}
      type="submit"
      value={value}
    >
      {isThisActionPending ? <span aria-hidden="true" className="admin-button__spinner" /> : null}
      <span>{isThisActionPending ? pendingLabel : children}</span>
    </button>
  );
}
