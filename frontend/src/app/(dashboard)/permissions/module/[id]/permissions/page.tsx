import { Metadata } from "next";
import ModulePermissionsList from "@/components/features/permissions/module/permissions/ModulePermissionsList";

export const metadata: Metadata = {
  title: "Module Permissions | Gloria System",
  description:
    "Manage module permissions and access control configurations in Gloria System",
};

export default function ModulePermissionsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <ModulePermissionsList />
    </div>
  );
}
