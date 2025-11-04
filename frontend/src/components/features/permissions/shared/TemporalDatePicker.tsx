"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TemporalDatePickerProps {
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  onChange: (effectiveFrom?: Date | null, effectiveTo?: Date | null) => void;
  disabled?: boolean;
  className?: string;
}

export function TemporalDatePicker({
  effectiveFrom,
  effectiveTo,
  onChange,
  disabled = false,
  className,
}: TemporalDatePickerProps) {
  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    effectiveFrom || undefined
  );
  const [toDate, setToDate] = React.useState<Date | undefined>(
    effectiveTo || undefined
  );
  const [isPermanent, setIsPermanent] = React.useState(
    !effectiveFrom && !effectiveTo
  );

  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    setIsPermanent(false);
    onChange(date || null, toDate || null);
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    setIsPermanent(false);
    onChange(fromDate || null, date || null);
  };

  const handleSetPermanent = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setIsPermanent(true);
    onChange(null, null);
  };

  const handleClearDates = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setIsPermanent(true);
    onChange(null, null);
  };

  // Validate date range
  const isValidRange = !fromDate || !toDate || fromDate <= toDate;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Temporal Settings</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSetPermanent}
          disabled={disabled || isPermanent}
          className="h-7 gap-1 text-xs"
        >
          <Infinity className="h-3 w-3" />
          Set Permanent
        </Button>
      </div>

      {isPermanent ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
          <Infinity className="mx-auto h-6 w-6 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Permanent Assignment</p>
          <p className="text-xs text-gray-500 mt-1">No time restrictions</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {/* Effective From Date */}
          <div className="grid gap-2">
            <label className="text-xs font-medium text-gray-700">
              Effective From
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    "justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromDateChange}
                  disabled={disabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Effective To Date */}
          <div className="grid gap-2">
            <label className="text-xs font-medium text-gray-700">
              Effective To
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    "justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={handleToDateChange}
                  disabled={(date) =>
                    disabled || (fromDate ? date < fromDate : false)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Validation Message */}
          {!isValidRange && (
            <p className="text-xs text-red-600">
              End date must be after start date
            </p>
          )}

          {/* Clear Button */}
          {(fromDate || toDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearDates}
              disabled={disabled}
              className="mt-2 text-xs"
            >
              Clear Dates
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
