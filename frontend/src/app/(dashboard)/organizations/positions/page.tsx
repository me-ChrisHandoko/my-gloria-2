import { Metadata } from "next";
import PositionList from "@/components/features/organizations/positions/PositionList";

export const metadata: Metadata = {
  title: "Position Management | Gloria System",
  description:
    "Manage organizational positions and their assignments in Gloria System",
};

export default function PositionsPage() {
  return <PositionList />;
}
