import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar user={{ name: session.user.name, email: session.user.email }} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
