import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Tamil } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { THEME_SCRIPT, ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Tamil is a first-class language in this product, not a fallback. Loading the
 * face here means Tamil headlines in the editor look the way they will in the
 * app, which is the only way an editor can judge a headline's length.
 */
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Nilgiri News Admin",
    template: "%s · Nilgiri News Admin",
  },
  description: "Editorial desk for the Nilgiri News app.",
};

export const viewport: Viewport = {
  // Tints the browser chrome on Android. Matches the icon, not the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#145892" },
    { media: "(prefers-color-scheme: dark)", color: "#0f2438" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoTamil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Applies the stored theme before first paint. This lives in the
            server-rendered layout on purpose: a <script> inside a client
            component is never executed by React on a client render. */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
          suppressHydrationWarning
        />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <Toaster position="top-right" richColors closeButton />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
