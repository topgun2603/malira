"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { Moon, Sun } from "lucide-react";
import { RkMark } from "@/components/shared/rk-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language";
import { useAuth } from "@/components/providers/auth-provider";
import { AccountMenu } from "./account-menu";

// Matrimony leads because it is what `/` now opens on; a nav whose first item
// is not the landing page only teaches people that the nav is wrong.
const NAV = [
  { href: "/matrimony", en: "Matrimony", ta: "திருமணம்" },
  { href: "/news", en: "News", ta: "செய்திகள்" },
  { href: "/events", en: "Events", ta: "நிகழ்வுகள்" },
  { href: "/songs", en: "Songs", ta: "பாடல்கள்" },
  { href: "/archive", en: "Archive", ta: "பழையவை" },
] as const;

export function SiteHeader() {
  const { lang, setLang } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const { firebaseUser } = useAuth();

  // A signed-in member wants the profiles; a visitor wants the pitch.
  const hrefFor = (href: string) =>
    href === "/matrimony" && firebaseUser ? "/matrimony/browse" : href;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <RkMark />
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight">
              RK Matrimony
            </span>
            <span className="text-muted-foreground block text-xs">
              {lang === "ta" ? "மலைகளில் வேரூன்றிய அன்பு" : "Love, Rooted in the Hills"}
            </span>
          </span>
        </Link>

        <nav className="scrollbar-none ml-6 hidden items-center gap-1 overflow-x-auto md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={hrefFor(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                lang === "ta" && "font-tamil",
                isActive(item.href)
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {lang === "ta" ? item.ta : item.en}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Two languages only — a dropdown for two options is a wasted click. */}
          <div className="bg-muted flex items-center rounded-full p-0.5" role="group">
            {(["en", "ta"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  code === "ta" && "font-tamil",
                  lang === code
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {code === "en" ? "English" : "தமிழ்"}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>

          <AccountMenu />
        </div>
      </div>

      <nav className="scrollbar-none flex gap-1 overflow-x-auto border-t px-4 py-1.5 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={hrefFor(item.href)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-sm whitespace-nowrap transition-colors",
              lang === "ta" && "font-tamil",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            {lang === "ta" ? item.ta : item.en}
          </Link>
        ))}
      </nav>
    </header>
  );
}
