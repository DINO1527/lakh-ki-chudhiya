"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function AdminSubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "admin-button admin-button--primary",
  disabled = false,
  formAction,
}: Readonly<{
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending || undefined}
      className={className}
      disabled={disabled || pending}
      formAction={formAction}
      type="submit"
    >
      {pending ? <span aria-hidden="true" className="admin-button__spinner" /> : null}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  );
}
