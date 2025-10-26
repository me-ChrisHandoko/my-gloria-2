"use client";

import { Metadata } from "next";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModuleList from "@/components/features/permissions/module/crud/ModuleList";
import ModuleAccessList from "@/components/features/permissions/module/user-access/ModuleAccessList";
import RoleModuleAccessList from "@/components/features/permissions/module/role-access/RoleModuleAccessList";

export default function ModulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "management";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without page reload
    router.push(`/permissions/modules?tab=${value}`, { scroll: false });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Module Management
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage modules, user access, and role permissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="management">Module Management</TabsTrigger>
          <TabsTrigger value="user-access">User Access</TabsTrigger>
          <TabsTrigger value="role-access">Role Access</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="mt-0">
          <ModuleList />
        </TabsContent>

        <TabsContent value="user-access" className="mt-0">
          <ModuleAccessList />
        </TabsContent>

        <TabsContent value="role-access" className="mt-0">
          <RoleModuleAccessList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
