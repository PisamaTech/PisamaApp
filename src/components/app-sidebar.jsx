import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { HeaderMenu } from "./HeaderMenu";
import { useAuthStore } from "@/stores/authStore";
import { menuItems } from "@/utils/menuItems";

export function AppSidebar() {
  const { profile } = useAuthStore();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState(true); // Default to open

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
              {menuItems
                .filter((item) => {
                  if (item.title === "Administrador") {
                    return profile.role === "admin";
                  }
                  return true;
                })
                .map((item) => {
                  if (item.subItems) {
                    const isParentActive = item.subItems.some(
                      (sub) => location.pathname === sub.url
                    );
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => setOpenSubmenu(!openSubmenu)}
                          isActive={isParentActive}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        {openSubmenu && (
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => {
                              const isSubActive =
                                location.pathname === subItem.url;
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isSubActive}
                                  >
                                    <Link to={subItem.url}>
                                      <subItem.icon />
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    );
                  }

                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.url}>
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
      <SidebarSeparator className="my-1" />
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
