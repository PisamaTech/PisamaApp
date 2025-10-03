import { supabase } from "@/supabase/supabase.config";

/**
 * Llama a la RPC para crear una notificación y encolarla en los canales correspondientes.
 *
 * @param {object} notificationData - Objeto con los datos de la notificación.
 * @param {string} notificationData.usuario_id
 * @param {string} notificationData.tipo - Ej: 'FACTURA_NUEVA'
 * @param {string} notificationData.titulo
 * @param {string} notificationData.mensaje
 * @param {string} [notificationData.enlace] - Opcional.
 * @param {object} [notificationData.metadata] - Opcional.
 * @returns {Promise<number|null>} El ID de la notificación creada o null si falla.
 */
export const createNotification = async (notificationData) => {
  try {
    // Validamos que los datos esenciales estén presentes
    if (
      !notificationData.usuario_id ||
      !notificationData.tipo ||
      !notificationData.titulo ||
      !notificationData.mensaje
    ) {
      throw new Error("Datos insuficientes para crear la notificación.");
    }

    const { data: notificationId, error } = await supabase.rpc(
      "create_notification_and_queue",
      {
        p_usuario_id: notificationData.usuario_id,
        p_tipo: notificationData.tipo,
        p_titulo: notificationData.titulo,
        p_mensaje: notificationData.mensaje,
        p_enlace: notificationData.enlace || null,
        p_metadata: notificationData.metadata || null,
      }
    );

    if (error) throw error;

    console.log(`Notificación creada exitosamente con ID: ${notificationId}`);
    return notificationId; // Devuelve el ID de la notificación creada
  } catch (error) {
    console.error("Error en el servicio createNotification:", error);
    // No relanzamos el error para no detener el flujo principal que generó la notificación.
    // El fallo en crear una notificación no debería, por ejemplo, impedir que se cree una factura.
    // Simplemente lo registramos en la consola.
    return null;
  }
};

/**
 * Obtiene las preferencias de notificación de un usuario.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export const fetchNotificationPreferences = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("preferencias_notificaciones")
      .select("*")
      .eq("usuario_id", userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al obtener las preferencias de notificación:", error);
    throw error;
  }
};

/**
 * Actualiza las preferencias de notificación de un usuario.
 * @param {string} userId
 * @param {object} newPreferences - Objeto con las columnas a actualizar.
 * @returns {Promise<object>}
 */
export const updateNotificationPreferences = async (userId, newPreferences) => {
  try {
    const { data, error } = await supabase
      .from("preferencias_notificaciones")
      .update(newPreferences)
      .eq("usuario_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      "Error al actualizar las preferencias de notificación:",
      error
    );
    throw error;
  }
};

/**
 * Marca una notificación In-App como leída.
 * @param {number|string} notificationId
 * @returns {Promise<object>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from("cola_envios")
      .update({ estado: "leido", ultimo_intento: new Date().toISOString() })
      .eq("notificacion_id", notificationId)
      .eq("canal", "in-app")
      .eq("estado", "pendiente") // Solo marca como leída si estaba pendiente
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      `Error al marcar la notificación ${notificationId} como leída:`,
      error
    );
    throw error;
  }
};

/**
 * Marca todas las notificaciones In-App de un usuario como leídas.
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    // Esta operación requiere una RPC para ser segura y eficiente
    const { data, error } = await supabase.rpc("mark_all_in_app_as_read", {
      p_user_id: userId,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      `Error al marcar todas las notificaciones como leídas para el usuario ${userId}:`,
      error
    );
    throw error;
  }
};
