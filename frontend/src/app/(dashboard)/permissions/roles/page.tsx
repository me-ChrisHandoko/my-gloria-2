import { Metadata } from "next";
import { RolesPageTabs } from "@/components/features/permissions/roles";

export const metadata: Metadata = {
  title: "Roles | Permission Management",
  description: "Manage roles, hierarchy, and role-based access control",
};

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground mt-2">
          Manage roles and hierarchical access control
        </p>
      </div>

      <RolesPageTabs />
    </div>
  );
}
