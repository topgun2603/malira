"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Mountain } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/components/reader/language";
import { SiteHeader } from "@/components/reader/site-header";
import { PopupAd } from "@/components/reader/ad-slot";

function SiteFooter() {
  const { lang } = useLanguage();

  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-2">
            <span className="flex items-center gap-2 font-semibold">
              <Mountain className="text-primary size-4" />
              Nilgiri News
            </span>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {lang === "ta"
                ? "நீலகிரி மாவட்டத்தின் செய்திகள், நிகழ்வுகள் மற்றும் சமூக அறிவிப்புகள்."
                : "News, events and community announcements from across the Nilgiris."}
            </p>
          </div>

          <nav className="text-sm">
            <p className="mb-2 font-medium">
              {lang === "ta" ? "தகவல்" : "About"}
            </p>
            <ul className="text-muted-foreground space-y-1.5">
              <li>
                <Link href="/about" className="hover:text-foreground">
                  {lang === "ta" ? "எங்களைப் பற்றி" : "About us"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground">
                  {lang === "ta" ? "தொடர்பு" : "Contact"}
                </Link>
              </li>
              <li>
                <Link href="/archive" className="hover:text-foreground">
                  {lang === "ta" ? "பழைய செய்திகள்" : "Archive"}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="text-muted-foreground mt-8 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; Nilgiri News
          </p>
          <Link href="/admin/dashboard" className="hover:text-foreground underline">
            Editorial desk
          </Link>
        </div>
      </div>
    </footer>
  );
}

type Section = "news" | "songs" | "matrimony";

/**
 * Which accent the current route wears.
 *
 * News, events and the archive share one identity because they are the same
 * editorial product seen three ways; songs and matrimony are distinct
 * destinations and get their own.
 */
function sectionFor(pathname: string): Section {
  if (pathname.startsWith("/matrimony")) return "matrimony";
  if (pathname.startsWith("/songs")) return "songs";
  return "news";
}

export default function ReaderLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <LanguageProvider>
      <div
        data-section={sectionFor(pathname)}
        className="flex min-h-screen flex-col"
      >
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/* One popup for the whole reader shell, not one per page. */}
        <PopupAd />
      </div>
    </LanguageProvider>
  );
}
