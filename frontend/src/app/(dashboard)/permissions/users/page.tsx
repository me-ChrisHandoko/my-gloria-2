import { Metadata } from "next";
import { UsersPageTabs } from "@/components/features/permissions/users";

export const metadata: Metadata = {
  title: "User Assignments | Permission Management",
  description: "Manage user role assignments and direct permissions",
};

export default function PermissionsUsersPage() {
  return <UsersPageTabs />;
}
