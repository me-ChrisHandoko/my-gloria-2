import { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/features/permissions/analytics";

export const metadata: Metadata = {
  title: "Analytics | Permission Management",
  description: "Permission system analytics, statistics, and bulk operations",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Bulk Operations</h1>
        <p className="text-muted-foreground mt-2">
          System analytics, usage statistics, and bulk operations
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
