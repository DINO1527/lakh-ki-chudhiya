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
      <svg aria-hidden="true" className="bangle-loader__rings" viewBox="0 0 140 110">
        <ellipse
          className="bangle-loader__ring bangle-loader__ring--back"
          cx="70"
          cy="23"
          rx="56"
          ry="15"
        />
        <ellipse
          className="bangle-loader__ring bangle-loader__ring--middle"
          cx="70"
          cy="53"
          rx="56"
          ry="15"
        />
        <ellipse
          className="bangle-loader__ring bangle-loader__ring--front"
          cx="70"
          cy="83"
          rx="56"
          ry="15"
        />
        <ellipse
          className="bangle-loader__shine bangle-loader__shine--back"
          cx="70"
          cy="23"
          rx="56"
          ry="15"
        />
        <ellipse
          className="bangle-loader__shine bangle-loader__shine--middle"
          cx="70"
          cy="53"
          rx="56"
          ry="15"
        />
        <ellipse
          className="bangle-loader__shine bangle-loader__shine--front"
          cx="70"
          cy="83"
          rx="56"
          ry="15"
        />
      </svg>
      <span className="bangle-loader__label">{label}</span>
    </div>
  );
}
