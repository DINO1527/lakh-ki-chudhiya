type BangleLoaderProps = {
  label?: string;
  compact?: boolean;
};

export function BangleLoader({
  label = "Preparing the Lacora experience",
  compact = false,
}: BangleLoaderProps) {
  return (
    <div
      aria-label={label}
      className={`bangle-loader${compact ? " bangle-loader--compact" : ""}`}
      role="status"
    >
      <svg aria-hidden="true" className="bangle-loader__rings" viewBox="0 0 100 64">
        <ellipse
          className="bangle-loader__ring bangle-loader__ring--back"
          cx="50"
          cy="30"
          rx="34"
          ry="12"
        />
        <ellipse
          className="bangle-loader__ring bangle-loader__ring--middle"
          cx="50"
          cy="33"
          rx="34"
          ry="12"
        />
        <ellipse
          className="bangle-loader__ring bangle-loader__ring--front"
          cx="50"
          cy="36"
          rx="34"
          ry="12"
        />
      </svg>
      <span aria-hidden="true" className="bangle-loader__label">
        {label}
      </span>
    </div>
  );
}
