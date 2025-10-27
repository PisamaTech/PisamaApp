import { create } from "zustand";
import { supabase } from "@/supabase/supabase.config";

// Variable para mantener la referencia a la suscripción de Supabase
let subscription = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [], // Array para almacenar las notificaciones In-App
  unreadCount: 0, // Conteo de notificaciones no leídas
  isLoading: true, // Estado para la carga inicial

  /**
   * Obtiene las notificaciones iniciales y se suscribe a los cambios en tiempo real.
   * Debe ser llamado cuando el usuario inicia sesión.
   */
  initialize: async (userId) => {
    if (!userId) return;

    set({ isLoading: true });

    try {
      // 1. Carga inicial de notificaciones
      const { data, error } = await supabase
        .from("cola_envios")
        .select(
          `
                  id,
                  estado,
                  notificacion_id,
                  notificaciones:notificaciones!inner (
                    id,
                    titulo,
                    mensaje,
                    enlace,
                    created_at
                  )
                `
        )
        .eq("canal", "in-app")
        .eq("notificaciones.usuario_id", userId) // Filtrar por usuario en la tabla relacionada
        .order("created_at", {
          ascending: false,
        })
        .limit(10); // Cargar las últimas 10 para empezar

      if (error) throw error;

      const notifications = data || [];
      const unreadCount = notifications.filter(
        (n) => n.estado === "pendiente"
      ).length;

      set({ notifications, unreadCount, isLoading: false });

      // 2. Suscripción a cambios en tiempo real
      // Si ya hay una suscripción, la eliminamos primero para evitar duplicados
      if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
      }

      subscription = supabase
        .channel(`cola_envios_user_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT", // Escuchar solo nuevas inserciones
            schema: "public",
            table: "cola_envios",
            // filter: `canal=eq.in-app`, // Filtrar por canal
          },
          async (payload) => {
            // La notificación es para el usuario actual?
            // Necesitamos hacer una consulta rápida para obtener el usuario_id de la notificación principal.
            const { data: newNotificationDetails, error } = await supabase
              .from("notificaciones")
              .select("usuario_id, titulo, mensaje, enlace, created_at")
              .eq("id", payload.new.notificacion_id)
              .single();

            if (
              error ||
              !newNotificationDetails ||
              newNotificationDetails.usuario_id !== userId
            ) {
              return;
            }

            // Construir el objeto de notificación como lo esperamos en el estado
            const newFullNotification = {
              id: payload.new.id,
              estado: payload.new.estado,
              notificacion_id: payload.new.notificacion_id,
              notificaciones: {
                id: payload.new.notificacion_id,
                usuario_id: newNotificationDetails.usuario_id,
                titulo: newNotificationDetails.titulo,
                mensaje: newNotificationDetails.mensaje,
                enlace: newNotificationDetails.enlace,
                created_at: newNotificationDetails.created_at,
              },
            };

            // Añadir la nueva notificación al principio de la lista y actualizar el contador
            set((state) => ({
              notifications: [newFullNotification, ...state.notifications],
              unreadCount: state.unreadCount + 1,
            }));
          }
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR") {
            console.error("Error en el canal de notificaciones:", err);
          }
          if (status === "TIMED_OUT") {
            console.warn(
              "Se agotó el tiempo de espera para conectar al canal de notificaciones."
            );
          }
        });
    } catch (error) {
      console.error("Error al inicializar el store de notificaciones:", error);
      set({ isLoading: false });
    }
  },

  /**
   * Limpia el store y se desuscribe de los cambios.
   * Debe ser llamado cuando el usuario cierra sesión.
   */
  clear: () => {
    if (subscription) {
      // No esperar (await), pero sí capturar errores potenciales de la promesa.
      // Esto es clave para evitar promesas no controladas en el ciclo de vida de React.
      supabase.removeChannel(subscription).catch((error) => {
        console.warn(
          "Error al remover el canal de notificación (normal en desarrollo):",
          error.message
        );
      });
      subscription = null;
    }
    set({ notifications: [], unreadCount: 0, isLoading: true });
  },

  // Acciones para que la UI actualice el estado
  setNotificationsAsRead: (notificationIdsToUpdate) =>
    set((state) => {
      const ids = Array.isArray(notificationIdsToUpdate)
        ? notificationIdsToUpdate
        : [notificationIdsToUpdate];
      return {
        notifications: state.notifications.map((n) =>
          ids.includes(n.notificacion_id) ? { ...n, estado: "leido" } : n
        ),
        unreadCount: state.unreadCount - ids.length,
      };
    }),

  setAllNotificationsAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        estado: "leido",
      })),
      unreadCount: 0,
    })),
}));
