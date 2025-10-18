import { Metadata } from "next";
import ModuleAccessList from "@/components/features/permissions/module-access/ModuleAccessList";

export const metadata: Metadata = {
  title: "Module Access Management | Gloria System",
  description:
    "Grant and manage user access to modules with custom permissions in Gloria System",
};

export default function ModuleAccessPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <ModuleAccessList />
    </div>
  );
}
