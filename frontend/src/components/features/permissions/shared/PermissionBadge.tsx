"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PermissionBadgeProps {
  isGranted?: boolean;
  isActive?: boolean;
  isExpired?: boolean;
  className?: string;
}

export function PermissionBadge({
  isGranted = true,
  isActive = true,
  isExpired = false,
  className,
}: PermissionBadgeProps) {
  if (isExpired) {
    return (
      <Badge variant="outline" className={cn("border-gray-400 text-gray-600", className)}>
        Expired
      </Badge>
    );
  }

  if (!isActive) {
    return (
      <Badge variant="outline" className={cn("border-orange-400 text-orange-600", className)}>
        Inactive
      </Badge>
    );
  }

  if (isGranted) {
    return (
      <Badge variant="outline" className={cn("border-green-500 text-green-600", className)}>
        Granted
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("border-red-500 text-red-600", className)}>
      Denied
    </Badge>
  );
}
