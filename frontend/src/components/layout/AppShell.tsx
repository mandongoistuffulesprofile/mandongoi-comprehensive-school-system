import { Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";
import { BreadcrumbOverrideProvider } from "../../contexts/BreadcrumbContext";
import { ToastContainer } from "../ui/Toast";

export function AppShell() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <BreadcrumbOverrideProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar role={user.role} />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Breadcrumbs />
              <Outlet />
            </div>
          </main>
        </div>
        <ToastContainer />
      </div>
    </BreadcrumbOverrideProvider>
  );
}
