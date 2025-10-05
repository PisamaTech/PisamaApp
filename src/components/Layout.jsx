import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "./ui";
import { Link, useLocation, Outlet } from "react-router-dom";
import { menuItems } from "@/utils/menuItems";
import { NotificationBell } from "./notificactions/NotificationBell";
import { NotificationPanel } from "./notificactions/NotificationPanel";

function getTitleByURL(url) {
  const item = menuItems.find((item) => item.url === url); // Busca el elemento con la URL específica
  return item ? item.title : ""; // Devuelve el título si se encuentra o sino un string vacío.
}

export default function Layout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 sticky top-0 bg-background z-10 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">Inicio</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {getTitleByURL(location.pathname) === "Inicio"
                      ? ""
                      : getTitleByURL(location.pathname)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <Popover>
              <PopoverTrigger asChild>
                {/* La campana es el botón que abre el Popover */}
                <NotificationBell />
              </PopoverTrigger>
              <PopoverContent className="p-0 border-none" align="end">
                {/* El panel es el contenido que se muestra */}
                <NotificationPanel />
              </PopoverContent>
            </Popover>
          </div>
        </header>
        <div
          className="relative flex flex-1 flex-col bg-background overflow-auto"
          style={{ height: "calc(100vh - 48px)" }}
        >
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
