"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { School } from "@/types";
import { X, Building2, Mail, Phone, Globe, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ViewSchoolModalProps {
  open: boolean;
  school: School;
  onClose: () => void;
}

export default function ViewSchoolModal({
  open,
  school,
  onClose,
}: ViewSchoolModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{school.name}</DialogTitle>
              <DialogDescription>School Details</DialogDescription>
            </div>
            <Badge
              variant={school.isActive ? "success" : "secondary"}
              className={
                school.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                  : ""
              }
            >
              {school.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">School Name</p>
                <p className="font-medium">{school.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Code</p>
                <p className="font-medium">{school.code}</p>
              </div>
              {school.lokasi && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lokasi</p>
                  <p className="mt-1 text-gray-700 dark:text-gray-300">
                    {school.lokasi}
                  </p>
                </div>
              )}
              {school.principal && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Principal</p>
                  <p className="mt-1 text-gray-700 dark:text-gray-300">
                    {school.principal}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          {(school.address || school.phone || school.email) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contact Information</h3>
              <div className="space-y-3">
                {school.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-gray-700 dark:text-gray-300">{school.address}</p>
                    </div>
                  </div>
                )}
                {school.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <a
                        href={`tel:${school.phone}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {school.phone}
                      </a>
                    </div>
                  </div>
                )}
                {school.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <a
                        href={`mailto:${school.email}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {school.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created At</p>
                <p className="font-medium">
                  {format(new Date(school.createdAt), "PPP")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(school.updatedAt), "PPP")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
