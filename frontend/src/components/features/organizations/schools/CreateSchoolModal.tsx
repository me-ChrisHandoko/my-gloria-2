"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useCreateSchoolMutation,
  useGetBagianKerjaJenjangListQuery,
  useGetKaryawanNamesListQuery,
} from "@/store/api/schoolApi";
import { Loader2 } from "lucide-react";

interface CreateSchoolModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSchoolModal({
  open,
  onClose,
  onSuccess,
}: CreateSchoolModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    lokasi: "",
    address: "",
    phone: "",
    email: "",
    principal: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createSchool, { isLoading }] = useCreateSchoolMutation();
  const { data: bagianKerjaJenjangList = [], isLoading: isLoadingBagianKerja } =
    useGetBagianKerjaJenjangListQuery();
  const { data: karyawanNamesList = [], isLoading: isLoadingKaryawan } =
    useGetKaryawanNamesListQuery();

  const lokasiOptions = [
    { value: "Barat", label: "Barat", searchLabel: "Barat" },
    { value: "Timur", label: "Timur", searchLabel: "Timur" },
  ];

  const codeOptions = bagianKerjaJenjangList.map((bagian) => ({
    value: bagian,
    label: bagian,
    searchLabel: bagian,
  }));

  const karyawanOptions = karyawanNamesList.map((nama) => ({
    value: nama,
    label: nama,
    searchLabel: nama,
  }));

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    if (!formData.code || formData.code.trim().length < 3) {
      newErrors.code = "Code is required and must be at least 3 characters";
    }

    if (formData.code && formData.code.trim().length > 50) {
      newErrors.code = "Code must not exceed 50 characters";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        name: formData.name.trim(),
        code: formData.code.trim(),
        lokasi: formData.lokasi?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        principal: formData.principal?.trim() || undefined,
      };

      await createSchool(dataToSubmit).unwrap();
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error("Failed to create school:", error);
      toast.error(error?.data?.message || "Failed to create school");
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      code: "",
      lokasi: "",
      address: "",
      phone: "",
      email: "",
      principal: "",
      isActive: true,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>Create New School</DialogTitle>
            <DialogDescription>
              Add a new school to the system. Fill in the required information
              below.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter school name"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">
                Code <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={codeOptions}
                value={formData.code}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    code: value,
                  })
                }
                placeholder={
                  isLoadingBagianKerja
                    ? "Loading codes..."
                    : "Select school code..."
                }
                searchPlaceholder="Search code..."
                emptyMessage="No code found."
                disabled={isLoadingBagianKerja}
                className={errors.code ? "border-red-500" : ""}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
            </div>
            {/* Lokasi */}
            <div className="space-y-2">
              <Label htmlFor="lokasi">Lokasi</Label>
              <Combobox
                options={lokasiOptions}
                value={formData.lokasi}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    lokasi: value,
                  })
                }
                placeholder="Select location..."
                searchPlaceholder="Search location..."
                emptyMessage="No location found."
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Enter school address"
              rows={2}
            />
          </div>

          {/* Phone and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+62 xxx xxxx xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="school@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Principal */}
          <div className="space-y-2">
            <Label htmlFor="principal">Principal / Head of School</Label>
            <Combobox
              options={karyawanOptions}
              value={formData.principal}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  principal: value,
                })
              }
              placeholder={
                isLoadingKaryawan
                  ? "Loading names..."
                  : "Select principal name..."
              }
              searchPlaceholder="Search employee name..."
              emptyMessage="No employee found."
              disabled={isLoadingKaryawan}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Set position as active or inactive
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>
          </div>

          <div className="px-6 pb-6 pt-4 border-t">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create School
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
