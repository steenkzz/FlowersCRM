interface FlowerIconProps {
  className?: string;
}

const PETAL_ANGLES = [-90, -18, 54, 126, 198];

export default function FlowerIcon({ className }: FlowerIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {PETAL_ANGLES.map((angle) => (
        <ellipse
          key={angle}
          cx="12"
          cy="6.4"
          rx="3.3"
          ry="5.6"
          fill="#FF7A59"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="3.1" fill="#F5B841" />
    </svg>
  );
}
