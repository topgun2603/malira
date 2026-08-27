"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mountain } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { useArticles } from "@/hooks/use-articles";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/types";
import { NAV_SECTIONS } from "./nav-config";

export function AppSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = profile?.role;

  // Drives the count beside "Approvals" so an editor sees the queue without
  // having to go looking for it.
  const { data: pending } = useArticles(
    { status: "in_review" },
    { enabled: can(role, "news.review") },
  );
  const pendingCount = pending?.length ?? 0;

  const isActive = (href: string) =>
    href === "/admin/news"
      ? pathname === "/admin/news" || /^\/news\/(?!approvals)/.test(pathname)
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Collapsed, the inner px-2 would stack on SidebarHeader's own p-2 and
            push the mark 8px right of every icon below it — hard against the
            rail edge. Dropping it and centring puts the mark on the same
            vertical line as the nav. */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Mountain className="size-4" />
          </div>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Nilgiri News</span>
            <span className="text-sidebar-foreground/60 truncate text-xs">
              Editorial desk
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => can(role, item.permission));
          if (visible.length === 0) return null;

          return (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.href === "/admin/news/approvals" && pendingCount > 0 && (
                        <SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <div className="text-sidebar-foreground/60 px-2 py-1 text-xs group-data-[collapsible=icon]:hidden">
          {profile ? ROLE_LABELS[profile.role] : "Signing in..."}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
