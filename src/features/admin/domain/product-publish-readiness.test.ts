import { describe, expect, it } from "vitest";
import {
  getProductPublishBlockers,
  type ProductPublishReadinessInput,
} from "./product-publish-readiness";

const readyProduct: ProductPublishReadinessInput = {
  title: "Ruby bangles",
  careInstructions: "Keep dry and store in the box.",
  setCount: 2,
  deliveryFeeMinor: 0,
  variants: [{ is_active: true }],
  media: [{ media_type: "image", status: "draft" }],
};

describe("product publication checklist", () => {
  it("allows zero delivery fee when the other publication requirements are present", () => {
    expect(getProductPublishBlockers(readyProduct)).toEqual([]);
  });

  it("lists every unmet requirement before the publish action can be submitted", () => {
    expect(
      getProductPublishBlockers({
        ...readyProduct,
        title: "  ",
        careInstructions: "",
        deliveryFeeMinor: null,
        setCount: 1,
        variants: [{ is_active: false }],
        media: [{ media_type: "image", status: "archived" }],
      }),
    ).toEqual([
      "Enter a product name.",
      "Add care instructions.",
      "Enter a delivery fee. Use 0 only when delivery is free.",
      "Include at least 2 bangles in each set.",
      "Add at least one active size.",
      "Upload at least one product image.",
    ]);
  });

  it("requires at least one image that is draft or published", () => {
    expect(getProductPublishBlockers({ ...readyProduct, media: [] })).toContain(
      "Upload at least one product image.",
    );
  });
});
