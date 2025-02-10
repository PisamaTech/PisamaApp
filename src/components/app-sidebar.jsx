import { Link } from "react-router-dom";

import { Calendar, List, Wallet, UserPlus, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { NavUser } from "./nav-user";
import { HeaderMenu } from "./HeaderMenu";

import { useAuthStore } from "@/stores/authStore";

// Menu items.
const items = [
  {
    title: "Disponibilidad",
    url: "/calendario",
    icon: Calendar,
  },
  {
    title: "Reservas",
    url: "/reservas",
    icon: List,
  },
  {
    title: "Facturas",
    url: "/facturas",
    icon: Wallet,
  },
  {
    title: "Perfil",
    url: "/perfil",
    icon: Settings,
  },
  {
    title: "Administrador",
    url: "/admin",
    icon: UserPlus,
  },
];

export function AppSidebar() {
  const { profile, user } = useAuthStore();

  const data = {
    user: {
      name: `${profile.firstName} ${profile.lastName}`,
      email: `${user.email}`,
      avatar: "/avatars/shadcn.jpg",
    },
  };

  return (
    <Sidebar collapsible="icon">
      {/* <img src={logoPisama} alt="Pisama" className="max-w-16" /> */}
      <HeaderMenu />
      <SidebarSeparator className="mt-1 mb-2" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="my-1" />
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
