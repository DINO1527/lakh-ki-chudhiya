export type ProductPublishReadinessInput = Readonly<{
  title: string | null;
  careInstructions: string | null;
  setCount: number;
  deliveryFeeMinor: number | null;
  variants: readonly Readonly<{ is_active: boolean }>[];
  media: readonly Readonly<{ media_type: string; status: string }>[];
}>;

export function getProductPublishBlockers(input: ProductPublishReadinessInput): string[] {
  const blockers: string[] = [];

  if (!input.title?.trim()) blockers.push("Enter a product name.");
  if (!input.careInstructions?.trim()) blockers.push("Add care instructions.");
  if (input.deliveryFeeMinor === null) {
    blockers.push("Enter a delivery fee. Use 0 only when delivery is free.");
  }
  if (input.setCount < 2) blockers.push("Include at least 2 bangles in each set.");
  if (!input.variants.some((variant) => variant.is_active)) {
    blockers.push("Add at least one active size.");
  }
  if (
    !input.media.some(
      (image) =>
        image.media_type === "image" && (image.status === "draft" || image.status === "published"),
    )
  ) {
    blockers.push("Upload at least one product image.");
  }

  return blockers;
}
