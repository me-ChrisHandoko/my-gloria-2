import { redirect } from "next/navigation";

export default function RoleModuleAccessPage() {
  redirect("/permissions/modules?tab=role-access");
}
