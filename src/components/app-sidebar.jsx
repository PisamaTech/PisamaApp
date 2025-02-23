import { Link, useLocation } from "react-router-dom";
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
import { DarkLightMode } from "./Dark-LightMode";
import { menuItems } from "@/utils/menuItems";

export function AppSidebar() {
  const { profile } = useAuthStore();
  const location = useLocation();

  const data = {
    user: {
      name: `${profile.firstName} ${profile.lastName}`,
      email: `${profile.email}`,
      avatar: "/avatars/shadcn.jpg",
    },
  };

  return (
    <Sidebar collapsible="icon">
      <HeaderMenu />
      <SidebarSeparator className="mt-1 mb-2" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        style={{
                          fontWeight: isActive ? "bold" : "normal",
                        }}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DarkLightMode />
      </SidebarFooter>
      <SidebarSeparator className="my-1" />
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
