import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-border bg-secondary px-1 transition hover:border-primary/50"
    >
      <span
        className="gradient-sunset flex size-7 items-center justify-center rounded-full shadow-lift transition-transform duration-300"
        style={{ transform: isDark ? "translateX(1.75rem)" : "translateX(0)" }}
      >
        {isDark ? (
          <Moon className="size-4 text-primary-foreground" />
        ) : (
          <Sun className="size-4 text-primary-foreground" />
        )}
      </span>
      <Sun className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground opacity-0 transition-opacity duration-300 data-[on=true]:opacity-100" data-on={isDark} />
      <Moon className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground opacity-0 transition-opacity duration-300 data-[on=true]:opacity-100" data-on={!isDark} />
    </button>
  );
}
