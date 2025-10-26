import { redirect } from "next/navigation";

export default function ModuleManagementPage() {
  redirect("/permissions/modules?tab=management");
}
