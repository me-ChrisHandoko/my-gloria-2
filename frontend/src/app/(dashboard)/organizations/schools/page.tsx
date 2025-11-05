import { Metadata } from "next";
import SchoolList from "@/components/features/organizations/schools/SchoolList";

export const metadata: Metadata = {
  title: "School Management | Gloria System",
  description: "Manage schools and their information in Gloria System",
};

export default function SchoolsPage() {
  return <SchoolList />;
}
