"use client";

/**
 * TemporalDatePickerAdapter Component
 *
 * Adapter component that wraps the shared TemporalDatePicker to provide
 * a simpler API with separate onChange handlers for effectiveFrom and effectiveTo.
 *
 * This adapter allows using the shared component without modifying it,
 * while providing a more intuitive API for assignment dialogs.
 */

import React from 'react';
import { TemporalDatePicker } from '../shared';

interface TemporalDatePickerAdapterProps {
  effectiveFrom?: Date;
  effectiveTo?: Date;
  onEffectiveFromChange: (date?: Date) => void;
  onEffectiveToChange: (date?: Date) => void;
  disabled?: boolean;
  className?: string;
}

export default function TemporalDatePickerAdapter({
  effectiveFrom,
  effectiveTo,
  onEffectiveFromChange,
  onEffectiveToChange,
  disabled,
  className,
}: TemporalDatePickerAdapterProps) {
  const handleChange = (from?: Date | null, to?: Date | null) => {
    // Convert null to undefined for consistency
    onEffectiveFromChange(from === null ? undefined : from);
    onEffectiveToChange(to === null ? undefined : to);
  };

  return (
    <TemporalDatePicker
      effectiveFrom={effectiveFrom || null}
      effectiveTo={effectiveTo || null}
      onChange={handleChange}
      disabled={disabled}
      className={className}
    />
  );
}
