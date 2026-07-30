interface IconProps {
  className?: string;
}

const base = {
  xmlns: "http://www.w3.org/2000/svg" as const,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
      <path d="M15.5 5.5a3.25 3.25 0 0 1 0 6.4" />
      <path d="M17.75 14.25A6.25 6.25 0 0 1 21.5 20" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 4h2l2.2 11.1a1.5 1.5 0 0 0 1.48 1.2h7.4a1.5 1.5 0 0 0 1.47-1.19L20 8H6" />
      <circle cx="9.5" cy="20" r="1.25" />
      <circle cx="17" cy="20" r="1.25" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M11 3.5 12.4 8l4.5 1.4-4.5 1.4L11 15.3 9.6 10.8 5.1 9.4l4.5-1.4Z" />
      <path d="M18.5 14.5 19.2 17l2.3.7-2.3.7-.7 2.6-.7-2.6-2.3-.7 2.3-.7Z" />
    </svg>
  );
}

export function FunnelIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3.5 4.5h17L14 12.8V19l-4 1.5v-7.7z" />
    </svg>
  );
}

export function InboxIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3.5 12h4.4l1.4 2.6h5.4l1.4-2.6h4.4" />
      <path d="M5.4 6.2 3.5 12v5a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-5l-1.9-5.8a1.5 1.5 0 0 0-1.43-1.2H6.83a1.5 1.5 0 0 0-1.43 1.2Z" />
    </svg>
  );
}

export function LibraryIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4.5 4.75h7v15.5h-7z" />
      <path d="M12.5 4.75h7v15.5h-7z" />
      <path d="M4.5 9h7M4.5 15h7" />
    </svg>
  );
}

export function ArrowLoopIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66" />
      <path d="M17.5 3.5v3.5H14M6.5 20.5V17H10" />
    </svg>
  );
}
