"use client";

import { ColumnDef } from "@tanstack/react-table";
import { School } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SchoolColumnsProps {
  onView: (school: School) => void;
  onEdit: (school: School) => void;
  onDelete: (school: School) => void;
  onViewDepartments?: (school: School) => void;
}

export const createSchoolColumns = ({
  onView,
  onEdit,
  onDelete,
  onViewDepartments,
}: SchoolColumnsProps): ColumnDef<School>[] => [
  {
    accessorKey: "name",
    size: 300,
    minSize: 200,
    maxSize: 600,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          {column.getIsSorted() === "asc" ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div
          className="font-medium max-w-[300px] truncate"
          title={row.getValue("name")}
        >
          {row.getValue("name")}
        </div>
      );
    },
  },
  {
    accessorKey: "code",
    size: 120,
    minSize: 100,
    maxSize: 200,
    header: ({ column }) => {
      return (
        <div className="hidden md:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Code
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const code = row.getValue("code") as string;
      return (
        <div className="hidden md:table-cell">
          <Badge variant="outline">{code}</Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "lokasi",
    size: 120,
    minSize: 80,
    maxSize: 180,
    header: ({ column }) => {
      return (
        <div className="hidden md:table-cell">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Location
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const lokasi = row.getValue("lokasi") as string;
      return (
        <div
          className="hidden lg:table-cell max-w-[150px] truncate"
          title={lokasi}
        >
          {lokasi || "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    size: 90,
    minSize: 80,
    maxSize: 120,
    header: ({ column }) => {
      return (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Status
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <div className="text-center whitespace-nowrap">
          <Badge
            variant={isActive ? "success" : "secondary"}
            className={cn(
              isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : ""
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (value === "all") return true;
      return row.getValue(id) === (value === "active");
    },
  },
  {
    id: "actions",
    size: 70,
    minSize: 60,
    maxSize: 100,
    enableResizing: false,
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const school = row.original;

      return (
        <div className="text-right whitespace-nowrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(school)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(school)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {onViewDepartments && (
                <DropdownMenuItem onClick={() => onViewDepartments(school)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  View Departments
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(school)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
