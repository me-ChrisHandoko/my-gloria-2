import { Metadata } from "next";
import { UserAssignmentTabs } from "@/components/features/permissions/users";

export const metadata: Metadata = {
  title: "User Permissions | Permission Management",
  description: "Manage user roles and permissions",
};

interface UserPermissionsPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserPermissionsPage({ params }: UserPermissionsPageProps) {
  const { userId } = await params;
  return <UserAssignmentTabs userId={userId} />;
}
