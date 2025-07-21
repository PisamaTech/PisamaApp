import {
  CalendarDays,
  List,
  Wallet,
  UserPlus,
  Settings,
  Calendar1,
  LayoutDashboard,
} from "lucide-react";

export const menuItems = [
  {
    title: "Inicio",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Agenda Diaria",
    url: "/calendario_diario",
    icon: Calendar1,
  },
  {
    title: "Agenda Semanal",
    url: "/calendario_semanal",
    icon: CalendarDays,
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
