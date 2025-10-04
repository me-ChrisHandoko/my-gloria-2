"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  Home,
  Users,
  ClipboardList,
  Settings,
  Building2,
  Bell,
  Lock,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Static data that doesn't depend on pathname
const staticData = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const isPathActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: isPathActive("/dashboard"),
      items: [],
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      isActive: isPathActive("/users"),
      items: [
        {
          title: "All Users",
          url: "/users",
          isActive: pathname === "/users",
        },
      ],
    },
    {
      title: "Organizations",
      url: "/organizations",
      icon: Building2,
      isActive: isPathActive("/organizations"),
      items: [
        {
          title: "All Organizations",
          url: "/organizations",
          isActive: pathname === "/organizations",
        },
        {
          title: "Departments",
          url: "/organizations/departments",
          isActive: pathname === "/organizations/departments",
        },
        {
          title: "Positions",
          url: "/organizations/positions",
          isActive: pathname === "/organizations/positions",
        },
        {
          title: "Schools",
          url: "/organizations/schools",
          isActive: pathname === "/organizations/schools",
        },
      ],
    },
    {
      title: "Workflows",
      url: "/workflows",
      icon: ClipboardList,
      isActive: isPathActive("/workflows"),
      items: [
        {
          title: "Active Workflows",
          url: "/workflows",
          isActive: pathname === "/workflows",
        },
        {
          title: "Templates",
          url: "/workflows/templates",
          isActive: pathname === "/workflows/templates",
        },
        {
          title: "History",
          url: "/workflows/history",
          isActive: pathname === "/workflows/history",
        },
        {
          title: "Approvals",
          url: "/workflows/approvals",
          isActive: pathname === "/workflows/approvals",
        },
      ],
    },
    {
      title: "Permissions",
      url: "/permissions",
      icon: Lock,
      isActive: isPathActive("/permissions"),
      items: [
        {
          title: "Access Control",
          url: "/permissions",
          isActive: pathname === "/permissions",
        },
        {
          title: "Policies",
          url: "/permissions/policies",
          isActive: pathname === "/permissions/policies",
        },
        {
          title: "Security",
          url: "/permissions/security",
          isActive: pathname === "/permissions/security",
        },
        {
          title: "Audit Log",
          url: "/permissions/audit",
          isActive: pathname === "/permissions/audit",
        },
      ],
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      isActive: isPathActive("/notifications"),
      items: [
        {
          title: "All Notifications",
          url: "/notifications",
          isActive: pathname === "/notifications",
        },
        {
          title: "Announcements",
          url: "/notifications/announcements",
          isActive: pathname === "/notifications/announcements",
        },
        {
          title: "Settings",
          url: "/notifications/settings",
          isActive: pathname === "/notifications/settings",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: isPathActive("/settings"),
      items: [
        {
          title: "General",
          url: "/settings",
          isActive: pathname === "/settings",
        },
        {
          title: "Profile",
          url: "/settings/profile",
          isActive: pathname === "/settings/profile",
        },
        {
          title: "Security",
          url: "/settings/security",
          isActive: pathname === "/settings/security",
        },
        {
          title: "Integrations",
          url: "/settings/integrations",
          isActive: pathname === "/settings/integrations",
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={staticData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={staticData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
