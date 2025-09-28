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
          avatar: user.imageUrl || "/avatars/default.jpg",
        }
      : {
          name: "Guest User",
          email: "guest@gloria.gov",
          avatar: "/avatars/default.jpg",
        },

    teams: [
      {
        name: "Gloria System",
        logo: Building2,
        plan: "Government",
      },
      {
        name: "Department",
        logo: Shield,
        plan: "Regional",
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
          {
            title: "Teams",
            url: "/users/teams",
            isActive: pathname === "/users/teams",
          },
          {
            title: "Roles",
            url: "/users/roles",
            isActive: pathname === "/users/roles",
          },
          {
            title: "Activity",
            url: "/users/activity",
            isActive: pathname === "/users/activity",
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
            title: "Divisions",
            url: "/organizations/divisions",
            isActive: pathname === "/organizations/divisions",
          },
          {
            title: "Structure",
            url: "/organizations/structure",
            isActive: pathname === "/organizations/structure",
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
    ],

    projects: [
      {
        name: "Government Portal",
        url: "/projects/portal",
        icon: FolderOpen,
      },
      {
        name: "Annual Reports",
        url: "/projects/reports",
        icon: BarChart3,
      },
      {
        name: "Public Services",
        url: "/projects/services",
        icon: UserCircle,
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
        <NavProjects projects={navData.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
