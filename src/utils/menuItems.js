import {
  Bell,
  CalendarDays,
  List,
  Wallet,
  UserPlus,
  Settings,
  Calendar as CalendarIcon, // Renombrado para evitar conflicto
  LayoutDashboard,
  MessageCircleQuestion,
  Users,
  DollarSign,
  Send,
  TrendingUp,
  CreditCard,
  Scale,
  CalendarClock,
  KeyRound,
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
    icon: CalendarIcon,
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
    title: "Facturación",
    url: "/facturas",
    icon: Wallet,
  },
  {
    title: "Notificaciones",
    url: "/notificaciones",
    icon: Bell,
  },
  {
    title: "Mis Accesos",
    url: "/mis-accesos",
    icon: KeyRound,
  },
  {
    title: "Perfil",
    url: "/perfil",
    icon: Settings,
  },
  {
    title: "Ayuda",
    url: "/ayuda",
    icon: MessageCircleQuestion,
  },
  {
    title: "Administrador",
    icon: UserPlus,
    subItems: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Rendimiento",
        url: "/admin/performance",
        icon: TrendingUp,
      },
      {
        title: "Usuarios",
        url: "/admin/user-management",
        icon: Users,
      },
      {
        title: "Reservas",
        url: "/admin/reservations-management",
        icon: CalendarIcon,
      },
      {
        title: "Facturación",
        url: "/admin/billing-management",
        icon: Wallet,
      },
      {
        title: "Pagos",
        url: "/admin/payment-management",
        icon: CreditCard,
      },
      {
        title: "Saldos",
        url: "/admin/balance-summary",
        icon: Scale,
      },
      {
        title: "Vencimientos",
        url: "/admin/expiring-reservations",
        icon: CalendarClock,
      },
      {
        title: "Precios",
        url: "/admin/pricing-management",
        icon: DollarSign,
      },
      {
        title: "Comunicación",
        url: "/admin/broadcast",
        icon: Send,
      },
      {
        title: "Control Acceso",
        url: "/admin/access-control",
        icon: KeyRound,
      },
    ],
  },
];
