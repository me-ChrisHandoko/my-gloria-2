/**
 * State Inspector Utilities
 * Advanced debugging helpers for Redux state inspection
 */

import type { RootState } from '../index';
import { Store } from '@reduxjs/toolkit';

/**
 * State inspection result
 */
export interface InspectionResult {
  path: string;
  value: any;
  type: string;
  size: number;
  depth: number;
  isCircular: boolean;
  metadata?: Record<string, any>;
}

/**
 * State validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  expected?: any;
  actual?: any;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * State Inspector class
 */
export class StateInspector {
  private store: Store<RootState> | null = null;
  private circularRefs = new WeakSet();

  constructor(store?: Store<RootState>) {
    if (store) {
      this.store = store;
    }
  }

  /**
   * Set the store
   */
  public setStore(store: Store<RootState>): void {
    this.store = store;
  }

  /**
   * Get current state
   */
  private getState(): RootState | null {
    return this.store ? this.store.getState() : null;
  }

  /**
   * Inspect state at path
   */
  public inspect(path: string): InspectionResult | null {
    const state = this.getState();
    if (!state) return null;

    const pathArray = this.parsePath(path);
    const value = this.getValueAtPath(state, pathArray);

    if (value === undefined) {
      return null;
    }

    return {
      path,
      value,
      type: this.getType(value),
      size: this.getSize(value),
      depth: this.getDepth(value),
      isCircular: this.hasCircularReference(value),
      metadata: this.getMetadata(value),
    };
  }

  /**
   * Find paths matching a pattern
   */
  public find(pattern: string | RegExp): string[] {
    const state = this.getState();
    if (!state) return [];

    const paths: string[] = [];
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;

    this.traverseState(state, '', (path, value) => {
      if (regex.test(path)) {
        paths.push(path);
      }

      // Also search in string values
      if (typeof value === 'string' && regex.test(value)) {
        paths.push(`${path} (value match)`);
      }
    });

    return paths;
  }

  /**
   * Validate state structure
   */
  public validate(schema?: any): ValidationResult {
    const state = this.getState();
    if (!state) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'State is null or undefined' }],
        warnings: [],
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for required slices
    const requiredSlices = ['auth', 'ui', 'preferences', 'notification', 'workflow'];
    requiredSlices.forEach((slice) => {
      if (!(slice in state)) {
        errors.push({
          path: slice,
          message: `Required slice "${slice}" is missing`,
        });
      }
    });

    // Check for circular references
    this.traverseState(state, '', (path, value) => {
      if (this.hasCircularReference(value)) {
        warnings.push({
          path,
          message: 'Circular reference detected',
          suggestion: 'Consider using normalization or IDs instead of nested references',
        });
      }

      // Check for oversized objects
      const size = this.getSize(value);
      if (size > 100000) {
        // 100KB
        warnings.push({
          path,
          message: `Large object detected (${(size / 1024).toFixed(2)}KB)`,
          suggestion: 'Consider splitting or paginating this data',
        });
      }

      // Check for deep nesting
      const depth = this.getDepth(value);
      if (depth > 10) {
        warnings.push({
          path,
          message: `Deep nesting detected (depth: ${depth})`,
          suggestion: 'Consider flattening the structure',
        });
      }
    });

    // Custom schema validation if provided
    if (schema) {
      this.validateAgainstSchema(state, schema, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compare two states
   */
  public compare(state1: RootState, state2: RootState): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    const paths1 = new Set<string>();
    const paths2 = new Set<string>();

    // Collect all paths from state1
    this.traverseState(state1, '', (path) => {
      paths1.add(path);
    });

    // Collect all paths from state2
    this.traverseState(state2, '', (path) => {
      paths2.add(path);
    });

    // Find added and modified
    paths2.forEach((path) => {
      if (!paths1.has(path)) {
        added.push(path);
      } else {
        const value1 = this.getValueAtPath(state1, this.parsePath(path));
        const value2 = this.getValueAtPath(state2, this.parsePath(path));
        if (!this.deepEqual(value1, value2)) {
          modified.push(path);
        }
      }
    });

    // Find removed
    paths1.forEach((path) => {
      if (!paths2.has(path)) {
        removed.push(path);
      }
    });

    return { added, removed, modified };
  }

  /**
   * Get state statistics
   */
  public getStatistics(): {
    totalSize: number;
    sliceCount: number;
    totalKeys: number;
    maxDepth: number;
    slices: Array<{ name: string; size: number; keys: number }>;
  } {
    const state = this.getState();
    if (!state) {
      return {
        totalSize: 0,
        sliceCount: 0,
        totalKeys: 0,
        maxDepth: 0,
        slices: [],
      };
    }

    let totalKeys = 0;
    let maxDepth = 0;
    const slices: Array<{ name: string; size: number; keys: number }> = [];

    Object.entries(state).forEach(([name, value]) => {
      const size = this.getSize(value);
      const keys = this.countKeys(value);
      const depth = this.getDepth(value);

      slices.push({ name, size, keys });
      totalKeys += keys;
      maxDepth = Math.max(maxDepth, depth);
    });

    return {
      totalSize: this.getSize(state),
      sliceCount: Object.keys(state).length,
      totalKeys,
      maxDepth,
      slices: slices.sort((a, b) => b.size - a.size),
    };
  }

  /**
   * Create a state query function
   */
  public query(queryFn: (state: RootState) => any): any {
    const state = this.getState();
    if (!state) return undefined;

    try {
      return queryFn(state);
    } catch (error) {
      console.error('Query execution failed:', error);
      return undefined;
    }
  }

  /**
   * Watch for specific changes
   */
  public watchPath(
    path: string,
    callback: (newValue: any, oldValue: any) => void
  ): () => void {
    let previousValue = this.getValueAtPath(this.getState(), this.parsePath(path));

    const unsubscribe = this.store?.subscribe(() => {
      const currentValue = this.getValueAtPath(this.getState(), this.parsePath(path));
      if (!this.deepEqual(previousValue, currentValue)) {
        callback(currentValue, previousValue);
        previousValue = currentValue;
      }
    });

    return unsubscribe || (() => {});
  }

  // Helper methods

  private parsePath(path: string): string[] {
    return path.split('.').filter(Boolean);
  }

  private getValueAtPath(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  private getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private getSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  private getDepth(value: any, currentDepth = 0, maxDepth = 50): number {
    if (currentDepth >= maxDepth) return maxDepth;
    if (value === null || value === undefined) return currentDepth;
    if (typeof value !== 'object') return currentDepth;

    let maxChildDepth = currentDepth;

    if (Array.isArray(value)) {
      for (const item of value) {
        maxChildDepth = Math.max(
          maxChildDepth,
          this.getDepth(item, currentDepth + 1, maxDepth)
        );
      }
    } else {
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          maxChildDepth = Math.max(
            maxChildDepth,
            this.getDepth(value[key], currentDepth + 1, maxDepth)
          );
        }
      }
    }

    return maxChildDepth;
  }

  private hasCircularReference(obj: any): boolean {
    try {
      JSON.stringify(obj);
      return false;
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('circular')) {
        return true;
      }
      return false;
    }
  }

  private getMetadata(value: any): Record<string, any> {
    const metadata: Record<string, any> = {};

    if (Array.isArray(value)) {
      metadata.length = value.length;
      metadata.isEmpty = value.length === 0;
    } else if (typeof value === 'object' && value !== null) {
      metadata.keys = Object.keys(value).length;
      metadata.hasPrototype = Object.getPrototypeOf(value) !== Object.prototype;
      metadata.constructorName = value.constructor?.name;
    } else if (typeof value === 'string') {
      metadata.length = value.length;
      metadata.isEmpty = value.length === 0;
    }

    return metadata;
  }

  private traverseState(
    obj: any,
    currentPath: string,
    callback: (path: string, value: any) => void,
    visited = new WeakSet()
  ): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj !== 'object') {
      callback(currentPath, obj);
      return;
    }

    if (visited.has(obj)) return;
    visited.add(obj);

    callback(currentPath, obj);

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        this.traverseState(item, path, callback, visited);
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const path = currentPath ? `${currentPath}.${key}` : key;
        this.traverseState(value, path, callback, visited);
      });
    }
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  private countKeys(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj !== 'object') return 0;

    let count = 0;
    const visited = new WeakSet();

    const traverse = (current: any): void => {
      if (current === null || current === undefined) return;
      if (typeof current !== 'object') return;
      if (visited.has(current)) return;

      visited.add(current);

      if (Array.isArray(current)) {
        count += current.length;
        current.forEach(traverse);
      } else {
        const keys = Object.keys(current);
        count += keys.length;
        keys.forEach((key) => traverse(current[key]));
      }
    };

    traverse(obj);
    return count;
  }

  private validateAgainstSchema(
    obj: any,
    schema: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path = ''
  ): void {
    // Basic schema validation implementation
    // This can be extended with more sophisticated validation libraries
    if (schema.type) {
      const actualType = this.getType(obj);
      if (actualType !== schema.type) {
        errors.push({
          path,
          message: `Type mismatch`,
          expected: schema.type,
          actual: actualType,
        });
      }
    }

    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((key: string) => {
        if (!(key in obj)) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: `Required field is missing`,
          });
        }
      });
    }

    if (schema.properties && typeof obj === 'object' && obj !== null) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (key in obj) {
          this.validateAgainstSchema(
            obj[key],
            propSchema,
            errors,
            warnings,
            path ? `${path}.${key}` : key
          );
        }
      });
    }
  }
}

/**
 * Create a singleton state inspector instance
 */
let stateInspectorInstance: StateInspector | null = null;

export const getStateInspector = (store?: Store<RootState>): StateInspector => {
  if (!stateInspectorInstance) {
    stateInspectorInstance = new StateInspector(store);
  } else if (store) {
    stateInspectorInstance.setStore(store);
  }
  return stateInspectorInstance;
};