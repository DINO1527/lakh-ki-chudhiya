import { describe, expect, it } from "vitest";
import { getAdminNavigationGroups, isAdminNavigationItemActive } from "./admin-navigation-state";

describe("admin navigation state", () => {
  it("marks nested product screens as part of the product section", () => {
    expect(isAdminNavigationItemActive("/admin/products/variant-id", "/admin/products")).toBe(true);
  });

  it("does not mark the overview active for other admin routes", () => {
    expect(isAdminNavigationItemActive("/admin/products", "/admin")).toBe(false);
  });

  it("keeps owner-only destinations out of staff navigation", () => {
    const labels = getAdminNavigationGroups(false).flatMap((group) =>
      group.items.map((item) => item.label),
    );

    expect(labels).not.toContain("Checkout settings");
    expect(labels).not.toContain("Team access");
    expect(labels).not.toContain("Activity");
  });

  it("keeps stock and inventory with the catalogue instead of order operations", () => {
    const groups = getAdminNavigationGroups(false);
    const catalogue = groups.find((group) => group.label === "Catalogue");
    const orders = groups.find((group) => group.label === "Orders");

    expect(catalogue?.items.map((item) => item.label)).toContain("Stock & inventory");
    expect(orders?.items.map((item) => item.label)).not.toContain("Stock & inventory");
  });
});
