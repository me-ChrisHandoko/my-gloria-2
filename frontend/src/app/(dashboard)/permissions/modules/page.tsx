import { Metadata } from "next";
import { ModulesPageTabs } from "@/components/features/permissions/modules";

export const metadata: Metadata = {
  title: "Modules | Permission Management",
  description: "Manage modules and module-based access control",
};

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
        <p className="text-muted-foreground mt-2">
          Manage modules and module-based access control
        </p>
      </div>

      <ModulesPageTabs />
    </div>
  );
}
