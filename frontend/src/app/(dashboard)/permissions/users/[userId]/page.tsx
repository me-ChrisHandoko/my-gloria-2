import { Metadata } from "next";
import { UserAssignmentTabs } from "@/components/features/permissions/users";

export const metadata: Metadata = {
  title: "User Permissions | Permission Management",
  description: "Manage user roles and permissions",
};

interface UserPermissionsPageProps {
  params: {
    userId: string;
  };
}

export default function UserPermissionsPage({ params }: UserPermissionsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Manage user roles, permissions, and access audit
        </p>
      </div>

      <UserAssignmentTabs userId={params.userId} />
    </div>
  );
}
