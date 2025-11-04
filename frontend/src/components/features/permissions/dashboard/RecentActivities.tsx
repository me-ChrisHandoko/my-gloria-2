/**
 * RecentActivities Component
 * Phase 6: Analytics & Bulk Operations
 *
 * Displays recent permission and role changes in an activity feed format.
 * Shows timestamp, action type, user, and target for each activity.
 *
 * @see docs/PERMISSION_IMPLEMENTATION_PLAN.md - Phase 6
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  UserPlus,
  UserMinus,
  Key,
  Shield,
  Settings,
  Clock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

/**
 * Activity item type
 */
export interface ActivityItem {
  id: string;
  type:
    | 'ROLE_ASSIGNED'
    | 'ROLE_REVOKED'
    | 'PERMISSION_GRANTED'
    | 'PERMISSION_REVOKED'
    | 'ROLE_CREATED'
    | 'ROLE_UPDATED'
    | 'PERMISSION_CREATED'
    | 'PERMISSION_UPDATED';
  user: string;
  target: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  maxHeight?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'ROLE_ASSIGNED':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'ROLE_REVOKED':
      return <UserMinus className="h-4 w-4 text-red-500" />;
    case 'PERMISSION_GRANTED':
      return <Key className="h-4 w-4 text-blue-500" />;
    case 'PERMISSION_REVOKED':
      return <Key className="h-4 w-4 text-orange-500" />;
    case 'ROLE_CREATED':
    case 'ROLE_UPDATED':
      return <Shield className="h-4 w-4 text-purple-500" />;
    case 'PERMISSION_CREATED':
    case 'PERMISSION_UPDATED':
      return <Settings className="h-4 w-4 text-indigo-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get action text for activity type
 */
function getActivityAction(type: ActivityItem['type']): string {
  switch (type) {
    case 'ROLE_ASSIGNED':
      return 'assigned role';
    case 'ROLE_REVOKED':
      return 'revoked role';
    case 'PERMISSION_GRANTED':
      return 'granted permission';
    case 'PERMISSION_REVOKED':
      return 'revoked permission';
    case 'ROLE_CREATED':
      return 'created role';
    case 'ROLE_UPDATED':
      return 'updated role';
    case 'PERMISSION_CREATED':
      return 'created permission';
    case 'PERMISSION_UPDATED':
      return 'updated permission';
    default:
      return 'performed action on';
  }
}

/**
 * Format timestamp relative to now
 */
function formatTimestamp(timestamp: Date | string): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Unknown time';
  }
}

// ============================================================================
// Component
// ============================================================================

export function RecentActivities({
  activities,
  isLoading = false,
  maxHeight = '400px',
}: RecentActivitiesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Latest permission and role changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>
          Latest permission and role changes in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No activities yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Recent permission and role changes will appear here once users
              start interacting with the system.
            </p>
          </div>
        ) : (
          <ScrollArea className="pr-4" style={{ height: maxHeight }}>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  {/* Icon */}
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-muted-foreground">
                        {getActivityAction(activity.type)}
                      </span>{' '}
                      <span className="font-medium truncate inline-block max-w-[200px] align-bottom" title={activity.target}>
                        {activity.target}
                      </span>
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTimestamp(activity.timestamp)}
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
