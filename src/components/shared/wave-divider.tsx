import styles from "./wave-divider.module.css";

type WaveDividerProps = {
  placement: "hero" | "footer";
};

const wavePath =
  "M0 82 C180 82 180 34 360 34 C540 34 540 82 720 82 C900 82 900 132 1080 132 C1260 132 1260 82 1440 82 V180 H0Z";
const waveLinePath =
  "M0 86 C150 96 210 46 360 48 C520 50 548 98 720 90 C900 82 920 42 1080 54 C1240 66 1280 104 1440 90";
const secondaryWaveLinePath =
  "M0 108 C150 116 220 72 360 74 C510 76 560 120 720 112 C880 104 940 70 1080 78 C1230 86 1290 120 1440 112";

export function WaveDivider({ placement }: WaveDividerProps) {
  return (
    <div aria-hidden="true" className={`${styles.wave} ${styles[placement]}`}>
      <svg
        className={styles.svg}
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 1440 180"
      >
        <path className={styles.shadow} d={wavePath} />
        <path className={styles.base} d={wavePath} />
        <path className={styles.secondaryLine} d={secondaryWaveLinePath} />
        <path className={styles.line} d={waveLinePath} />
      </svg>
    </div>
  );
}
