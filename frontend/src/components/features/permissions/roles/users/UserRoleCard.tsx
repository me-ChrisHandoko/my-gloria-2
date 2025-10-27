"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock } from "lucide-react";
import type { RoleUser } from "@/lib/api/services/roles.service";

interface UserRoleCardProps {
  userRole: RoleUser;
}

export default function UserRoleCard({ userRole }: UserRoleCardProps) {
  const isActive = userRole.isActive;
  const hasExpiry = !!userRole.validUntil;

  // Check if role is currently valid
  const now = new Date();
  const validFrom = new Date(userRole.validFrom);
  const validUntil = userRole.validUntil ? new Date(userRole.validUntil) : null;
  const isCurrentlyValid = now >= validFrom && (!validUntil || now <= validUntil);

  return (
    <div className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        {/* User Info */}
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {userRole.userProfile?.dataKaryawan?.nama || "Unknown User"}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {userRole.userProfileId}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {isCurrentlyValid && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Currently Valid
            </Badge>
          )}
        </div>
      </div>

      {/* Temporal Info */}
      <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>From: {new Date(userRole.validFrom).toLocaleDateString()}</span>
        </div>
        {hasExpiry && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Until: {new Date(userRole.validUntil!).toLocaleDateString()}</span>
          </div>
        )}
        {!hasExpiry && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Permanent</span>
          </div>
        )}
      </div>
    </div>
  );
}
