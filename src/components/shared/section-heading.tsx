import Link from "next/link";

type SectionHeadingProps = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  layout?: "center" | "split";
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  layout = "center",
}: SectionHeadingProps) {
  return (
    <div className={`home-section-heading home-section-heading--${layout}`}>
      <div className="home-section-heading__copy">
        {eyebrow && <p className="home-section-heading__eyebrow">{eyebrow}</p>}
        <h2 className="home-section-heading__title" id={id}>
          {title}
        </h2>
        {description && <p className="home-section-heading__description">{description}</p>}
      </div>
      {actionHref && actionLabel && (
        <Link className="home-section-heading__action" href={actionHref}>
          {actionLabel} <span aria-hidden="true">↗</span>
        </Link>
      )}
    </div>
  );
}
