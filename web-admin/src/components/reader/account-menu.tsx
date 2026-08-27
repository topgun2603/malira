"use client";

import Link from "next/link";
import { HeartHandshake, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "./language";
import { hasDeskAccess } from "@/lib/permissions";

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * The account control on the reader site.
 *
 * Until now the only way to sign out lived in the admin topbar, which a member
 * can never reach — so anyone who signed in to use matrimony was stuck signed
 * in. This is that missing control, and it sits in the site header so it is
 * reachable from every reader page rather than only from matrimony.
 *
 * Signing out from here returns to the public site, not to /login: a reader who
 * signs out has not asked to sign in again.
 */
export function AccountMenu() {
  const { firebaseUser, profile, loading, signOut } = useAuth();
  const { lang } = useLanguage();

  // Auth resolves on the client, so the server renders nothing here. Holding
  // the same footprint keeps the header from jumping once it does.
  if (loading) {
    return (
      <div
        aria-hidden
        className="flex h-9 items-center gap-2 px-1.5 sm:px-2"
      >
        <span className="bg-muted size-7 animate-pulse rounded-full" />
        <span className="bg-muted hidden h-3 w-16 animate-pulse rounded sm:inline-block" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">{lang === "ta" ? "உள்நுழை" : "Sign in"}</Link>
      </Button>
    );
  }

  const name = profile?.displayName || firebaseUser.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2">
          <Avatar className="size-7">
            <AvatarImage src={profile?.photoURL ?? undefined} alt="" />
            <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
            {name}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="grid gap-0.5">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {firebaseUser.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/matrimony/browse">
            <HeartHandshake className="size-4" />
            {lang === "ta" ? "திருமணத் தகவல்" : "Matrimony"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/matrimony/me">
            <UserRound className="size-4" />
            {lang === "ta" ? "என் விவரங்கள்" : "My profile"}
          </Link>
        </DropdownMenuItem>

        {/* Only for people who actually have somewhere to go. */}
        {hasDeskAccess(profile?.role) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/dashboard">
                <LayoutDashboard className="size-4" />
                {lang === "ta" ? "ஆசிரியர் பணிமனை" : "Editorial desk"}
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut("/")}>
          <LogOut className="size-4" />
          {lang === "ta" ? "வெளியேறு" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
