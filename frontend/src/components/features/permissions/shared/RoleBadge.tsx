"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Shield, Lock } from "lucide-react";

interface RoleBadgeProps {
  isActive?: boolean;
  isSystem?: boolean;
  hierarchyLevel?: number;
  className?: string;
}

export function RoleBadge({
  isActive = true,
  isSystem = false,
  hierarchyLevel,
  className,
}: RoleBadgeProps) {
  // System roles get special treatment
  if (isSystem) {
    return (
      <Badge
        variant="outline"
        className={cn("border-blue-500 text-blue-600 gap-1", className)}
      >
        <Lock className="h-3 w-3" />
        System
      </Badge>
    );
  }

  // Inactive roles
  if (!isActive) {
    return (
      <Badge
        variant="outline"
        className={cn("border-gray-400 text-gray-600", className)}
      >
        Inactive
      </Badge>
    );
  }

  // Active roles with hierarchy level indicator
  return (
    <Badge
      variant="outline"
      className={cn("border-green-500 text-green-600 gap-1", className)}
    >
      <Shield className="h-3 w-3" />
      Active
      {hierarchyLevel !== undefined && (
        <span className="ml-1 text-xs opacity-70">
          L{hierarchyLevel}
        </span>
      )}
    </Badge>
  );
}
