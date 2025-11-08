"use client";

/**
 * UsersPageTabs Component
 *
 * Main page component for user management.
 * Features:
 * - List view with data table
 * - User selection and navigation to user details
 *
 * Note: Users are automatically created via Clerk authentication sync.
 * Manual user creation is not needed.
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import UsersList from './UsersList';

export default function UsersPageTabs() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>User Assignments</CardTitle>
          <CardDescription>
            Manage user role assignments and direct permissions
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <UsersList onUserSelect={handleUserSelect} />
      </CardContent>
    </Card>
  );
}
