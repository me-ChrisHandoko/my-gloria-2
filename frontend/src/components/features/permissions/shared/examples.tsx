"use client";

/**
 * Example Usage of Shared Permission Components
 *
 * This file demonstrates how to use each shared component.
 * Can be used for testing or as a reference.
 */

import React, { useState } from "react";
import {
  PermissionBadge,
  RoleBadge,
  TemporalDatePicker,
  HierarchyLevelIndicator,
  HierarchyLevelDots,
} from "./index";

export function PermissionBadgeExamples() {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">PermissionBadge Examples</h3>
      <div className="flex gap-2 flex-wrap">
        <PermissionBadge isGranted={true} isActive={true} />
        <PermissionBadge isGranted={false} />
        <PermissionBadge isGranted={true} isActive={false} />
        <PermissionBadge isExpired={true} />
      </div>
    </div>
  );
}

export function RoleBadgeExamples() {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">RoleBadge Examples</h3>
      <div className="flex gap-2 flex-wrap">
        <RoleBadge isActive={true} hierarchyLevel={0} />
        <RoleBadge isActive={true} hierarchyLevel={3} />
        <RoleBadge isSystem={true} />
        <RoleBadge isActive={false} />
      </div>
    </div>
  );
}

export function TemporalDatePickerExample() {
  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);
  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);

  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">TemporalDatePicker Example</h3>
      <TemporalDatePicker
        effectiveFrom={effectiveFrom}
        effectiveTo={effectiveTo}
        onChange={(from, to) => {
          setEffectiveFrom(from ?? null);
          setEffectiveTo(to ?? null);
        }}
      />
      <div className="text-sm text-gray-600">
        <p>From: {effectiveFrom ? effectiveFrom.toLocaleDateString() : "Not set"}</p>
        <p>To: {effectiveTo ? effectiveTo.toLocaleDateString() : "Not set"}</p>
      </div>
    </div>
  );
}

export function HierarchyLevelIndicatorExamples() {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">HierarchyLevelIndicator Examples</h3>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Level 0 - Foundation</p>
          <HierarchyLevelIndicator level={0} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Level 2 - Senior Management</p>
          <HierarchyLevelIndicator level={2} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Level 5 - Regular Staff</p>
          <HierarchyLevelIndicator level={5} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Level 10 - Guest Access</p>
          <HierarchyLevelIndicator level={10} />
        </div>
      </div>
    </div>
  );
}

export function HierarchyLevelDotsExamples() {
  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">HierarchyLevelDots Examples</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32">Level 0:</span>
          <HierarchyLevelDots level={0} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32">Level 3:</span>
          <HierarchyLevelDots level={3} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32">Level 7:</span>
          <HierarchyLevelDots level={7} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-32">Level 10:</span>
          <HierarchyLevelDots level={10} />
        </div>
      </div>
    </div>
  );
}

/**
 * Combined showcase of all components
 */
export function SharedComponentsShowcase() {
  return (
    <div className="space-y-6 p-8 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Shared Permission Components</h2>
      <PermissionBadgeExamples />
      <RoleBadgeExamples />
      <TemporalDatePickerExample />
      <HierarchyLevelIndicatorExamples />
      <HierarchyLevelDotsExamples />
    </div>
  );
}
