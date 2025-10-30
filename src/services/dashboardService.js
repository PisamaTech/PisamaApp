import { supabase } from "@/supabase/supabase.config";
import { fetchCurrentPeriodPreview } from "./billingService";
import dayjs from "dayjs";

/**
 * Obtiene todos los datos necesarios para el dashboard en una sola llamada agregada.
 * Ejecuta las consultas individuales en paralelo para mayor eficiencia.
 *
 * @param {string} userId - El ID del usuario.
 * @param {object} userProfile - El perfil completo del usuario.
 * @returns {Promise<object>} Un objeto que contiene todos los datos del dashboard.
 */
export const fetchDashboardData = async (userId, userProfile) => {
  try {
    // Promise.all permite que todas las peticiones se ejecuten en paralelo
    const [
      upcomingBookings,
      reschedulableBookings,
      pendingInvoices,
      currentPeriodPreview,
      expiringSeries,
    ] = await Promise.all([
      fetchUpcomingBookings(userId), // Obtiene las próximas reservas en un rango de 30 días
      fetchReschedulableBookings(userId), // Obtiene reservas para reagendar
      fetchPendingInvoices(userId), // Obtiene facturas pendientes
      fetchCurrentPeriodPreview(userId, userProfile), // Obtiene la vista previa de facturación
      fetchExpiringSeries(userId), // Obtiene loas reservas FIJAS que vencen en menos de 45 días
    ]);

    // Retorna un único objeto con todos los resultados
    return {
      upcomingBookings,
      reschedulableBookings,
      pendingInvoices,
      currentPeriodPreview,
      expiringSeries,
    };
  } catch (error) {
    console.error("Error al cargar los datos agregados del dashboard:", error);
    // Relanza el error para que el componente de UI pueda manejarlo
    throw error;
  }
};

/**
 * Obtiene las próximas N reservas activas de un usuario.
 * @param {string} userId - El ID del usuario.
 * @param {number} limit - El número máximo de reservas a obtener. Por defecto 5.
 * @returns {Promise<Array<object>>} Un array con las próximas reservas.
 */
export const fetchUpcomingBookings = async (userId, limit = 5) => {
  try {
    const startDate = dayjs().startOf("day").toISOString();
    const { data, error } = await supabase
      .from("reservas")
      .select("*") // Seleccionamos todo para tener los datos para el EventDialog
      .eq("usuario_id", userId)
      .eq("estado", "activa") // Solo reservas activas
      .gte("start_time", startDate) // Cuya hora de inicio sea a partir de ahora
      .order("start_time", { ascending: true }) // Ordenadas de la más próxima a la más lejana
      .limit(limit); // Limita el número de resultados

    if (error) {
      throw error;
    }
    return data || []; // Devuelve los datos o un array vacío
  } catch (error) {
    console.error("Error al obtener las próximas reservas:", error);
    throw new Error(
      `No se pudieron obtener las próximas reservas: ${error.message}`
    );
  }
};

/**
 * Obtiene las reservas penalizadas de un usuario que aún pueden ser reagendadas.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<Array<object>>} Un array con las reservas elegibles para reagendar.
 */
export const fetchReschedulableBookings = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .eq("usuario_id", userId)
      .eq("estado", "penalizada")
      .eq("fue_reagendada", false)
      .gte("permite_reagendar_hasta", new Date().toISOString()) // Que la fecha límite no haya pasado
      .order("permite_reagendar_hasta", { ascending: true }); // Muestra primero las que vencen antes

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error al obtener las reservas para reagendar:", error);
    throw new Error(
      `No se pudieron obtener las reservas para reagendar: ${error.message}`
    );
  }
};

/**
 * Obtiene todas las facturas pendientes de pago para un usuario.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<Array<object>>} Un array con las facturas pendientes.
 */
export const fetchPendingInvoices = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("usuario_id", userId)
      .eq("estado", "pendiente")
      .order("periodo_inicio", { ascending: false }); // Las más recientes primero

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error al obtener las facturas pendientes:", error);
    throw new Error(
      `No se pudieron obtener las facturas pendientes: ${error.message}`
    );
  }
};

/**
 * Obtiene las series de reservas fijas de un usuario que están a punto de expirar.
 * @param {string} userId - El ID del usuario.
 * @param {number} daysThreshold - El umbral en días para considerar una serie "por expirar". Por defecto 45.
 * @returns {Promise<Array<object>>} Un array con las series por expirar.
 */
export const fetchExpiringSeries = async (userId, daysThreshold = 45) => {
  try {
    const thresholdDate = dayjs().add(daysThreshold, "day").toISOString();

    // Esta consulta es más compleja: necesitamos agrupar por recurrence_id
    // y obtener la información representativa de cada serie.
    const { data, error } = await supabase
      .from("reservas")
      .select(
        "recurrence_id, recurrence_end_date, start_time, end_time, consultorio_id, tipo_reserva"
      )
      .eq("usuario_id", userId)
      .eq("tipo_reserva", "Fija")
      .eq("estado", "activa")
      .gte("recurrence_end_date", new Date().toISOString()) // Que no haya expirado ya
      .lte("recurrence_end_date", thresholdDate) // Que expire dentro del umbral
      // La siguiente parte es para obtener una única fila por serie
      .order("start_time", { ascending: true })
      .limit(1000); // Un límite alto para obtener todas las reservas de las series y agrupar en JS

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Agrupar en JavaScript para obtener una fila por cada serie
    const seriesMap = new Map();
    data.forEach((reserva) => {
      if (!seriesMap.has(reserva.recurrence_id)) {
        seriesMap.set(reserva.recurrence_id, {
          recurrence_id: reserva.recurrence_id,
          recurrence_end_date: reserva.recurrence_end_date,
          // Creamos un título descriptivo para la serie
          title: `${dayjs(reserva.start_time)
            .locale("es")
            .format("dddd")
            .toUpperCase()} - ${dayjs(reserva.start_time).format(
            "HH:mm"
          )}hs - Consultorio ${reserva.consultorio_id}`,
          consultorio_id: reserva.consultorio_id,
        });
      }
    });

    return Array.from(seriesMap.values());
  } catch (error) {
    console.error("Error al obtener las series por expirar:", error);
    throw new Error(
      `No se pudieron obtener las series por expirar: ${error.message}`
    );
  }
};
