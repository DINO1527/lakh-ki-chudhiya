import Link from "next/link";

type CommerceStep = "bag" | "delivery" | "saved";

const STEPS: { key: CommerceStep; label: string; href?: string }[] = [
  { key: "bag", label: "Your bag", href: "/cart" },
  { key: "delivery", label: "Delivery", href: "/checkout" },
  { key: "saved", label: "Order saved" },
];

export function CommerceSteps({ current }: { current: CommerceStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <nav aria-label="Order steps" className="commerce-steps">
      <ol>
        {STEPS.map((step, index) => {
          const content = (
            <>
              <span aria-hidden="true" className="commerce-steps__number">
                {index < currentIndex ? "✓" : `0${index + 1}`}
              </span>
              <span>{step.label}</span>
            </>
          );

          return (
            <li
              aria-current={index === currentIndex ? "step" : undefined}
              className="commerce-steps__step"
              data-complete={index < currentIndex ? "true" : undefined}
              key={step.key}
            >
              {step.href && index <= currentIndex ? (
                <Link href={step.href}>{content}</Link>
              ) : (
                <span>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
