import { redirect } from "next/navigation";

export default function ModuleAccessPage() {
  redirect("/permissions/modules?tab=user-access");
}
