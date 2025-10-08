"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPositionsQuery } from "@/store/api/positionApi";
import { useGetOrganizationsQuery } from "@/store/api/organizationApi";
import { Building2, Users, Layers } from "lucide-react";

interface PositionHierarchyModalProps {
  open: boolean;
  schoolId: string;
  onClose: () => void;
}

export default function PositionHierarchyModal({
  open,
  schoolId,
  onClose,
}: PositionHierarchyModalProps) {
  // Fetch school details
  const { data: organizationsData } = useGetOrganizationsQuery({ limit: 100 });
  const schools = organizationsData?.data || [];
  const school = schools.find((s) => s.id === schoolId);

  // Fetch all positions for this school
  const { data: positionsData, isLoading } = useGetPositionsQuery(
    {
      schoolId: schoolId,
      limit: 100,
      isActive: true,
    },
    {
      skip: !schoolId || !open,
    }
  );

  const positions = positionsData?.data || [];

  // Group positions by hierarchy level
  const positionsByLevel = positions.reduce((acc, position) => {
    const level = position.hierarchyLevel || position.level || 0;
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(position);
    return acc;
  }, {} as Record<number, typeof positions>);

  // Sort levels
  const sortedLevels = Object.keys(positionsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  const getLevelLabel = (level: number): string => {
    if (level <= 3) return "Senior Level";
    if (level <= 6) return "Mid Level";
    return "Entry Level";
  };

  const getLevelColor = (level: number): string => {
    if (level <= 3) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    if (level <= 6) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Position Hierarchy
          </DialogTitle>
          <DialogDescription>
            {school ? `Organizational hierarchy for ${school.name}` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No positions found for this school</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedLevels.map((level) => (
                <div key={level} className="space-y-3">
                  {/* Level Header */}
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <Badge variant="outline" className={`font-mono ${getLevelColor(level)}`}>
                      Level {level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {getLevelLabel(level)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {positionsByLevel[level].length} position{positionsByLevel[level].length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Positions at this level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {positionsByLevel[level].map((position) => (
                      <div
                        key={position.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-2">
                          {/* Position Name */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate" title={position.name}>
                                {position.name}
                              </h4>
                              <code className="text-xs text-muted-foreground">
                                {position.code}
                              </code>
                            </div>
                            {position.isActive && (
                              <Badge
                                variant="success"
                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 shrink-0"
                              >
                                Active
                              </Badge>
                            )}
                          </div>

                          {/* Department */}
                          {position.department && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate" title={position.department.name}>
                                {position.department.name}
                              </span>
                            </div>
                          )}

                          {/* Holders Count */}
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{position.holderCount || 0} holders</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {!isLoading && positions.length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{positions.length}</p>
                  <p className="text-xs text-muted-foreground">Total Positions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{sortedLevels.length}</p>
                  <p className="text-xs text-muted-foreground">Hierarchy Levels</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {positions.reduce((sum, p) => sum + (p.holderCount || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Holders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {positions.filter((p) => p.isActive).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
