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
  return <UserAssignmentTabs userId={params.userId} />;
}
