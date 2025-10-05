import { Metadata } from "next";
import UserList from "@/components/features/users/UserList";

export const metadata: Metadata = {
  title: "User Management | Gloria System",
  description: "Manage system users and their permissions in Gloria System",
};

export default function UsersPage() {
  return <UserList />;
}
