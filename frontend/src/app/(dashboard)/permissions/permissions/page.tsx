import { Metadata } from "next";
import { PermissionList } from "@/components/features/permissions/permissions";

export const metadata: Metadata = {
  title: "Permissions | Permission Management",
  description: "Manage system permissions and access controls",
};

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Manage system permissions and access control policies
        </p>
      </div>

      <PermissionList />
    </div>
  );
}
