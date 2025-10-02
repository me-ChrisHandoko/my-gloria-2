'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Calendar,
  Code2,
  FileText,
  Layers,
  User,
  Users,
  Hash,
} from 'lucide-react';
import { departmentService, type Department, type DepartmentUser } from '@/lib/api/services/departments.service';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface ViewDepartmentModalProps {
  open: boolean;
  department: Department;
  onClose: () => void;
}

export default function ViewDepartmentModal({
  open,
  department,
  onClose,
}: ViewDepartmentModalProps) {
  const [departmentUsers, setDepartmentUsers] = useState<DepartmentUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDepartmentUsers();
    }
  }, [open, department.id]);

  const fetchDepartmentUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await departmentService.getDepartmentUsers(department.id);
      setDepartmentUsers(users);
    } catch (error) {
      console.error('Failed to fetch department users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Department Details</DialogTitle>
          <DialogDescription>
            View detailed information about {department.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            <TabsTrigger value="users">Users ({departmentUsers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{department.name}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Code2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Code</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{department.code}</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(department.createdAt), 'PPP')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={department.isActive ? 'success' : 'secondary'}>
                      {department.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Department Head</p>
                    <p className="text-sm text-muted-foreground">
                      {department.head ? (
                        <>
                          {department.head.name}
                          <br />
                          <span className="text-xs">{department.head.email}</span>
                        </>
                      ) : (
                        'Not assigned'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(department.updatedAt), 'PPP')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {department.description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {department.description}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center space-y-1 p-3 bg-muted rounded-lg">
                <Users className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold">{department.userCount || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
              <div className="text-center space-y-1 p-3 bg-muted rounded-lg">
                <Layers className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold">{department.positionCount || 0}</p>
                <p className="text-xs text-muted-foreground">Positions</p>
              </div>
              <div className="text-center space-y-1 p-3 bg-muted rounded-lg">
                <Building2 className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-2xl font-bold">{department.childDepartmentCount || 0}</p>
                <p className="text-xs text-muted-foreground">Child Departments</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hierarchy" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">School</p>
                  <p className="text-sm text-muted-foreground">
                    {department.school?.name} ({department.school?.code})
                  </p>
                </div>
              </div>

              {department.parent && (
                <div className="flex items-start space-x-3">
                  <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Parent Department</p>
                    <p className="text-sm text-muted-foreground">
                      {department.parent.name} ({department.parent.code})
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Hierarchy Path</p>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-muted-foreground">{department.school?.name}</span>
                  {department.parent && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">{department.parent.name}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{department.name}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <ScrollArea className="h-[300px]">
              {loadingUsers ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : departmentUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users assigned to this department
                </div>
              ) : (
                <div className="space-y-2">
                  {departmentUsers.map((deptUser) => (
                    <div
                      key={deptUser.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{deptUser.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{deptUser.user?.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {deptUser.position?.name || 'No Position'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}