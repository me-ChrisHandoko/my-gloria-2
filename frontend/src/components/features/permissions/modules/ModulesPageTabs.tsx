"use client";

/**
 * ModulesPageTabs Component
 *
 * Main page component with tabbed interface for modules management.
 * Features:
 * - List view with data table
 * - Tree view with hierarchy
 * - Tab persistence
 * - Shared actions across views
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, FolderTree, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ModuleList from './ModuleList';
import ModuleTree from './ModuleTree';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ModuleForm from './ModuleForm';
import { DeleteModuleDialog } from './DeleteModuleDialog';
import { ViewModuleDialog } from './ViewModuleDialog';
import type { ModuleTreeNode } from '@/lib/api/services/modules.service';
import { toast } from 'sonner';

export default function ModulesPageTabs() {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleTreeNode | null>(null);

  // Handle module selection
  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  // Handle create module
  const handleCreate = () => {
    setSelectedModule(null);
    setIsCreateDialogOpen(true);
  };

  // Handle edit from tree view
  const handleEdit = (module: ModuleTreeNode) => {
    setSelectedModule(module);
    setIsEditDialogOpen(true);
  };

  // Handle delete from tree view
  const handleDelete = (module: ModuleTreeNode) => {
    setSelectedModule(module);
    setIsDeleteDialogOpen(true);
  };

  // Handle view from tree view
  const handleView = (module: ModuleTreeNode) => {
    setSelectedModule(module);
    setIsViewDialogOpen(true);
  };

  // Handle add child module
  const handleAddChild = (parentModule: ModuleTreeNode) => {
    setSelectedModule(parentModule);
    setIsAddChildDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modules</CardTitle>
              <CardDescription>
                Manage system modules, organize hierarchy, and configure access permissions
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Module
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Tree View
              </TabsTrigger>
            </TabsList>

            {/* List View Tab */}
            <TabsContent value="list" className="space-y-4">
              <ModuleList onModuleSelect={handleModuleSelect} />
            </TabsContent>

            {/* Tree View Tab */}
            <TabsContent value="tree" className="space-y-4">
              <ModuleTree
                onModuleSelect={handleModuleSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onAddChild={handleAddChild}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <ModuleForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              toast.success('Module created successfully');
            }}
            onCancel={() => {
              setIsCreateDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedModule && (
            <ModuleForm
              moduleId={selectedModule.id}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedModule(null);
                toast.success('Module updated successfully');
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedModule(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Child Module Dialog */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedModule && (
            <ModuleForm
              parentId={selectedModule.id}
              onSuccess={() => {
                setIsAddChildDialogOpen(false);
                setSelectedModule(null);
                toast.success('Child module created successfully');
              }}
              onCancel={() => {
                setIsAddChildDialogOpen(false);
                setSelectedModule(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {selectedModule && (
        <ViewModuleDialog
          module={selectedModule}
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
        />
      )}

      {/* Delete Dialog */}
      {selectedModule && (
        <DeleteModuleDialog
          module={selectedModule}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSuccess={() => {
            setIsDeleteDialogOpen(false);
            setSelectedModule(null);
            toast.success('Module deleted successfully');
          }}
        />
      )}
    </>
  );
}
