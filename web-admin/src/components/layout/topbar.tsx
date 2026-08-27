"use client";

import Link from "next/link";
import { useTheme } from "@/components/providers/theme-provider";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { useQueuedNotificationCount } from "@/hooks/use-phase2";
import { ROLE_LABELS } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const { profile, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  // Composed but not yet pushed. The count is the reason the bell is here: a
  // message somebody wrote and forgot to send looks identical to one that went
  // out unless something says otherwise on every screen.
  const queued = useQueuedNotificationCount();

  return (
    <header className="bg-background/85 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="ml-auto flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label={
            queued > 0
              ? `Notifications, ${queued} waiting to send`
              : "Notifications"
          }
        >
          <Link href="/admin/notifications" className="relative">
            <Bell className="size-4" />
            {queued > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-medium tabular-nums">
                {queued > 9 ? "9+" : queued}
              </span>
            )}
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="size-7">
                <AvatarImage src={profile?.photoURL ?? undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {initials(profile?.displayName ?? "?")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {profile?.displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{profile?.displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {profile?.email}
                </span>
                <span className="text-muted-foreground mt-1 text-xs">
                  {profile ? ROLE_LABELS[profile.role] : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
