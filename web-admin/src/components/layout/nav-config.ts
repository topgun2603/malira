import {
  BarChart3,
  CalendarDays,
  ChartPie,
  FileText,
  GalleryHorizontal,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  ListMusic,
  Megaphone,
  Send,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** The desk, grouped by the job being done rather than by build order. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Newsroom",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        permission: "news.view",
      },
      { title: "News", href: "/admin/news", icon: FileText, permission: "news.view" },
      {
        title: "Approvals",
        href: "/admin/news/approvals",
        icon: Inbox,
        permission: "news.review",
      },
      {
        title: "Categories",
        href: "/admin/categories",
        icon: Tags,
        permission: "categories.manage",
      },
    ],
  },
  {
    label: "Sections",
    items: [
      {
        title: "Events",
        href: "/admin/events",
        icon: CalendarDays,
        permission: "events.manage",
      },
      {
        title: "Songs",
        href: "/admin/playlists",
        icon: ListMusic,
        permission: "playlists.manage",
      },
      {
        title: "Matrimony",
        href: "/admin/matrimony",
        icon: HeartHandshake,
        permission: "matrimony.moderate",
      },
    ],
  },
  {
    label: "Audience",
    items: [
      {
        title: "Carousels",
        href: "/admin/carousels",
        icon: GalleryHorizontal,
        permission: "carousels.manage",
      },
      { title: "Polls", href: "/admin/polls", icon: ChartPie, permission: "polls.manage" },
      {
        title: "Advertising",
        href: "/admin/ads",
        icon: Megaphone,
        permission: "ads.manage",
      },
      {
        title: "Notifications",
        href: "/admin/notifications",
        icon: Send,
        permission: "notifications.send",
      },
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        permission: "analytics.view",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Users & roles",
        href: "/admin/users",
        icon: Users,
        permission: "users.manage",
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "settings.manage",
      },
    ],
  },
];
