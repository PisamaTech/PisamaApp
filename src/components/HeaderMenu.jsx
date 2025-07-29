import { Sofa } from "lucide-react";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui";
import { Link } from "react-router-dom";
import pisamaLogo from "@/assets/EspacioPimasaLogo-300.webp";

export const HeaderMenu = () => {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link to="/calendario">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                {/* <Sofa className="size-5" /> */}
                <img
                  src={pisamaLogo}
                  alt="Espacio Pisama Logo"
                  className="w-8 h-8 drop-shadow-md hover:drop-shadow-xl"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-semibold">Espacio Pisama</span>
                <span className="truncate text-xs">
                  Alquiler de consultorios
                </span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};
