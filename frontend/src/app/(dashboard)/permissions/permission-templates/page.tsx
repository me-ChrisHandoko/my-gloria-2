import { Metadata } from "next";
import PermissionTemplateList from "@/components/features/permissions/permission-templates/PermissionTemplateList";

export const metadata: Metadata = {
  title: "Permission Templates | Gloria System",
  description:
    "Manage reusable permission templates for roles, positions, and departments in Gloria System",
};

export default function PermissionTemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PermissionTemplateList />
    </div>
  );
}
