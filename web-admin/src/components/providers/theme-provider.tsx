"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * A small theme provider, replacing next-themes.
 *
 * next-themes ships its whole bundle as "use client", so the anti-flash
 * <script> it renders lives inside the client tree — and React 19 warns that a
 * script rendered on the client never executes. The script only ever needs to
 * run once, in the server-rendered HTML, so it belongs in the root layout
 * (see THEME_SCRIPT below) rather than in a component.
 *
 * The API kept here is the part the app actually used: resolvedTheme + setTheme.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "nilgiri-news:theme";
const DEFAULT_THEME: Theme = "light";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs before first paint so the page never flashes the wrong theme. Kept as a
 * string because the root layout is a server component, which is the one place
 * a <script> tag is unambiguously correct.
 */
export const THEME_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var t=localStorage.getItem(k)||${JSON.stringify(
  DEFAULT_THEME,
)};var d=t==="dark"||(t==="system"&&window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(_){}})();`;

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function subscribeToSystem(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" || value === "system"
      ? value
      : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Suppresses transitions for one frame so a theme switch does not smear. */
function withoutTransitions(apply: () => void) {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;animation:none!important}",
    ),
  );
  document.head.appendChild(style);
  apply();
  // Reading layout forces the muting style to take effect before it is removed.
  document.body.getBoundingClientRect();
  document.head.removeChild(style);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const systemIsDark = useSyncExternalStore(
    subscribeToSystem,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemIsDark ? "dark" : "light") : theme;

  // The DOM is an external system, so syncing it from an effect is exactly what
  // effects are for. The inline script has already done this for first paint.
  useEffect(() => {
    const root = document.documentElement;
    withoutTransitions(() => {
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.style.colorScheme = resolvedTheme;
    });
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing can block storage; the theme still applies this session.
    }
  }, []);

  const value = useMemo<ThemeState>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
