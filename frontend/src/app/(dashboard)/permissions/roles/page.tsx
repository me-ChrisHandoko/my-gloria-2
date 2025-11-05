import { Metadata } from "next";
import { RolesPageTabs } from "@/components/features/permissions/roles";

export const metadata: Metadata = {
  title: "Roles | Permission Management",
  description: "Manage roles, hierarchy, and role-based access control",
};

export default function RolesPage() {
  return <RolesPageTabs />;
}
