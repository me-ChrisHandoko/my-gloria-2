"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import type { UserResource } from "@clerk/types"
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
  LockClosed,
  FolderOpen,
  BarChart3,
  UserCircle,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: UserResource | null;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  // Helper function to check if a path is active
  const isPathActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Gloria System Navigation Structure - Updated to match old layout
  const navData = {
    user: user ? {
      name: user.fullName || user.username || "User",
      email: user.primaryEmailAddress?.emailAddress || "",
      avatar: user.imageUrl || "/avatars/default.jpg",
    } : {
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
        url: "/dashboard/users",
        icon: Users,
        isActive: isPathActive("/dashboard/users"),
        items: [
          {
            title: "All Users",
            url: "/dashboard/users",
            isActive: pathname === "/dashboard/users",
          },
          {
            title: "Teams",
            url: "/dashboard/users/teams",
            isActive: pathname === "/dashboard/users/teams",
          },
          {
            title: "Roles",
            url: "/dashboard/users/roles",
            isActive: pathname === "/dashboard/users/roles",
          },
          {
            title: "Activity",
            url: "/dashboard/users/activity",
            isActive: pathname === "/dashboard/users/activity",
          },
        ],
      },
      {
        title: "Organizations",
        url: "/dashboard/organizations",
        icon: Building2,
        isActive: isPathActive("/dashboard/organizations"),
        items: [
          {
            title: "All Organizations",
            url: "/dashboard/organizations",
            isActive: pathname === "/dashboard/organizations",
          },
          {
            title: "Departments",
            url: "/dashboard/organizations/departments",
            isActive: pathname === "/dashboard/organizations/departments",
          },
          {
            title: "Divisions",
            url: "/dashboard/organizations/divisions",
            isActive: pathname === "/dashboard/organizations/divisions",
          },
          {
            title: "Structure",
            url: "/dashboard/organizations/structure",
            isActive: pathname === "/dashboard/organizations/structure",
          },
        ],
      },
      {
        title: "Workflows",
        url: "/dashboard/workflows",
        icon: ClipboardList,
        isActive: isPathActive("/dashboard/workflows"),
        items: [
          {
            title: "Active Workflows",
            url: "/dashboard/workflows",
            isActive: pathname === "/dashboard/workflows",
          },
          {
            title: "Templates",
            url: "/dashboard/workflows/templates",
            isActive: pathname === "/dashboard/workflows/templates",
          },
          {
            title: "History",
            url: "/dashboard/workflows/history",
            isActive: pathname === "/dashboard/workflows/history",
          },
          {
            title: "Approvals",
            url: "/dashboard/workflows/approvals",
            isActive: pathname === "/dashboard/workflows/approvals",
          },
        ],
      },
      {
        title: "Permissions",
        url: "/dashboard/permissions",
        icon: LockClosed,
        isActive: isPathActive("/dashboard/permissions"),
        items: [
          {
            title: "Access Control",
            url: "/dashboard/permissions",
            isActive: pathname === "/dashboard/permissions",
          },
          {
            title: "Policies",
            url: "/dashboard/permissions/policies",
            isActive: pathname === "/dashboard/permissions/policies",
          },
          {
            title: "Security",
            url: "/dashboard/permissions/security",
            isActive: pathname === "/dashboard/permissions/security",
          },
          {
            title: "Audit Log",
            url: "/dashboard/permissions/audit",
            isActive: pathname === "/dashboard/permissions/audit",
          },
        ],
      },
      {
        title: "Notifications",
        url: "/dashboard/notifications",
        icon: Bell,
        isActive: isPathActive("/dashboard/notifications"),
        items: [
          {
            title: "All Notifications",
            url: "/dashboard/notifications",
            isActive: pathname === "/dashboard/notifications",
          },
          {
            title: "Announcements",
            url: "/dashboard/notifications/announcements",
            isActive: pathname === "/dashboard/notifications/announcements",
          },
          {
            title: "Settings",
            url: "/dashboard/notifications/settings",
            isActive: pathname === "/dashboard/notifications/settings",
          },
        ],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        isActive: isPathActive("/dashboard/settings"),
        items: [
          {
            title: "General",
            url: "/dashboard/settings",
            isActive: pathname === "/dashboard/settings",
          },
          {
            title: "Profile",
            url: "/dashboard/settings/profile",
            isActive: pathname === "/dashboard/settings/profile",
          },
          {
            title: "Security",
            url: "/dashboard/settings/security",
            isActive: pathname === "/dashboard/settings/security",
          },
          {
            title: "Integrations",
            url: "/dashboard/settings/integrations",
            isActive: pathname === "/dashboard/settings/integrations",
          },
        ],
      },
    ],

    projects: [
      {
        name: "Government Portal",
        url: "/dashboard/projects/portal",
        icon: FolderOpen,
      },
      {
        name: "Annual Reports",
        url: "/dashboard/projects/reports",
        icon: BarChart3,
      },
      {
        name: "Public Services",
        url: "/dashboard/projects/services",
        icon: UserCircle,
      },
    ],
  }

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
  )
}