import {
  CalendarDays,
  List,
  Wallet,
  UserPlus,
  Settings,
  Calendar1,
} from "lucide-react";

export const menuItems = [
  {
    title: "Agenda Diaria",
    url: "/calendario_semanal",
    icon: Calendar1,
  },
  {
    title: "Agenda Semanal",
    url: "/calendario_diario",
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
