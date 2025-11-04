import { Metadata } from "next";
import { PermissionDashboard } from "@/components/features/permissions/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Permission Management",
  description: "Overview of permission system statistics and analytics",
};

export default function PermissionsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permission Management</h1>
        <p className="text-muted-foreground mt-2">
          Overview of roles, permissions, and user access statistics
        </p>
      </div>

      <PermissionDashboard />
    </div>
  );
}
