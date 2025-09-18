'use client';

import React, { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  type: 'single' | 'multiple';
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterGroup[];
  activeFilters: Record<string, string | string[]>;
  onFilterChange: (filters: Record<string, string | string[]>) => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * Production-ready filter bar component for data filtering
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  className
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleFilterChange = (groupKey: string, value: string, type: 'single' | 'multiple') => {
    const newFilters = { ...activeFilters };

    if (type === 'single') {
      if (newFilters[groupKey] === value) {
        delete newFilters[groupKey];
      } else {
        newFilters[groupKey] = value;
      }
    } else {
      const currentValues = (newFilters[groupKey] as string[]) || [];
      if (currentValues.includes(value)) {
        const updatedValues = currentValues.filter(v => v !== value);
        if (updatedValues.length === 0) {
          delete newFilters[groupKey];
        } else {
          newFilters[groupKey] = updatedValues;
        }
      } else {
        newFilters[groupKey] = [...currentValues, value];
      }
    }

    onFilterChange(newFilters);
  };

  const clearFilter = (groupKey: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[groupKey];
    onFilterChange(newFilters);
  };

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).reduce((count, key) => {
      const value = activeFilters[key];
      if (Array.isArray(value)) {
        return count + value.length;
      }
      return count + 1;
    }, 0);
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter groups */}
        {filters.map(group => {
          const activeValue = activeFilters[group.key];
          const isActive = activeValue !== undefined;

          return (
            <DropdownMenu
              key={group.key}
              open={openDropdown === group.key}
              onOpenChange={(open) => setOpenDropdown(open ? group.key : null)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                >
                  <Filter className="h-3 w-3 mr-2" />
                  {group.label}
                  {isActive && (
                    <Badge
                      variant="secondary"
                      className="ml-2 px-1 min-w-[20px] h-5"
                    >
                      {Array.isArray(activeValue) ? activeValue.length : 1}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {group.type === 'single' ? (
                  <>
                    {group.options.map(option => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => handleFilterChange(group.key, option.value, 'single')}
                      >
                        <span className="flex-1">{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-gray-500">({option.count})</span>
                        )}
                        {activeValue === option.value && (
                          <span className="ml-2">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <>
                    {group.options.map(option => {
                      const values = (activeValue as string[]) || [];
                      const isChecked = values.includes(option.value);

                      return (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={isChecked}
                          onCheckedChange={() => handleFilterChange(group.key, option.value, 'multiple')}
                        >
                          <span className="flex-1">{option.label}</span>
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-500">({option.count})</span>
                          )}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </>
                )}
                {isActive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => clearFilter(group.key)}
                      className="text-red-600 dark:text-red-400"
                    >
                      Clear {group.label}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Clear all button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll || (() => onFilterChange({}))}
            className="h-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <X className="h-3 w-3 mr-2" />
            Clear all ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
          {Object.entries(activeFilters).map(([key, value]) => {
            const group = filters.find(f => f.key === key);
            if (!group) return null;

            if (Array.isArray(value)) {
              return value.map(v => {
                const option = group.options.find(o => o.value === v);
                return (
                  <Badge
                    key={`${key}-${v}`}
                    variant="secondary"
                    className="gap-1"
                  >
                    {group.label}: {option?.label || v}
                    <button
                      onClick={() => handleFilterChange(key, v, 'multiple')}
                      className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              });
            } else {
              const option = group.options.find(o => o.value === value);
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="gap-1"
                >
                  {group.label}: {option?.label || value}
                  <button
                    onClick={() => clearFilter(key)}
                    className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

interface QuickFilterProps {
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  className?: string;
}

/**
 * Quick filter pills for common filtering scenarios
 */
export const QuickFilter: React.FC<QuickFilterProps> = ({
  options,
  value,
  onChange,
  label,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}:</span>
      )}
      <div className="flex gap-1">
        <Button
          variant={value === null ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(null)}
          className="h-7"
        >
          All
        </Button>
        {options.map(option => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(option.value)}
            className="h-7"
          >
            {option.label}
            {option.count !== undefined && (
              <Badge
                variant="secondary"
                className="ml-1 px-1 min-w-[20px] h-4"
              >
                {option.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};