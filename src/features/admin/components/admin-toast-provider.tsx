"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  return <AdminToastProviderState key={pathname}>{children}</AdminToastProviderState>;
}

function AdminToastProviderState({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const validationIdPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const validationIdSequence = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Toast) => {
    setToasts((current) => {
      const existing = current.find((item) => item.id === toast.id);
      const sameToastContent =
        existing &&
        existing.tone === toast.tone &&
        (typeof existing.content !== "string" ||
          typeof toast.content !== "string" ||
          existing.content === toast.content);
      if (sameToastContent) return current;
      return [...current.filter((item) => item.id !== toast.id), toast].slice(-4);
    });
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
    const firstInvalid = target.form?.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(":invalid");
    if (!firstInvalid || firstInvalid === target) target.focus();
    showInlineValidation(target, validationIdPrefix, validationIdSequence);
  }

  function validateTrimmedFields(event: FormEvent<HTMLDivElement>) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const whitespaceOnlyFields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "[data-require-trimmed='true']",
      ),
    ).filter((field) => field.value.trim() === "");
    if (!whitespaceOnlyFields.length) return;

    event.preventDefault();
    for (const field of whitespaceOnlyFields) {
      field.setCustomValidity("Enter a value that is not only spaces.");
      field.setAttribute("aria-invalid", "true");
      showInlineValidation(field, validationIdPrefix, validationIdSequence);
    }
    whitespaceOnlyFields[0]?.focus();
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
    if (target.dataset.requireTrimmed === "true") {
      target.setCustomValidity(
        target.value.trim() === "" ? "Enter a value that is not only spaces." : "",
      );
    }
    if (target.validity.valid) {
      target.removeAttribute("aria-invalid");
      removeInlineValidation(target);
    } else if (target.dataset.adminValidationMessageId) {
      showInlineValidation(target, validationIdPrefix, validationIdSequence);
    }
  }

  return (
    <ToastContext.Provider value={contextValue}>
      <div
        className="admin-feedback-root"
        onInputCapture={clearResolvedValidation}
        onChangeCapture={clearResolvedValidation}
        onInvalidCapture={reportInvalidField}
        onSubmitCapture={validateTrimmedFields}
      >
        {children}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}

function showInlineValidation(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  idPrefix: string,
  idSequence: { current: number },
) {
  const field = target.closest<HTMLElement>(".admin-field, .admin-checkbox");
  if (!field) return;

  let errorId = target.dataset.adminValidationMessageId;
  if (!errorId) {
    idSequence.current += 1;
    errorId = `${idPrefix}-validation-${idSequence.current}`;
    target.dataset.adminValidationMessageId = errorId;
    const describedBy = new Set(target.getAttribute("aria-describedby")?.split(/\s+/) ?? []);
    describedBy.add(errorId);
    target.setAttribute("aria-describedby", [...describedBy].join(" "));
  }

  let error = document.getElementById(errorId);
  if (!error) {
    error = document.createElement("span");
    error.id = errorId;
    error.className = "admin-field__validation";
    error.setAttribute("role", "alert");
    field.insertAdjacentElement("afterend", error);
  }

  const label = target.labels?.[0]?.querySelector("span");
  const helperText = label?.querySelector("small")?.textContent ?? "";
  const fieldName =
    (label?.textContent ?? "").replace(helperText, "").trim() || target.name || "This field";
  const message = target.validationMessage.replace(/[.!?]+$/, "");
  error.textContent = `${fieldName}: ${message}.`;
}

function removeInlineValidation(
  target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const errorId = target.dataset.adminValidationMessageId;
  if (!errorId) return;

  document.getElementById(errorId)?.remove();
  delete target.dataset.adminValidationMessageId;
  const describedBy = target
    .getAttribute("aria-describedby")
    ?.split(/\s+/)
    .filter((id) => id && id !== errorId);
  if (describedBy?.length) target.setAttribute("aria-describedby", describedBy.join(" "));
  else target.removeAttribute("aria-describedby");
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
    const timeout = window.setTimeout(
      () => onDismiss(toast.id),
      toast.tone === "success" ? 6500 : 12000,
    );
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
