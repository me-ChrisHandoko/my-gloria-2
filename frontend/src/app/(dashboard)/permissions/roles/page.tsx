"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleList from "@/components/features/permissions/roles/RoleList";
import RoleTemplateList from "@/components/features/permissions/roles/templates/RoleTemplateList";

export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "roles";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without page reload
    router.push(`/permissions/roles?tab=${value}`, { scroll: false });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Role Management
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage roles and role templates
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="templates">Role Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-0">
          <RoleList />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <RoleTemplateList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
