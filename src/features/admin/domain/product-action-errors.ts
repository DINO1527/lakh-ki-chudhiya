export type ProductPublicationError =
  | "publish_requirements"
  | "database_update"
  | "permission"
  | "missing_record"
  | "status";

export type ProductMediaPublicationError =
  | "database_update"
  | "permission"
  | "missing_record"
  | "media_publish"
  | "media_unpublish"
  | "last_image";

export function productPublicationErrorType(code: string): ProductPublicationError {
  if (code === "22023") return "publish_requirements";
  if (code === "PGRST202" || code === "42883") return "database_update";
  if (code === "42501") return "permission";
  if (code === "P0002") return "missing_record";
  return "status";
}

export function productMediaPublicationErrorType(
  code: string,
  action: "publish" | "unpublish",
): ProductMediaPublicationError {
  if (code === "23514" && action === "unpublish") return "last_image";
  if (code === "PGRST202" || code === "42883") return "database_update";
  if (code === "42501") return "permission";
  if (code === "P0002") return "missing_record";
  return action === "publish" ? "media_publish" : "media_unpublish";
}
