"use client";

import { ConfirmButton } from "./confirm-button";

type AdminStatusSwitchProps = Readonly<{
  action: (formData: FormData) => void | Promise<void>;
  checked: boolean;
  fields: Readonly<Record<string, string>>;
  label: string;
  message: string;
  offLabel?: string;
  onLabel?: string;
  disabled?: boolean;
  disabledHint?: string;
  submitLabel: string;
}>;

export function AdminStatusSwitch({
  action,
  checked,
  disabled = false,
  disabledHint,
  fields,
  label,
  message,
  offLabel = "Off",
  onLabel = "On",
  submitLabel,
}: AdminStatusSwitchProps) {
  return (
    <div className="admin-status-switch-control">
      <span className="admin-status-switch-control__state">{checked ? onLabel : offLabel}</span>
      <form action={action}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} name={name} type="hidden" value={value} />
        ))}
        <ConfirmButton
          className={`admin-status-switch${checked ? " admin-status-switch--active" : ""}`}
          formAction={action}
          message={message}
          submitClassName="admin-button admin-button--primary"
          submitLabel={submitLabel}
          triggerAriaChecked={checked}
          triggerAriaLabel={label}
          triggerDisabled={disabled}
          triggerRole="switch"
          triggerTitle={label}
        >
          <span aria-hidden="true" className="admin-status-switch__track">
            <span className="admin-status-switch__thumb" />
          </span>
        </ConfirmButton>
      </form>
      {disabled && disabledHint ? (
        <span className="admin-status-switch-control__hint">{disabledHint}</span>
      ) : null}
    </div>
  );
}
