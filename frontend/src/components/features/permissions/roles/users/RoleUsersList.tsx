"use client";

import { useState } from "react";
import { useGetRoleUsersQuery } from "@/store/api/rolesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import UserRoleCard from "./UserRoleCard";

interface RoleUsersListProps {
  roleId: string;
}

export default function RoleUsersList({ roleId }: RoleUsersListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetRoleUsersQuery({
    roleId,
    params: {
      page,
      limit: 20,
      search: search || undefined,
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Users with this Role</CardTitle>
          <Badge>{data?.total || 0} users</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data && data.data.length > 0 ? (
          <div className="space-y-2">
            {data.data.map((userRole) => (
              <UserRoleCard key={userRole.id} userRole={userRole} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No users assigned to this role
          </p>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
