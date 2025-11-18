"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export interface ComboboxOption {
  value: string;
  label: string;
  searchLabel?: string;
  disabled?: boolean;
  group?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  renderOption?: (option: ComboboxOption, selected: boolean) => React.ReactNode;
  renderTrigger?: (
    selectedOption: ComboboxOption | undefined
  ) => React.ReactNode;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  className,
  renderOption,
  renderTrigger,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  // Group options by group property
  const groupedOptions = React.useMemo(() => {
    const grouped: Record<string, ComboboxOption[]> = {};
    const ungrouped: ComboboxOption[] = [];

    options.forEach((option) => {
      if (option.group) {
        if (!grouped[option.group]) {
          grouped[option.group] = [];
        }
        grouped[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { grouped, ungrouped };
  }, [options]);

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue;
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
        >
          {renderTrigger ? (
            renderTrigger(selectedOption)
          ) : (
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 popover-content-width-same-as-trigger"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command className="w-full">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>

            {/* Render ungrouped options */}
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.searchLabel || option.label}
                      disabled={option.disabled}
                      onSelect={() =>
                        !option.disabled && handleSelect(option.value)
                      }
                    >
                      {renderOption ? (
                        renderOption(option, isSelected)
                      ) : (
                        <>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Render grouped options */}
            {Object.entries(groupedOptions.grouped).map(
              ([groupName, groupOptions]) => (
                <CommandGroup key={groupName} heading={groupName}>
                  {groupOptions.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.searchLabel || option.label}
                        disabled={option.disabled}
                        onSelect={() =>
                          !option.disabled && handleSelect(option.value)
                        }
                      >
                        {renderOption ? (
                          renderOption(option, isSelected)
                        ) : (
                          <>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
