"use client";

/**
 * UserAssignmentTabs Component
 * Phase 3 & 4: User Permission Management
 *
 * Main tabbed interface for managing user roles and permissions.
 * Features:
 * - Roles tab: View and manage user role assignments
 * - Permissions tab: View and manage direct user permissions
 * - Audit tab: View comprehensive permission audit
 * - Loading states and error handling
 * - Responsive layout
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 3 & 4
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Key, FileText, User, ArrowLeft } from 'lucide-react';
import UserRolesList from './UserRolesList';
import UserPermissionsList from './UserPermissionsList';
import UserPermissionAudit from './UserPermissionAudit';

interface UserAssignmentTabsProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  defaultTab?: 'roles' | 'permissions' | 'audit';
}

export default function UserAssignmentTabs({
  userId,
  userName,
  userEmail,
  defaultTab = 'roles',
}: UserAssignmentTabsProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push('/permissions/users');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{userName || 'User Permissions'}</CardTitle>
              {userEmail && (
                <CardDescription>{userEmail}</CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Users</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <UserRolesList userId={userId} />
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <UserPermissionsList userId={userId} />
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            <UserPermissionAudit userId={userId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
