"use client";

import type { MouseEvent, ReactNode } from "react";

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
  function confirmAction(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }

  return (
    <button className={className} formAction={formAction} onClick={confirmAction} type="submit">
      {children}
    </button>
  );
}
