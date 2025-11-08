import { Metadata } from "next";
import { ModulesPageTabs } from "@/components/features/permissions/modules";

export const metadata: Metadata = {
  title: "Modules | Permission Management",
  description: "Manage modules and module-based access control",
};

export default function ModulesPage() {
  return <ModulesPageTabs />;
}
