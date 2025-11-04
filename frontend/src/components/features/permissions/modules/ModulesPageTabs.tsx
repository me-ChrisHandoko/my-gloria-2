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
import { List, FolderTree } from 'lucide-react';
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleTreeNode | null>(null);

  // Handle module selection
  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modules Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage system modules, organize hierarchy, and configure access permissions
        </p>
      </div>

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
    </div>
  );
}
