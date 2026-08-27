"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/primitives";
import { useLanguage } from "@/components/reader/language";
import { useAppSettings } from "@/hooks/use-phase2";
import { cn } from "@/lib/utils";

/**
 * Renders whatever the desk wrote in Settings. Nothing is hardcoded here, so a
 * change to the About text or the contact details ships without a deploy.
 */
export default function AboutPage() {
  const { lang, pick, langAttr } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const body = pick(settings?.aboutBody ?? "", settings?.aboutBodyTa ?? "");
  const bodyLang = langAttr(settings?.aboutBody ?? "", settings?.aboutBodyTa ?? "");

  const contact = [
    settings?.contactEmail && {
      icon: Mail,
      label: settings.contactEmail,
      href: `mailto:${settings.contactEmail}`,
    },
    settings?.contactPhone && {
      icon: Phone,
      label: settings.contactPhone,
      href: `tel:${settings.contactPhone}`,
    },
    settings?.contactAddress && {
      icon: MapPin,
      label: settings.contactAddress,
      href: null,
    },
  ].filter(Boolean) as Array<{
    icon: typeof Mail;
    label: string;
    href: string | null;
  }>;

  return (
    <FadeIn className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {settings?.aboutTitle || (lang === "ta" ? "எங்களைப் பற்றி" : "About")}
      </h1>

      {body ? (
        <p
          lang={bodyLang}
          className={cn(
            "mt-4 text-[15px] leading-7 whitespace-pre-line",
            bodyLang === "ta" && "font-tamil",
          )}
        >
          {body}
        </p>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          {lang === "ta"
            ? "இந்தப் பக்கம் இன்னும் எழுதப்படவில்லை."
            : "This page has not been written yet."}
        </p>
      )}

      {contact.length > 0 && (
        <>
          <Separator className="my-8" />
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            {lang === "ta" ? "தொடர்பு" : "Contact"}
          </h2>
          <ul className="space-y-3">
            {contact.map((item) => (
              <li key={item.label} className="flex items-start gap-3 text-sm">
                <item.icon className="text-primary mt-0.5 size-4 shrink-0" />
                {item.href ? (
                  <a href={item.href} className="hover:underline">
                    {item.label}
                  </a>
                ) : (
                  <span className="whitespace-pre-line">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </FadeIn>
  );
}
