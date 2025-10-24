"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { UserResource } from "@clerk/types";
import {
  FileText,
  Home,
  Users,
  Calendar,
  ClipboardList,
  Settings,
  Building2,
  Bell,
  Shield,
  Lock,
  FolderOpen,
  BarChart3,
  UserCircle,
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: UserResource | null;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  // Helper function to check if a path is active
  const isPathActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Gloria System Navigation Structure - Updated to match old layout
  const navData = {
    user: user
      ? {
          name: user.fullName || user.username || "User",
          email: user.primaryEmailAddress?.emailAddress || "",
          avatar: user.imageUrl || "",
        }
      : {
          name: "Guest User",
          email: "guest@gloria.gov",
          avatar: "",
        },

    teams: [
      {
        name: "YPK Gloria",
        logo: Building2,
        plan: "Foundation",
      },
    ],

    navMain: [
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
            title: "All Permissions",
            url: "/permissions",
            isActive: pathname === "/permissions",
          },
          {
            title: "Roles",
            url: "/permissions/roles",
            isActive: pathname === "/permissions/roles",
          },
          {
            title: "Module Access",
            url: "/permissions/module-access",
            isActive: pathname === "/permissions/module-access",
          },
          {
            title: "Permission Delegation",
            url: "/permissions/permission-delegation",
            isActive: pathname === "/permissions/permission-delegation",
          },
          {
            title: "Permission Templates",
            url: "/permissions/permission-templates",
            isActive: pathname === "/permissions/permission-templates",
          },
          {
            title: "Resource Permissions",
            url: "/permissions/resource-permissions",
            isActive: pathname === "/permissions/resource-permissions",
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
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={navData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
