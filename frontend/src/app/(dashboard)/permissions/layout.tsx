import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permission Management | My Gloria 2",
  description: "Comprehensive role-based access control (RBAC) system for managing permissions, roles, and user access",
};

export default function PermissionsLayout({
  children,
}: {
  children: React.Node;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {children}
    </div>
  );
}
