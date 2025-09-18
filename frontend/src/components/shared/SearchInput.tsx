'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchInputProps {
  value?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
  showClear?: boolean;
  autoFocus?: boolean;
  onClear?: () => void;
}

/**
 * Production-ready search input with debouncing
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value: controlledValue,
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  loading = false,
  className,
  showClear = true,
  autoFocus = false,
  onClear
}) => {
  const [localValue, setLocalValue] = useState(controlledValue || '');
  const debouncedValue = useDebounce(localValue, debounceMs);

  // Update local value when controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  // Trigger search when debounced value changes
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleClear = () => {
    setLocalValue('');
    if (onClear) {
      onClear();
    } else {
      onSearch('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {!loading && showClear && localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

interface AdvancedSearchProps {
  filters: SearchFilter[];
  onSearch: (filters: Record<string, any>) => void;
  className?: string;
}

interface SearchFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

/**
 * Advanced search component with multiple filters
 */
export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  filters,
  onSearch,
  className
}) => {
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters.forEach(filter => {
      if (filter.defaultValue !== undefined) {
        initial[filter.key] = filter.defaultValue;
      }
    });
    return initial;
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newValues = { ...filterValues, [key]: value };
    setFilterValues(newValues);
  };

  const handleSearch = () => {
    onSearch(filterValues);
  };

  const handleReset = () => {
    const initial: Record<string, any> = {};
    filters.forEach(filter => {
      if (filter.defaultValue !== undefined) {
        initial[filter.key] = filter.defaultValue;
      }
    });
    setFilterValues(initial);
    onSearch(initial);
  };

  const renderFilter = (filter: SearchFilter) => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={filterValues[filter.key] || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
          />
        );
      case 'select':
        return (
          <select
            value={filterValues[filter.key] || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">All</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={filterValues[filter.key] || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={filterValues[filter.key] || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Search className="h-4 w-4 mr-2" />
          Advanced Search
        </Button>
        {isExpanded && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSearch}
            >
              Search
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {filters.map(filter => (
            <div key={filter.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {filter.label}
              </label>
              {renderFilter(filter)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};