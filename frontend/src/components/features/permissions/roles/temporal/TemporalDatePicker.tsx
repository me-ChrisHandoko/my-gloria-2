"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TemporalDatePickerProps {
  value?: string;
  onChange: (date: string | undefined) => void;
  disabled?: boolean;
  clearable?: boolean;
}

export default function TemporalDatePicker({
  value,
  onChange,
  disabled = false,
  clearable = false,
}: TemporalDatePickerProps) {
  const handleClear = () => {
    onChange(undefined);
  };

  // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
  const formatValue = (isoString?: string) => {
    if (!isoString) return "";
    return isoString.slice(0, 16); // Remove seconds and timezone
  };

  // Convert datetime-local format to ISO string
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      onChange(undefined);
      return;
    }
    onChange(new Date(e.target.value).toISOString());
  };

  return (
    <div className="relative">
      <Input
        type="datetime-local"
        value={formatValue(value)}
        onChange={handleChange}
        disabled={disabled}
        className="pr-10"
      />
      {clearable && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
