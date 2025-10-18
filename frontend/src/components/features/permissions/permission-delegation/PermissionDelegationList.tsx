"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import CreateDelegationModal from "./CreateDelegationModal";
import ViewDelegationModal from "./ViewDelegationModal";
import RevokeDelegationModal from "./RevokeDelegationModal";
import { createDelegationColumns } from "./PermissionDelegationColumns";
import { PermissionDelegation } from "@/lib/api/services/permission-delegation.service";
import {
  useGetMyDelegationsQuery,
  useGetDelegatedToMeQuery,
} from "@/store/api/permissionDelegationApi";
import { Skeleton } from "@/components/ui/skeleton";

export default function PermissionDelegationList() {
  const [activeTab, setActiveTab] = useState<"my-delegations" | "delegated-to-me">(
    "my-delegations"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] =
    useState<PermissionDelegation | null>(null);

  // Fetch data using RTK Query
  const {
    data: myDelegationsData,
    isLoading: isLoadingMyDelegations,
    isFetching: isFetchingMyDelegations,
    error: myDelegationsError,
    refetch: refetchMyDelegations,
  } = useGetMyDelegationsQuery(undefined, {
    skip: activeTab !== "my-delegations",
  });

  const {
    data: delegatedToMeData,
    isLoading: isLoadingDelegatedToMe,
    isFetching: isFetchingDelegatedToMe,
    error: delegatedToMeError,
    refetch: refetchDelegatedToMe,
  } = useGetDelegatedToMeQuery(undefined, {
    skip: activeTab !== "delegated-to-me",
  });

  const isLoading =
    activeTab === "my-delegations"
      ? isLoadingMyDelegations
      : isLoadingDelegatedToMe;

  const isFetching =
    activeTab === "my-delegations"
      ? isFetchingMyDelegations
      : isFetchingDelegatedToMe;

  const data =
    activeTab === "my-delegations" ? myDelegationsData : delegatedToMeData;

  const error =
    activeTab === "my-delegations" ? myDelegationsError : delegatedToMeError;

  // Filter data based on status
  const filteredData = React.useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === "all") return data.data;

    return data.data.filter((delegation) => {
      if (delegation.isRevoked && statusFilter === "revoked") return true;
      if (
        !delegation.isRevoked &&
        new Date(delegation.validUntil) < new Date() &&
        statusFilter === "expired"
      )
        return true;
      if (
        !delegation.isRevoked &&
        new Date(delegation.validUntil) >= new Date() &&
        statusFilter === "active"
      )
        return true;
      return false;
    });
  }, [data, statusFilter]);

  // Handle RTK Query errors
  React.useEffect(() => {
    if (error) {
      console.error("Failed to fetch delegations:", error);
      toast.error("Failed to load permission delegations");
    }
  }, [error]);

  // Handle actions
  const handleCreate = () => {
    setCreateModalOpen(true);
  };

  const handleView = (delegation: PermissionDelegation) => {
    setSelectedDelegation(delegation);
    setViewModalOpen(true);
  };

  const handleRevoke = (delegation: PermissionDelegation) => {
    setSelectedDelegation(delegation);
    setRevokeModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    refetchMyDelegations();
    toast.success("Delegation created successfully");
  };

  const handleRevokeSuccess = () => {
    setRevokeModalOpen(false);
    setSelectedDelegation(null);
    if (activeTab === "my-delegations") {
      refetchMyDelegations();
    } else {
      refetchDelegatedToMe();
    }
    toast.success("Delegation revoked successfully");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "my-delegations" | "delegated-to-me");
    setStatusFilter("all");
  };

  // Create columns with action handlers
  const columns = createDelegationColumns({
    onView: handleView,
    onRevoke: handleRevoke,
    viewType: activeTab,
  });

  if (isLoading && (!data || data.data.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Permission Delegations
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage temporary permission delegations to other users
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Delegation
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="my-delegations">My Delegations</TabsTrigger>
            <TabsTrigger value="delegated-to-me">Delegated to Me</TabsTrigger>
          </TabsList>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="my-delegations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Delegations</CardTitle>
              <CardDescription>
                Permissions you have delegated to other users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredData}
                isLoading={isFetching}
                showSearch={false}
                showPagination={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegated-to-me" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delegated to Me</CardTitle>
              <CardDescription>
                Permissions that have been delegated to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredData}
                isLoading={isFetching}
                showSearch={false}
                showPagination={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateDelegationModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {selectedDelegation && (
        <>
          <ViewDelegationModal
            open={viewModalOpen}
            delegation={selectedDelegation}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedDelegation(null);
            }}
          />

          <RevokeDelegationModal
            open={revokeModalOpen}
            delegation={selectedDelegation}
            onClose={() => {
              setRevokeModalOpen(false);
              setSelectedDelegation(null);
            }}
            onSuccess={handleRevokeSuccess}
          />
        </>
      )}
    </div>
  );
}
