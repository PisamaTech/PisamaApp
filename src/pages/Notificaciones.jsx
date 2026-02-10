import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import {
  fetchAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from "@/components/ui";
import { Bell, CheckCheck, Inbox } from "lucide-react";

dayjs.extend(relativeTime);
dayjs.locale("es");

export const Notificaciones = () => {
  const { profile } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const setNotificationsAsRead = useNotificationStore(
    (state) => state.setNotificationsAsRead,
  );
  const setAllNotificationsAsRead = useNotificationStore(
    (state) => state.setAllNotificationsAsRead,
  );

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.id) return;
      setIsLoading(true);
      try {
        const data = await fetchAllNotifications(profile.id);
        setNotifications(data);
      } catch (error) {
        console.error("Error cargando notificaciones:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [profile?.id]);

  // Ordenar: no leídas primero, luego por fecha
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.estado === "pendiente" && b.estado !== "pendiente") return -1;
    if (a.estado !== "pendiente" && b.estado === "pendiente") return 1;
    return (
      new Date(b.notificaciones.created_at) -
      new Date(a.notificaciones.created_at)
    );
  });

  const unreadCount = notifications.filter(
    (n) => n.estado === "pendiente",
  ).length;

  const handleNotificationClick = async (notification) => {
    if (notification.estado === "pendiente") {
      try {
        await markNotificationAsRead(notification.notificacion_id);
        // Actualizar estado local de la página
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, estado: "leido" } : n,
          ),
        );
        // Actualizar el store global (para la campana)
        setNotificationsAsRead(notification.notificacion_id);
      } catch (error) {
        console.error("Error al marcar la notificación como leída:", error);
      }
    }

    if (notification.notificaciones.enlace) {
      const url = notification.notificaciones.enlace;
      if (url.startsWith("http://") || url.startsWith("https://")) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        navigate(url);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || !user) return;
    try {
      await markAllNotificationsAsRead(user.id);
      // Actualizar estado local
      setNotifications((prev) => prev.map((n) => ({ ...n, estado: "leido" })));
      // Actualizar store global
      setAllNotificationsAsRead();
    } catch (error) {
      console.error(
        "Error al marcar todas las notificaciones como leídas:",
        error,
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            Notificaciones
          </h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} sin leer
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          className="gap-2 w-full sm:w-auto"
        >
          <CheckCheck className="h-4 w-4" />
          Marcar todas como leídas
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No tienes notificaciones</p>
              <p className="text-sm">
                Cuando recibas notificaciones, aparecerán aquí.
              </p>
            </div>
          ) : (
            <div>
              {sortedNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      notification.estado === "pendiente" ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 flex-shrink-0">
                        {notification.estado === "pendiente" ? (
                          <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
                        ) : (
                          <span className="block h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`font-semibold ${
                              notification.estado === "pendiente"
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {notification.notificaciones.titulo}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {dayjs(
                              notification.notificaciones.created_at,
                            ).fromNow()}
                          </span>
                        </div>
                        <p
                          className={`text-sm ${
                            notification.estado === "pendiente"
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.notificaciones.mensaje}
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < sortedNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notificaciones;
