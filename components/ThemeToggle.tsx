"use client";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
    </svg>
  );
}

function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    // storage unavailable — theme just won't persist across reloads
  }
}

export default function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={`flex items-center gap-2 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-active hover:text-white ${className ?? ""}`}
    >
      <span className="flex items-center gap-2 dark:hidden">
        <MoonIcon className="h-4.5 w-4.5 shrink-0" />
        Dark mode
      </span>
      <span className="hidden items-center gap-2 dark:flex">
        <SunIcon className="h-4.5 w-4.5 shrink-0" />
        Light mode
      </span>
    </button>
  );
}
