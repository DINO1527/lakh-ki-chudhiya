"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";

type ToastTone = "success" | "error";
type Toast = Readonly<{ id: string; tone: ToastTone; content: ReactNode }>;
type ToastContextValue = Readonly<{
  toasts: readonly Toast[];
  push: (toast: Toast) => void;
  dismiss: (id: string) => void;
}>;

const ToastContext = createContext<ToastContextValue | null>(null);
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((module) => module.DotLottieReact),
  {
    ssr: false,
    loading: () => (
      <span aria-hidden="true" className="admin-toast__mark">
        ✓
      </span>
    ),
  },
);

export function AdminToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const validationToastId = useId();

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Toast) => {
    setToasts((current) => [...current.filter((item) => item.id !== toast.id), toast].slice(-4));
  }, []);
  const contextValue = useMemo(() => ({ toasts, push, dismiss }), [dismiss, push, toasts]);

  function reportInvalidField(event: FormEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    )
      return;
    event.preventDefault();
    target.setAttribute("aria-invalid", "true");
    const form = target.form;
    showValidationToast(form, target);
  }

  function clearResolvedValidation(event: FormEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    )
      return;
    if (target.validity.valid) target.removeAttribute("aria-invalid");
    const firstInvalid = target.form?.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(":invalid");
    if (!firstInvalid) dismiss(validationToastId);
    else showValidationToast(target.form, firstInvalid);
  }

  function showValidationToast(
    form: HTMLFormElement | null,
    firstTarget: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  ) {
    const invalidFields = form
      ? Array.from(
          form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            ":invalid",
          ),
        )
      : [firstTarget];
    const label =
      firstTarget.labels?.[0]?.querySelector("span")?.firstChild?.textContent?.trim() ||
      firstTarget.name ||
      "This field";
    const remaining =
      invalidFields.length > 1
        ? ` ${invalidFields.length - 1} more field${invalidFields.length === 2 ? "" : "s"} need attention.`
        : "";
    const validationMessage = firstTarget.validationMessage.replace(/[.!?]+$/, "");
    push({
      id: validationToastId,
      tone: "error",
      content: `${label}: ${validationMessage}.${remaining}`,
    });
  }

  return (
    <ToastContext.Provider value={contextValue}>
      <div
        className="admin-feedback-root"
        onInputCapture={clearResolvedValidation}
        onInvalidCapture={reportInvalidField}
      >
        {children}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}

export function AdminToastOutlet() {
  const context = useContext(ToastContext);
  if (!context) return null;
  return <ToastStack toasts={context.toasts} onDismiss={context.dismiss} />;
}

export function AdminToast({ tone, children }: Readonly<{ tone: ToastTone; children: ReactNode }>) {
  const context = useContext(ToastContext);
  const pushToast = context?.push;
  const id = useId();

  useEffect(() => {
    pushToast?.({ id, tone, content: children });
  }, [children, id, pushToast, tone]);

  return null;
}

function AdminToastItem({
  toast,
  onDismiss,
}: Readonly<{ toast: Toast; onDismiss: (id: string) => void }>) {
  useEffect(() => {
    if (toast.tone !== "success") return;
    const timeout = window.setTimeout(() => onDismiss(toast.id), 6500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.id, toast.tone]);

  return (
    <div
      className={`admin-toast admin-toast--${toast.tone}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      {toast.tone === "success" ? (
        <SuccessAnimation />
      ) : (
        <span aria-hidden="true" className="admin-toast__mark">
          !
        </span>
      )}
      <div className="admin-toast__copy">{toast.content}</div>
      <button
        aria-label="Dismiss notification"
        className="admin-toast__close"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: Readonly<{ toasts: readonly Toast[]; onDismiss: (id: string) => void }>) {
  return (
    <div aria-label="Notifications" className="admin-toast-stack" role="region">
      {toasts.map((toast) => (
        <AdminToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function SuccessAnimation() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  if (prefersReducedMotion) {
    return (
      <span aria-hidden="true" className="admin-toast__mark">
        ✓
      </span>
    );
  }

  return (
    <DotLottieReact
      aria-hidden="true"
      autoplay
      className="admin-toast__animation"
      src="/animations/admin-success.lottie"
    />
  );
}
