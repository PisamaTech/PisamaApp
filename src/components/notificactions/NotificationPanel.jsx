import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "@/stores/notificationStore";
import { useAuthStore } from "@/stores/authStore"; // Importar el store de autenticación
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@radix-ui/react-scroll-area";

dayjs.extend(relativeTime);
dayjs.locale("es");

export const NotificationPanel = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const setNotificationsAsRead = useNotificationStore(
    (state) => state.setNotificationsAsRead
  );
  const setAllNotificationsAsRead = useNotificationStore(
    (state) => state.setAllNotificationsAsRead
  );
  const user = useAuthStore((state) => state.user); // Obtener el usuario actual

  // Ordenar notificaciones: no leídas primero, luego por fecha
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.estado === "pendiente" && b.estado !== "pendiente") return -1;
    if (a.estado !== "pendiente" && b.estado === "pendiente") return 1;
    // Si el estado es el mismo, ordenar por fecha (más nuevas primero)
    return (
      new Date(b.notificaciones.created_at) -
      new Date(a.notificaciones.created_at)
    );
  });

  const navigate = useNavigate();

  const handleNotificationClick = async (notification) => {
    // Si la notificación no ha sido leída, la marcamos como tal
    if (notification.estado === "pendiente") {
      try {
        await markNotificationAsRead(notification.notificacion_id);
        // Actualiza el estado en el store localmente para un feedback instantáneo
        setNotificationsAsRead(notification.notificacion_id);
      } catch (error) {
        console.error("Error al marcar la notificación como leída:", error);
      }
    }
    // Si la notificación tiene un enlace, procesarlo
    if (notification.notificaciones.enlace) {
      const url = notification.notificaciones.enlace;
      // Comprobar si es una URL externa o una ruta interna
      if (url.startsWith("http://") || url.startsWith("https://")) {
        // Es una URL externa, abrir en una nueva pestaña
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        // Es una ruta interna, navegar con react-router
        navigate(url);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter((n) => n.estado === "pendiente")
      .map((n) => n.notificacion_id);

    if (unreadIds.length === 0 || !user) return; // Añadir guarda por si no hay usuario

    try {
      await markAllNotificationsAsRead(user.id); // Pasar el ID del usuario
      // Actualiza todo el estado local
      setAllNotificationsAsRead();
    } catch (error) {
      console.error(
        "Error al marcar todas las notificaciones como leídas:",
        error
      );
    }
  };

  return (
    <div className="w-fit overflow-auto bg-muted rounded-lg shadow-xl border-2">
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold pr-3">Notificaciones</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={
            notifications.filter((n) => n.estado === "pendiente").length === 0
          }
        >
          Marcar todas como leídas
        </Button>
      </div>
      <Separator />

      <ScrollArea className="h-96 overflow-auto">
        <div className="p-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground p-4">Cargando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground p-4">
              No tienes notificaciones.
            </p>
          ) : (
            sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="p-3 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {notification.estado === "pendiente" && (
                    <span className="mt-1.5 block h-2 w-2 rounded-full bg-primary" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p
                      className={`font-semibold ${
                        notification.estado === "pendiente"
                          ? ""
                          : "text-muted-foreground"
                      }`}
                    >
                      {notification.notificaciones.titulo}
                    </p>
                    <p
                      className={`text-sm ${
                        notification.estado === "pendiente"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {notification.notificaciones.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(notification.notificaciones.created_at).fromNow()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
