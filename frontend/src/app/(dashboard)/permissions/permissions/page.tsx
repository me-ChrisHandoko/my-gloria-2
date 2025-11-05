import { Metadata } from "next";
import { PermissionList } from "@/components/features/permissions/permissions";

export const metadata: Metadata = {
  title: "Permissions | Permission Management",
  description: "Manage system permissions and access controls",
};

export default function PermissionsPage() {
  return <PermissionList />;
}
