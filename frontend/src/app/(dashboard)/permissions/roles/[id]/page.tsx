import { Metadata } from "next";
import { RoleDetailTabs } from "@/components/features/permissions/roles";

export const metadata: Metadata = {
  title: "Role Details | Permission Management",
  description: "View and manage role details, permissions, and module access",
};

interface RoleDetailPageProps {
  params: {
    id: string;
  };
}

export default function RoleDetailPage({ params }: RoleDetailPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Details</h1>
        <p className="text-muted-foreground mt-2">
          View and manage role information, permissions, and module access
        </p>
      </div>

      <RoleDetailTabs roleId={params.id} />
    </div>
  );
}
