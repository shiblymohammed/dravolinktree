import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readDatabase } from "@/lib/store";
import { AdminDashboard } from "@/components/admin-dashboard";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  if (!await isAuthenticated()) redirect("/admin/login");
  return <AdminDashboard initialData={await readDatabase()} />;
}
