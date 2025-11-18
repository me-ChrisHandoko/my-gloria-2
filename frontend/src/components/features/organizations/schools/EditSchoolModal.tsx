"use client";

import React, { useState, useEffect } from "react";
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
  useUpdateSchoolMutation,
  useGetBagianKerjaJenjangListQuery,
  useGetKaryawanNamesListQuery,
} from "@/store/api/schoolApi";
import { School } from "@/types";
import { Loader2 } from "lucide-react";
import { logRTKError } from "@/lib/utils/errorLogger";

interface EditSchoolModalProps {
  open: boolean;
  school: School;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSchoolModal({
  open,
  school,
  onClose,
  onSuccess,
}: EditSchoolModalProps) {
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

  const [updateSchool, { isLoading }] = useUpdateSchoolMutation();
  const { data: bagianKerjaJenjangList = [], isLoading: isLoadingBagianKerja } =
    useGetBagianKerjaJenjangListQuery();
  const { data: karyawanNamesList = [], isLoading: isLoadingKaryawan } =
    useGetKaryawanNamesListQuery();

  const lokasiOptions = React.useMemo(
    () => [
      { value: "Barat", label: "Barat", searchLabel: "Barat" },
      { value: "Timur", label: "Timur", searchLabel: "Timur" },
    ],
    []
  );

  const codeOptions = React.useMemo(
    () =>
      bagianKerjaJenjangList.map((bagian) => ({
        value: bagian,
        label: bagian,
        searchLabel: bagian,
      })),
    [bagianKerjaJenjangList]
  );

  const karyawanOptions = React.useMemo(
    () =>
      karyawanNamesList.map((nama) => ({
        value: nama,
        label: nama,
        searchLabel: nama,
      })),
    [karyawanNamesList]
  );

  // Helper function for case-insensitive value matching
  // Fixes issue where DB has lowercase values but API returns uppercase
  const findMatchingValue = (
    dbValue: string | undefined,
    options: { value: string; label: string; searchLabel?: string }[]
  ): string => {
    if (!dbValue) return "";

    // Find option case-insensitively
    const match = options.find(
      (opt) => opt.value.toLowerCase() === dbValue.toLowerCase()
    );

    // Return matched option's value (correct case) or original value
    return match ? match.value : dbValue;
  };

  // Populate form when school changes
  // Wait for all API data to load before populating to avoid race conditions
  useEffect(() => {
    if (school && !isLoadingBagianKerja && !isLoadingKaryawan) {
      setFormData({
        name: school.name || "",
        code: findMatchingValue(school.code, codeOptions),
        lokasi: findMatchingValue(school.lokasi, lokasiOptions),
        address: school.address || "",
        phone: school.phone || "",
        email: school.email || "",
        principal: findMatchingValue(school.principal, karyawanOptions),
        isActive: school.isActive ?? true,
      });
    }
  }, [school, codeOptions, karyawanOptions, lokasiOptions, isLoadingBagianKerja, isLoadingKaryawan]);

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
        name: formData.name.trim(),
        code: formData.code.trim(),
        lokasi: formData.lokasi?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        principal: formData.principal?.trim() || undefined,
        isActive: formData.isActive,
      };

      await updateSchool({ id: school.id, data: dataToSubmit }).unwrap();
      handleClose();
      onSuccess();
    } catch (error: any) {
      logRTKError("Failed to update school", error);
      toast.error(error?.data?.message || "Failed to update school");
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
          <DialogDescription>
            Update the school information. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update School
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
