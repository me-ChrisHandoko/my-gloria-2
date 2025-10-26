"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { RoleModuleAccess } from "@/lib/api/services/role-module-access.service";
import {
  useGetRoleModuleAccessQuery,
  useRevokeRoleModuleAccessMutation,
} from "@/store/api/roleModuleAccessApi";
import { useGetRolesQuery } from "@/store/api/rolesApi";
import GrantRoleAccessModal from "./GrantRoleAccessModal";
import RevokeRoleAccessModal from "./RevokeRoleAccessModal";
import { formatDistanceToNow } from "date-fns";

export default function RoleModuleAccessList() {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<RoleModuleAccess | null>(
    null
  );

  // Fetch roles for filter
  const { data: rolesData, isLoading: isLoadingRoles } = useGetRolesQuery({
    page: 1,
    limit: 100,
    isActive: true,
  });

  // Fetch role module access
  const {
    data: accessListData,
    isLoading: isLoadingAccess,
    isFetching,
    error: accessError,
    refetch: refetchAccess,
  } = useGetRoleModuleAccessQuery(selectedRoleId, {
    skip: selectedRoleId === "all",
  });

  const rolesList = rolesData?.data || [];

  // Debug logging
  console.log('[DEBUG] Selected Role ID:', selectedRoleId);
  console.log('[DEBUG] Raw Access List Data:', accessListData);
  console.log('[DEBUG] Type:', typeof accessListData, 'isArray:', Array.isArray(accessListData));
  console.log('[DEBUG] Is Loading:', isLoadingAccess);
  console.log('[DEBUG] Error:', accessError);

  // Safely extract array from response (handle various response formats)
  const accessList = Array.isArray(accessListData)
    ? accessListData
    : (accessListData as any)?.data
    ? Array.isArray((accessListData as any).data)
      ? (accessListData as any).data
      : []
    : [];

  console.log('[DEBUG] Extracted Access List:', accessList);

  // Debug first record structure
  if (accessList && accessList.length > 0) {
    console.log('[DEBUG] First Record:', accessList[0]);
    console.log('[DEBUG] First Record Keys:', Object.keys(accessList[0]));
    console.log('[DEBUG] Role Data:', accessList[0].role);
    console.log('[DEBUG] Module Data:', accessList[0].module);
    console.log('[DEBUG] Permissions:', {
      canRead: accessList[0].canRead,
      canWrite: accessList[0].canWrite,
      canDelete: accessList[0].canDelete,
      canShare: accessList[0].canShare,
    });
  }

  // Handle RTK Query errors
  useEffect(() => {
    if (accessError) {
      console.error("Failed to fetch role module access:", accessError);
      toast.error("Failed to load role module access");
    }
  }, [accessError]);

  const handleGrantAccess = () => {
    setGrantModalOpen(true);
  };

  const handleRevoke = (access: RoleModuleAccess) => {
    setSelectedAccess(access);
    setRevokeModalOpen(true);
  };

  const handleGrantSuccess = () => {
    setGrantModalOpen(false);
    refetchAccess();
    toast.success("Role access granted successfully");
  };

  const handleRevokeSuccess = () => {
    setRevokeModalOpen(false);
    setSelectedAccess(null);
    refetchAccess();
    toast.success("Role access revoked successfully");
  };

  // Create columns
  const columns: ColumnDef<RoleModuleAccess>[] = [
    {
      id: "role",
      accessorKey: "role",
      size: 180,
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-sm">{role?.name || "Unknown Role"}</span>
          </div>
        );
      },
    },
    {
      id: "module",
      accessorKey: "module",
      size: 200,
      header: "Module",
      cell: ({ row }) => {
        const module = row.original.module;
        return (
          <div className="flex items-center gap-2">
            {module?.icon && <span className="text-lg">{module.icon}</span>}
            <div className="flex flex-col gap-1">
              <span className="font-medium text-sm">
                {module?.name || "Unknown Module"}
              </span>
              <span className="text-xs font-mono text-gray-500">
                {module?.code}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "permissions",
      size: 180,
      header: "Permissions",
      cell: ({ row }) => {
        const access = row.original;
        // Handle both flat structure and nested permissions object
        const permissions = (access as any).permissions || access;
        const canRead = permissions.canRead;
        const canWrite = permissions.canWrite;
        const canDelete = permissions.canDelete;
        const canShare = permissions.canShare;

        return (
          <div className="flex flex-wrap gap-1">
            {canRead && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
              >
                R
              </Badge>
            )}
            {canWrite && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 text-xs"
              >
                W
              </Badge>
            )}
            {canDelete && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 text-xs"
              >
                D
              </Badge>
            )}
            {canShare && (
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
              >
                S
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "validUntil",
      accessorKey: "validUntil",
      size: 120,
      header: "Valid Until",
      cell: ({ row }) => {
        const validUntil = row.getValue("validUntil") as string | undefined;
        if (!validUntil) {
          return (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 text-xs"
            >
              Permanent
            </Badge>
          );
        }
        const isExpired = new Date(validUntil) < new Date();
        return (
          <span
            className={`text-xs ${
              isExpired ? "text-red-600" : "text-gray-600"
            }`}
          >
            {new Date(validUntil).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      size: 100,
      header: "Created",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string;
        return (
          <span className="text-xs text-gray-600">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 100,
      header: "Actions",
      cell: ({ row }) => {
        const access = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRevoke(access)}
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Revoke
          </Button>
        );
      },
    },
  ];

  if (isLoadingRoles) {
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Module Access
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage role-based module access permissions
          </p>
        </div>
        <Button
          onClick={handleGrantAccess}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Grant Access
        </Button>
      </div>

      <Card>
        <CardContent>
          {/* Role Filter */}
          <div className="mt-6 mb-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter by Role:</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {rolesList.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DataTable or Empty State */}
          {selectedRoleId === "all" ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a Role
              </h3>
              <p className="text-sm text-gray-600">
                Please select a role from the dropdown to view module access
                permissions
              </p>
            </div>
          ) : isLoadingAccess ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !accessList || accessList.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Access Granted
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This role has no module access permissions yet
              </p>
              <Button onClick={handleGrantAccess}>
                <Plus className="h-4 w-4 mr-2" />
                Grant Access
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <DataTable
                columns={columns}
                data={accessList}
                isLoading={isFetching}
                showSearch={false}
                showPagination={false}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <GrantRoleAccessModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        onSuccess={handleGrantSuccess}
        preSelectedRoleId={
          selectedRoleId !== "all" ? selectedRoleId : undefined
        }
      />

      {selectedAccess && (
        <RevokeRoleAccessModal
          open={revokeModalOpen}
          access={selectedAccess}
          onClose={() => {
            setRevokeModalOpen(false);
            setSelectedAccess(null);
          }}
          onSuccess={handleRevokeSuccess}
        />
      )}
    </div>
  );
}
