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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useUpdateSchoolMutation,
  useGetBagianKerjaJenjangListQuery,
} from "@/store/api/schoolApi";
import { School } from "@/types";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [lokasiOpen, setLokasiOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const [updateSchool, { isLoading }] = useUpdateSchoolMutation();
  const { data: bagianKerjaJenjangList = [], isLoading: isLoadingBagianKerja } =
    useGetBagianKerjaJenjangListQuery();

  const lokasiOptions = [
    { value: "Barat", label: "Barat" },
    { value: "Timur", label: "Timur" },
  ];

  const codeOptions = bagianKerjaJenjangList.map((bagian) => ({
    value: bagian,
    label: bagian,
  }));

  // Populate form when school changes
  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || "",
        code: school.code || "",
        lokasi: school.lokasi || "",
        address: school.address || "",
        phone: school.phone || "",
        email: school.email || "",
        principal: school.principal || "",
        isActive: school.isActive ?? true,
      });
    }
  }, [school]);

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
              <Popover open={codeOpen} onOpenChange={setCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={codeOpen}
                    className={cn(
                      "w-full justify-between",
                      errors.code ? "border-red-500" : ""
                    )}
                    disabled={isLoadingBagianKerja}
                  >
                    {isLoadingBagianKerja ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : formData.code ? (
                      codeOptions.find(
                        (option) => option.value === formData.code
                      )?.label
                    ) : (
                      "Select school code..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command className="max-h-[300px]">
                    <CommandInput placeholder="Search code..." />
                    <CommandList>
                      <CommandEmpty>No code found.</CommandEmpty>
                      <CommandGroup>
                        {codeOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setFormData({
                                ...formData,
                                code:
                                  currentValue === formData.code
                                    ? ""
                                    : currentValue,
                              });
                              setCodeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.code === option.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
            </div>

            {/* Lokasi */}
            <div className="space-y-2">
              <Label htmlFor="lokasi">Lokasi</Label>
              <Popover open={lokasiOpen} onOpenChange={setLokasiOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={lokasiOpen}
                    className="w-full justify-between"
                  >
                    {formData.lokasi
                      ? lokasiOptions.find(
                          (option) => option.value === formData.lokasi
                        )?.label
                      : "Select location..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search location..." />
                    <CommandList>
                      <CommandEmpty>No location found.</CommandEmpty>
                      <CommandGroup>
                        {lokasiOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setFormData({
                                ...formData,
                                lokasi:
                                  currentValue === formData.lokasi
                                    ? ""
                                    : currentValue,
                              });
                              setLokasiOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.lokasi === option.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
            <Input
              id="principal"
              value={formData.principal}
              onChange={(e) =>
                setFormData({ ...formData, principal: e.target.value })
              }
              placeholder="Enter principal name (e.g., Dr. John Doe)"
              maxLength={200}
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
