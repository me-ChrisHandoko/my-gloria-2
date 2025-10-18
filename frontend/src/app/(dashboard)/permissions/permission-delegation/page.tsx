import { Metadata } from "next";
import PermissionDelegationList from "@/components/features/permissions/permission-delegation/PermissionDelegationList";

export const metadata: Metadata = {
  title: "Permission Delegations | Gloria System",
  description:
    "Manage temporary permission delegations in Gloria System",
};

export default function PermissionDelegationsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PermissionDelegationList />
    </div>
  );
}
