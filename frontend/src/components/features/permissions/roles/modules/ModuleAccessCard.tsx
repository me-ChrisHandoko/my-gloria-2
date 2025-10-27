"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Unlock } from "lucide-react";

interface ModuleAccessCardProps {
  module: any; // Type based on backend module structure
}

export default function ModuleAccessCard({ module }: ModuleAccessCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{module.name}</CardTitle>
          <Badge variant={module.isActive ? "default" : "secondary"}>
            {module.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {module.description || "No description"}
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Required Permissions:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {module.requiredPermissions?.map((perm: string) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {perm}
              </Badge>
            )) || <span className="text-xs text-muted-foreground">None</span>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {module.hasAccess ? (
            <>
              <Unlock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                Access Granted
              </span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600 font-medium">
                Access Denied
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
