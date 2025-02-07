import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Sofa,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/authStore";
import logo from "../assets/EspacioPimasaLogo-100.webp";
// This is sample data.
const data = {
  teams: [
    {
      name: "Espacio Pisama",
      logo: Sofa,
      plan: "Alquiler de consultorios",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Disponibilidad",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Diaria",
          url: "/calendario",
        },
        {
          title: "Semanal",
          url: "#",
        },
      ],
    },
    {
      title: "Reservas",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Listado",
          url: "/reservas",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Facturación",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Mensual",
          url: "/facturas",
        },
      ],
    },
    {
      title: "Perfil",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/perfil",
        },
      ],
    },
  ],
  // projects: [
  //   {
  //     name: "Design Engineering",
  //     url: "#",
  //     icon: Frame,
  //   },
  //   {
  //     name: "Sales & Marketing",
  //     url: "#",
  //     icon: PieChart,
  //   },
  //   {
  //     name: "Travel",
  //     url: "#",
  //     icon: Map,
  //   },
  // ],
};

export function AppSidebar({ ...props }) {
  const { profile, user } = useAuthStore();
  const userData = {
    name: `${profile.firstName} ${profile.lastName}`,
    email: `${user.email}`,
    avatar: "/avatars/shadcn.jpg",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
