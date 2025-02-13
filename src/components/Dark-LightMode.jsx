import { Moon, Sun } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Tabs,
  TabsList,
  TabsTrigger,
} from "./ui";
import { Link } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";

export const DarkLightMode = () => {
  const { theme, setTheme } = useUIStore();
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem key="1">
          <SidebarMenuButton asChild onClick={setTheme}>
            <Link to={"/"}>
              {theme === "light" ? (
                <>
                  <Sun strokeWidth={2.5} /> <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon strokeWidth={2.5} /> <span>Modo Oscuro</span>
                </>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
};
