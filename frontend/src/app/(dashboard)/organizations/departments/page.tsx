import { Metadata } from "next";
import DepartmentList from "@/components/features/organizations/departments/DepartmentList";

export const metadata: Metadata = {
  title: "Department Management | Gloria System",
  description:
    "Manage organizational departments and their hierarchy in Gloria System",
};

export default function DepartmentsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <DepartmentList />
    </div>
  );
}
