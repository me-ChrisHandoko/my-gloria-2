"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive?: boolean;
    }[];
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isMainActive =
            item.isActive ||
            pathname === item.url ||
            (item.url !== "/dashboard" && pathname.startsWith(item.url));
          const hasActiveChild = item.items?.some(
            (subItem) => pathname === subItem.url || subItem.isActive
          );
          const shouldOpenCollapsible = isMainActive || hasActiveChild;

          // If no sub-items, render as simple link
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isMainActive}
                  className={cn(
                    "transition-all duration-200",
                    isMainActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "transition-colors",
                          isMainActive && "text-primary"
                        )}
                      />
                    )}
                    <span>{item.title}</span>
                    {isMainActive && (
                      <div className="ml-auto w-1 h-5 rounded-full" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // If has sub-items, render as collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={shouldOpenCollapsible}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "transition-all duration-200",
                      isMainActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "transition-colors",
                          isMainActive && "text-primary"
                        )}
                      />
                    )}
                    <span>{item.title}</span>
                    <ChevronRight
                      className={cn(
                        "ml-auto transition-transform duration-200",
                        "group-data-[state=open]/collapsible:rotate-90",
                        isMainActive && "text-primary"
                      )}
                    />
                    {isMainActive && !hasActiveChild && (
                      <div className="absolute right-1 w-1 h-5 bg-primary rounded-full" />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isSubActive =
                        pathname === subItem.url || subItem.isActive;

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive}
                            className={cn(
                              "transition-all duration-200",
                              isSubActive && [
                                "bg-sidebar-accent/50",
                                "text-sidebar-accent-foreground",
                                "font-medium",
                                "relative",
                              ]
                            )}
                          >
                            <Link href={subItem.url}>
                              <span className={cn(isSubActive && "ml-2")}>
                                {subItem.title}
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
