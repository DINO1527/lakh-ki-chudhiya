import { describe, expect, it } from "vitest";
import {
  productMediaPublicationErrorType,
  productPublicationErrorType,
} from "./product-action-errors";

describe("product publication error messages", () => {
  it("identifies missing database workflow functions", () => {
    expect(productPublicationErrorType("PGRST202")).toBe("database_update");
    expect(productPublicationErrorType("42883")).toBe("database_update");
    expect(productMediaPublicationErrorType("PGRST202", "unpublish")).toBe("database_update");
  });

  it("keeps business and authorization errors actionable", () => {
    expect(productPublicationErrorType("22023")).toBe("publish_requirements");
    expect(productPublicationErrorType("42501")).toBe("permission");
    expect(productPublicationErrorType("P0002")).toBe("missing_record");
    expect(productMediaPublicationErrorType("23514", "unpublish")).toBe("last_image");
  });

  it("uses direction-specific fallbacks for unexpected image errors", () => {
    expect(productMediaPublicationErrorType("XX000", "publish")).toBe("media_publish");
    expect(productMediaPublicationErrorType("XX000", "unpublish")).toBe("media_unpublish");
  });
});
