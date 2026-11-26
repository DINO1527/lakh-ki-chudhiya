import "server-only";

const SAFE_DATABASE_CODE = /^[A-Z0-9]{3,10}$/i;

function safeCode(databaseCode: string | null | undefined): string {
  return databaseCode && SAFE_DATABASE_CODE.test(databaseCode) ? databaseCode : "unknown";
}

function writeAdminFailure(
  event: "admin_action_failed" | "admin_query_failed",
  operation: string,
  resource: string,
  databaseCode: string | null | undefined,
): void {
  // Server logs retain only a safe operation, resource and database code.
  const payload = JSON.stringify({
    event,
    operation,
    resource,
    code: safeCode(databaseCode),
  });
  if (["PGRST202", "PGRST204", "PGRST205"].includes(databaseCode ?? "")) {
    // eslint-disable-next-line no-console
    console.warn(payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.error(payload);
}

export function logAdminActionFailure(
  action: string,
  resource: string,
  databaseCode: string | null | undefined,
): void {
  writeAdminFailure("admin_action_failed", action, resource, databaseCode);
}

export function logAdminQueryFailure(
  query: string,
  resource: string,
  databaseCode: string | null | undefined,
): void {
  writeAdminFailure("admin_query_failed", query, resource, databaseCode);
}
