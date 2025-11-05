import { Metadata } from "next";
import { PermissionDashboard } from "@/components/features/permissions/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Permission Management",
  description: "Overview of permission system statistics and analytics",
};

export default function PermissionsDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PermissionDashboard />
    </div>
  );
}
