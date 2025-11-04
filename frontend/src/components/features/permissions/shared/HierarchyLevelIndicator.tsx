"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HierarchyLevelIndicatorProps {
  level: number;
  maxLevel?: number;
  showLabel?: boolean;
  className?: string;
}

const HIERARCHY_DESCRIPTIONS: Record<number, string> = {
  0: "Foundation Level - Highest Authority",
  1: "Executive Level - Strategic Leadership",
  2: "Senior Management - Operational Leadership",
  3: "Middle Management - Department Leadership",
  4: "Team Leadership - Supervisor Level",
  5: "Senior Staff - Experienced Personnel",
  6: "Regular Staff - Standard Personnel",
  7: "Junior Staff - Entry Level",
  8: "Intern Level - Training Position",
  9: "Temporary Staff - Contract Position",
  10: "Guest Access - Limited Permissions",
};

export function HierarchyLevelIndicator({
  level,
  maxLevel = 10,
  showLabel = true,
  className,
}: HierarchyLevelIndicatorProps) {
  // Clamp level between 0 and maxLevel
  const clampedLevel = Math.max(0, Math.min(level, maxLevel));

  // Calculate percentage (inverted so 0 is 100% and maxLevel is 0%)
  const percentage = ((maxLevel - clampedLevel) / maxLevel) * 100;

  // Get text color class for level badge
  const getTextColorClass = (lvl: number): string => {
    if (lvl === 0) return "text-purple-600";
    if (lvl <= 2) return "text-blue-600";
    if (lvl <= 4) return "text-green-600";
    if (lvl <= 6) return "text-yellow-600";
    if (lvl <= 8) return "text-orange-600";
    return "text-gray-600";
  };

  const description = HIERARCHY_DESCRIPTIONS[clampedLevel] || `Level ${clampedLevel}`;

  // Get progress bar color class
  const getProgressColorClass = (lvl: number): string => {
    if (lvl === 0) return "[&>div]:bg-purple-600";
    if (lvl <= 2) return "[&>div]:bg-blue-600";
    if (lvl <= 4) return "[&>div]:bg-green-600";
    if (lvl <= 6) return "[&>div]:bg-yellow-600";
    if (lvl <= 8) return "[&>div]:bg-orange-600";
    return "[&>div]:bg-gray-600";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-3", className)}>
            {/* Visual Indicator - Progress Bar */}
            <div className="flex-1 min-w-[100px]">
              <Progress
                value={percentage}
                className={cn("h-2 bg-gray-200", getProgressColorClass(clampedLevel))}
                aria-label={`Hierarchy level ${clampedLevel}`}
              />
            </div>

            {/* Level Number Badge */}
            {showLabel && (
              <div className={cn(
                "flex h-7 w-12 items-center justify-center rounded-md border-2 text-xs font-semibold",
                getTextColorClass(clampedLevel)
              )}>
                L{clampedLevel}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Level {clampedLevel}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Alternative dot-based visualization
 */
export function HierarchyLevelDots({
  level,
  maxLevel = 10,
  className,
}: Omit<HierarchyLevelIndicatorProps, "showLabel">) {
  const clampedLevel = Math.max(0, Math.min(level, maxLevel));

  const getDotColorClass = (dotLevel: number, currentLevel: number): string => {
    if (dotLevel > currentLevel) return "bg-gray-300";
    if (currentLevel === 0) return "bg-purple-600";
    if (currentLevel <= 2) return "bg-blue-600";
    if (currentLevel <= 4) return "bg-green-600";
    if (currentLevel <= 6) return "bg-yellow-600";
    if (currentLevel <= 8) return "bg-orange-600";
    return "bg-gray-600";
  };

  const description = HIERARCHY_DESCRIPTIONS[clampedLevel] || `Level ${clampedLevel}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", className)}>
            {Array.from({ length: Math.min(maxLevel + 1, 11) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  getDotColorClass(maxLevel - i, clampedLevel)
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Level {clampedLevel}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
