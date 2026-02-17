import { supabase } from "@/supabase/supabase.config"; // Asegúrate que la ruta es correcta
import dayjs from "dayjs";
import { createNotification } from "./notificationService";

/**
 * Obtiene una lista paginada de todos los usuarios, con opción de búsqueda.
 * Esta función es para el panel de administración.
 *
 * @param {number} page - La página actual para la paginación.
 * @param {number} itemsPerPage - Cuántos usuarios por página.
 * @param {string} searchTerm - El término de búsqueda para filtrar por nombre, apellido o email.
 * @returns {Promise<{data: Array<object>, count: number}>} Un objeto con los usuarios y el conteo total.
 */
export const fetchAllUsers = async (
  page = 1,
  itemsPerPage = 10,
  searchTerm = "",
) => {
  try {
    const offset = (page - 1) * itemsPerPage;

    let query = supabase.from("user_profiles").select("*", { count: "exact" });

    if (searchTerm.trim() !== "") {
      // Busca en múltiples columnas usando 'or'. ilike es case-insensitive.
      // Asegúrate de que los nombres de columna (firstName, lastName, email) coincidan con tu tabla.
      query = query.or(
        `firstName.ilike.%${searchTerm}%,lastName.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
      );
    }

    // Aplica orden y paginación
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error al obtener todos los usuarios:", error);
    throw new Error(`No se pudieron obtener los usuarios: ${error.message}`);
  }
};

/**
 * Actualiza la modalidad de pago de un usuario específico.
 * Esta función es para ser usada por un administrador.
 *
 * @param {string} userId - El ID del usuario a modificar.
 * @param {string} newPaymentMethod - La nueva modalidad ('semanal' o 'mensual').
 * @returns {Promise<object>} El perfil de usuario actualizado.
 */
export const updateUserPaymentMethod = async (userId, newPaymentMethod) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ modalidad_pago: newPaymentMethod })
      .eq("id", userId)
      .select()
      .single(); // Devuelve el objeto actualizado para confirmación

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(
      `Error al actualizar la modalidad de pago para el usuario ${userId}:`,
      error,
    );
    throw new Error(
      `No se pudo actualizar la modalidad de pago: ${error.message}`,
    );
  }
};

/**
 * Obtiene todas las facturas del sistema desde la VISTA 'facturas_con_detalles_usuario'.
 *
 * @param {number} page
 * @param {number} itemsPerPage
 * @param {object} filters - Objeto con filtros opcionales: { userId, status }
 * @returns {Promise<{data: Array<object>, count: number}>}
 */
export const searchAllInvoices = async (
  page = 1,
  itemsPerPage = 10,
  filters = {},
) => {
  try {
    const offset = (page - 1) * itemsPerPage;

    // --- CAMBIO CLAVE: AHORA CONSULTAMOS LA VISTA ---
    let query = supabase
      .from("facturas_con_detalles_usuario") // <-- Usamos el nombre de la VISTA
      .select("*", { count: "exact" }); // <-- El select es ahora simple

    // Los filtros funcionan igual porque la vista tiene las mismas columnas
    if (filters.userId && filters.userId !== "todos") {
      query = query.eq("usuario_id", filters.userId);
    }
    if (filters.status && filters.status !== "todos") {
      query = query.eq("estado", filters.status);
    }

    if (filters.minAmount) {
      query = query.gte("monto_total", Number(filters.minAmount));
    }
    if (filters.maxAmount) {
      query = query.lte("monto_total", Number(filters.maxAmount));
    }

    query = query
      .order("fecha_emision", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error buscando todas las facturas:", error);
    throw new Error(`No se pudieron obtener las facturas: ${error.message}`);
  }
};

/**
 * Marca una factura como 'pagada' y establece la fecha de pago.
 *
 * @param {number|string} invoiceId - El ID de la factura a actualizar.
 * @returns {Promise<object>} La factura actualizada.
 */
export const markInvoiceAsPaid = async (invoiceId) => {
  try {
    const { data, error } = await supabase
      .from("facturas")
      .update({
        estado: "pagada",
        fecha_pago: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (error) throw error;

    // --- 2. AÑADE LA CREACIÓN DE LA NOTIFICACIÓN AQUÍ ---
    if (data) {
      createNotification({
        usuario_id: data.usuario_id,
        tipo: "FACTURA_PAGADA",
        titulo: "¡Pago Confirmado!",
        mensaje: `Hemos confirmado tu pago de la factura #${
          data.id
        } correspondiente al período entre el ${dayjs(
          data.periodo_inicio,
        ).format("DD/MM/YY")} - ${dayjs(data.periodo_fin).format(
          "DD/MM/YY",
        )}. ¡Muchas gracias!`,
        enlace: `/facturas/${data.id}`,
        metadata: { factura_id: data.id },
      });
    }

    return data;
  } catch (error) {
    console.error(
      `Error al marcar la factura ${invoiceId} como pagada:`,
      error,
    );
    throw new Error(`No se pudo actualizar la factura: ${error.message}`);
  }
};

/**
 * Obtiene la lista de todos los consultorios con sus precios actuales.
 * @returns {Promise<Array<object>>}
 */
export const fetchAllConsultorios = async () => {
  try {
    const { data, error } = await supabase
      .from("consultorios")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al obtener los consultorios:", error);
    throw new Error(
      `No se pudieron obtener los consultorios: ${error.message}`,
    );
  }
};

/**
 * Actualiza el precio por hora de un consultorio específico.
 * @param {number|string} consultorioId - El ID del consultorio a actualizar.
 * @param {number} newPrice - El nuevo precio por hora.
 * @returns {Promise<object>} El consultorio actualizado.
 */
export const updateConsultorioPrice = async (consultorioId, newPrice) => {
  try {
    // Validar que el precio sea un número válido
    if (isNaN(newPrice) || newPrice < 0) {
      throw new Error("El precio debe ser un número positivo.");
    }

    const { data, error } = await supabase
      .from("consultorios")
      .update({ precio_hora: newPrice })
      .eq("id", consultorioId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(
      `Error al actualizar el precio del consultorio ${consultorioId}:`,
      error,
    );
    throw new Error(`No se pudo actualizar el precio: ${error.message}`);
  }
};

/**
 * Busca en TODAS las reservas del sistema con filtros avanzados y paginación.
 * Usa la VISTA para obtener el nombre del consultorio y del usuario.
 *
 * @param {number} page
 * @param {number} itemsPerPage
 * @param {object} filters - Objeto con filtros: { userId, status, consultorioId, dateRange }
 * @returns {Promise<{data: Array<object>, count: number}>}
 */
export const searchAllReservations = async (
  page = 1,
  itemsPerPage = 10,
  filters = {},
) => {
  try {
    const offset = (page - 1) * itemsPerPage;

    // Supongamos que tienes una VISTA que une reservas con usuarios y consultorios.
    // Si no, tendremos que hacer el JOIN aquí. Vamos a asumir que podemos crearla.
    // El nombre de la vista podría ser 'reservas_completas'.
    // Si no tienes la vista, la consulta sería más compleja.
    // Por ahora, asumimos que la crearemos.

    let query = supabase
      .from("reservas_completas") // Consultaremos una VISTA para simplificar
      .select("*", { count: "exact" });

    // Aplicar filtros
    if (filters.userId && filters.userId !== "todos") {
      query = query.eq("usuario_id", filters.userId);
    }
    if (filters.status && filters.status !== "todos") {
      query = query.eq("estado", filters.status);
    }
    if (filters.consultorioId && filters.consultorioId !== "todos") {
      query = query.eq("consultorio_id", filters.consultorioId);
    }
    if (filters.dateRange?.from) {
      query = query.gte("start_time", filters.dateRange.from.toISOString());
    }
    if (filters.dateRange?.to) {
      const endOfDay = dayjs(filters.dateRange.to).endOf("day").toISOString();
      query = query.lte("start_time", endOfDay);
    }

    query = query
      .order("id", { ascending: false }) // Las más recientes primero
      .range(offset, offset + itemsPerPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error buscando todas las reservas:", error);
    throw new Error(`No se pudieron obtener las reservas: ${error.message}`);
  }
};

// * 1. Obtiene los ingresos de facturas pagadas para el mes actual y el anterior */
export const getRevenueSummary = async () => {
  const startOfCurrentMonth = dayjs().startOf("month").toISOString();
  const endOfCurrentMonth = dayjs().endOf("month").toISOString();
  const startOfLastMonth = dayjs()
    .subtract(1, "month")
    .startOf("month")
    .toISOString();
  const endOfLastMonth = dayjs()
    .subtract(1, "month")
    .endOf("month")
    .toISOString();

  // Usamos una función RPC para hacer el cálculo agregado en la base de datos, es más eficiente.
  const { data, error } = await supabase.rpc("get_revenue_summary", {
    current_month_start: startOfCurrentMonth,
    current_month_end: endOfCurrentMonth,
    last_month_start: startOfLastMonth,
    last_month_end: endOfLastMonth,
  });

  if (error) throw error;
  // La RPC devolverá algo como { current_month_revenue: 5000, last_month_revenue: 4500 }
  return data;
};

/**
 * 2. Obtiene el conteo y la suma total de facturas pendientes.
 */
export const getPendingBillingSummary = async () => {
  const { data, error, count } = await supabase
    .from("facturas")
    .select("monto_total", { count: "exact" })
    .eq("estado", "pendiente");

  if (error) throw error;

  const totalAmount = data.reduce(
    (sum, invoice) => sum + invoice.monto_total,
    0,
  );
  return { count: count || 0, totalAmount };
};

/**
 * 3. Calcula la ocupación de hoy.
 */
export const getTodaysOccupancy = async () => {
  const startOfDay = dayjs().startOf("day").toISOString();
  const endOfDay = dayjs().endOf("day").toISOString();
  const totalConsultorios = 5;
  const horasOperativas = 16;

  // La consulta ahora solo pide el conteo, no los datos
  const { count, error } = await supabase
    .from("reservas")
    .select("*", { count: "exact", head: true }) // Pide solo el conteo
    .in("estado", ["activa", "utilizada", "penalizada"])
    .gte("start_time", startOfDay)
    .lt("end_time", endOfDay);

  if (error) throw error;

  // El número de horas reservadas es simplemente el conteo de filas
  const horasReservadas = count || 0;

  const horasDisponibles = totalConsultorios * horasOperativas;
  const porcentajeOcupacion =
    horasDisponibles > 0 ? (horasReservadas / horasDisponibles) * 100 : 0;

  return {
    horasReservadas,
    horasDisponibles,
    porcentajeOcupacion: Math.round(porcentajeOcupacion),
  };
};

/**
 * 4. Cuenta los nuevos usuarios en los últimos 30 días.
 */
export const getNewUsersCount = async () => {
  const thirtyDaysAgo = dayjs().subtract(30, "days").toISOString();

  const { error, count } = await supabase
    .from("user_profiles")
    .select("id", { count: "exact", head: true }) // head: true solo pide el conteo, más rápido
    .gte("created_at", thirtyDaysAgo);

  if (error) throw error;
  return count || 0;
};

/**
 * 5. Obtiene las horas reservadas por día para el gráfico de barras.
 */
export const getDailyBookingStats = async (days = 7) => {
  const startDate = dayjs()
    .subtract(days - 1, "day")
    .startOf("day")
    .toISOString();
  const endDate = dayjs().endOf("day").toISOString();

  // Usamos una RPC para agrupar por día, es mucho más eficiente.
  const { data, error } = await supabase.rpc("get_daily_booking_stats", {
    start_date: startDate,
    end_date: endDate,
  });

  if (error) throw error;
  return data || []; // La RPC devolverá un array de { dia, horas_reservadas }
};

/**
 * 6. Obtiene las horas reservadas por consultorio para el mes actual.
 */
export const getOccupancyByConsultorio = async () => {
  const startOfMonth = dayjs().startOf("month").toISOString();
  const endOfMonth = dayjs().endOf("month").toISOString();

  // Usamos una RPC para agrupar por consultorio.
  const { data, error } = await supabase.rpc("get_occupancy_by_consultorio", {
    start_date: startOfMonth,
    end_date: endOfMonth,
  });

  if (error) throw error;
  return data || []; // La RPC devolverá un array de { nombre_consultorio, horas_reservadas }
};

/**
 * 7. Obtiene las últimas reservas creadas.
 */
export const getRecentBookings = async (limit = 10) => {
  // Usamos la VISTA 'reservas_completas' para obtener los nombres
  const { data, error } = await supabase
    .from("reservas_completas")
    .select(
      "id, start_time, usuario_firstname, usuario_lastname, consultorio_nombre, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * 8. Obtiene las últimas cancelaciones o penalizaciones.
 */
export const getRecentCancellations = async (limit = 10) => {
  const { data, error } = await supabase
    .from("reservas_completas")
    .select(
      "id, start_time, usuario_firstname, usuario_lastname, consultorio_nombre, estado, fecha_cancelacion",
    )
    .in("estado", ["cancelada", "penalizada"])
    .order("fecha_cancelacion", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Agregador: Obtiene todos los datos necesarios para el dashboard de administración en paralelo.
 * Llama a todas las funciones de servicio individuales y las empaqueta en un solo objeto.
 *
 * @returns {Promise<object>} Un objeto que contiene todos los datos del dashboard.
 */
export const fetchAdminDashboardData = async () => {
  console.log("Cargando todos los datos del dashboard de administración...");

  try {
    // Usamos Promise.allSettled en lugar de Promise.all para mayor resiliencia.
    // Si una de las consultas falla, las demás aún pueden tener éxito.
    const results = await Promise.allSettled([
      getRevenueSummary(),
      getPendingBillingSummary(),
      getTodaysOccupancy(),
      getNewUsersCount(),
      getDailyBookingStats(8), // Para la vista por defecto de 7 días
      getOccupancyByConsultorio(),
      getRecentBookings(10), // Un límite más pequeño para el dashboard
      getRecentCancellations(10),
    ]);

    // Procesamos los resultados para manejar los casos de éxito y fallo individualmente
    const [
      revenueSummaryRes,
      pendingBillingSummaryRes,
      todaysOccupancyRes,
      newUsersCountRes,
      dailyBookingStatsRes,
      occupancyByConsultorioRes,
      recentBookingsRes,
      recentCancellationsRes,
    ] = results;

    // Construimos el objeto final, asignando los datos si la promesa se cumplió, o null/valor por defecto si falló.
    const dashboardData = {
      revenueSummary:
        revenueSummaryRes.status === "fulfilled"
          ? revenueSummaryRes.value
          : { currentMonthRevenue: 0, lastMonthRevenue: 0 },
      pendingBillingSummary:
        pendingBillingSummaryRes.status === "fulfilled"
          ? pendingBillingSummaryRes.value
          : { count: 0, totalAmount: 0 },
      todaysOccupancy:
        todaysOccupancyRes.status === "fulfilled"
          ? todaysOccupancyRes.value
          : { horasReservadas: 0, horasDisponibles: 0, porcentajeOcupacion: 0 },
      newUsersCount:
        newUsersCountRes.status === "fulfilled" ? newUsersCountRes.value : 0,
      dailyBookingStats:
        dailyBookingStatsRes.status === "fulfilled"
          ? dailyBookingStatsRes.value
          : [],
      occupancyByConsultorio:
        occupancyByConsultorioRes.status === "fulfilled"
          ? occupancyByConsultorioRes.value
          : [],
      recentBookings:
        recentBookingsRes.status === "fulfilled" ? recentBookingsRes.value : [],
      recentCancellations:
        recentCancellationsRes.status === "fulfilled"
          ? recentCancellationsRes.value
          : [],
    };

    // Opcional: Registrar si alguna de las promesas falló
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `La consulta del dashboard en el índice ${index} falló:`,
          result.reason,
        );
      }
    });

    console.log(
      "Datos del dashboard de administración cargados:",
      dashboardData,
    );
    return dashboardData;
  } catch (error) {
    // Este catch se activaría si hay un error no relacionado con las promesas,
    // pero el manejo principal se hace al procesar los resultados de Promise.allSettled.
    console.error("Error inesperado en fetchAdminDashboardData:", error);
    throw error;
  }
};

/**
 * Llama a la RPC para crear una notificación masiva para todos los usuarios.
 * @param {object} broadcastData - Objeto con { tipo, titulo, mensaje, enlace }.
 * @returns {Promise<object>} El resultado de la RPC.
 */
export const sendBroadcastNotification = async (broadcastData) => {
  try {
    if (
      !broadcastData.tipo ||
      !broadcastData.titulo ||
      !broadcastData.mensaje
    ) {
      throw new Error(
        "Tipo, título y mensaje son requeridos para una notificación masiva.",
      );
    }

    const { data, error } = await supabase.rpc(
      "create_broadcast_notification",
      {
        p_tipo: broadcastData.tipo,
        p_titulo: broadcastData.titulo,
        p_mensaje: broadcastData.mensaje,
        p_enlace: broadcastData.enlace || null,
      },
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al enviar notificación masiva:", error);
    throw new Error(`No se pudo enviar la notificación: ${error.message}`);
  }
};

/**
 * Envia una notificación a una lista específica de usuarios.
 * @param {string[]} userIds - Array de IDs de los usuarios a notificar.
 * @param {object} notificationData - Objeto con { tipo, titulo, mensaje, enlace }.
 * @returns {Promise<{notifications_created: number}>} El número de notificaciones creadas.
 */
export const sendNotificationToUsers = async (userIds, notificationData) => {
  try {
    if (
      !userIds ||
      userIds.length === 0 ||
      !notificationData.tipo ||
      !notificationData.titulo ||
      !notificationData.mensaje
    ) {
      throw new Error(
        "Se requiere una lista de usuarios, tipo, título y mensaje.",
      );
    }

    const notificationPromises = userIds.map((userId) =>
      createNotification({
        usuario_id: userId,
        ...notificationData,
      }),
    );

    const results = await Promise.allSettled(notificationPromises);

    const successfulCreations = results.filter(
      (res) => res.status === "fulfilled" && res.value !== null,
    ).length;

    if (successfulCreations === 0) {
      throw new Error("No se pudo crear ninguna notificación.");
    }

    return { notifications_created: successfulCreations };
  } catch (error) {
    console.error(
      "Error al enviar notificación a usuarios específicos:",
      error,
    );
    throw new Error(`No se pudo enviar la notificación: ${error.message}`);
  }
};

/**
 * --- SECCIÓN DE RENDIMIENTO ---
 */

/**
 * Obtiene estadísticas mensuales de montos facturados.
 * @param {number} year - Año a consultar.
 * @returns {Promise<Array<{mes: number, monto_total: number, cantidad_facturas: number}>>}
 */
export const fetchMonthlyInvoiceStats = async (year) => {
  const startOfYear = dayjs().year(year).startOf("year").toISOString();
  const endOfYear = dayjs().year(year).endOf("year").toISOString();

  const { data, error } = await supabase
    .from("facturas")
    .select("monto_total, fecha_emision")
    .gte("fecha_emision", startOfYear)
    .lte("fecha_emision", endOfYear);

  if (error) throw error;

  // Agrupar por mes en el cliente
  const monthlyStats = {};
  for (let m = 1; m <= 12; m++) {
    monthlyStats[m] = { mes: m, monto_total: 0, cantidad_facturas: 0 };
  }

  (data || []).forEach((factura) => {
    const mes = dayjs(factura.fecha_emision).month() + 1; // dayjs month es 0-indexed
    if (monthlyStats[mes]) {
      monthlyStats[mes].monto_total += factura.monto_total || 0;
      monthlyStats[mes].cantidad_facturas += 1;
    }
  });

  return Object.values(monthlyStats);
};

/**
 * Obtiene estadísticas mensuales de horas (activas, utilizadas, penalizadas).
 * @param {number} year - Año a consultar.
 */
export const fetchMonthlyHoursStats = async (year) => {
  const { data, error } = await supabase.rpc("get_monthly_hours_stats", {
    year_input: year,
  });
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene estadísticas de tipos de reserva y reagendamientos por mes.
 * @param {number} year - Año a consultar.
 */
export const fetchReservationTypeStats = async (year) => {
  const { data, error } = await supabase.rpc("get_reservation_type_stats", {
    year_input: year,
  });
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene datos para el mapa de calor (Día vs Hora).
 * @param {string} startDate - Fecha inicio ISO.
 * @param {string} endDate - Fecha fin ISO.
 */
export const fetchHeatmapData = async (startDate, endDate) => {
  const { data, error } = await supabase.rpc("get_heatmap_data", {
    start_date: startDate,
    end_date: endDate,
  });
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene el top de usuarios (VIP) basado en facturación.
 * @param {number} limit - Cantidad de usuarios a traer.
 */
export const fetchTopUsers = async (limit = 10) => {
  try {
    // Intentar usar la RPC si existe
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_top_users_v2",
      {
        p_limit: limit,
      },
    );

    if (!rpcError && rpcData) {
      return rpcData;
    }

    // Fallback: consulta directa si la RPC no existe
    console.log("RPC get_top_users_v2 no disponible, usando fallback...");

    // Obtener facturas pagadas con datos de usuario
    const { data: invoices, error: invoiceError } = await supabase
      .from("facturas_con_detalles_usuario")
      .select("usuario_id, monto_total, firstName, lastName, email")
      .eq("estado", "pagada");

    if (invoiceError) throw invoiceError;

    // Agrupar por usuario
    const userStats = {};
    (invoices || []).forEach((inv) => {
      if (!userStats[inv.usuario_id]) {
        userStats[inv.usuario_id] = {
          usuario_id: inv.usuario_id,
          nombre_completo:
            `${inv.firstName || ""} ${inv.lastName || ""}`.trim() ||
            "Sin nombre",
          email: inv.email || "",
          total_reservas: 0,
          total_gastado: 0,
        };
      }
      userStats[inv.usuario_id].total_reservas += 1;
      userStats[inv.usuario_id].total_gastado += inv.monto_total || 0;
    });

    // Ordenar por total gastado y limitar
    const sortedUsers = Object.values(userStats)
      .sort((a, b) => b.total_gastado - a.total_gastado)
      .slice(0, limit);

    return sortedUsers;
  } catch (error) {
    console.error("Error en fetchTopUsers:", error);
    return [];
  }
};

/**
 * Obtiene KPIs generales (Ticket promedio, Churn, etc.) en un rango.
 * @param {string} startDate
 * @param {string} endDate
 */
export const fetchKpiStats = async (startDate, endDate) => {
  const { data, error } = await supabase.rpc("get_kpi_stats", {
    start_date: startDate,
    end_date: endDate,
  });
  if (error) throw error;
  return data;
};

/**
 * Agregador para la página de Rendimiento.
 * @param {number} year - Año seleccionado.
 */
/**
 * Obtiene las series de reservas fijas de TODOS los usuarios que están por vencer.
 * @param {number} daysThreshold - Umbral en días. Por defecto 60.
 * @returns {Promise<Array<object>>} Array de series por vencer, agrupadas por recurrence_id.
 */
export const fetchExpiringFixedSeries = async (daysThreshold = 60) => {
  try {
    const now = dayjs();
    const thresholdDate = now.add(daysThreshold, "day").toISOString();

    const { data, error } = await supabase
      .from("reservas_completas")
      .select(
        "recurrence_id, recurrence_end_date, start_time, end_time, consultorio_nombre, tipo_reserva, usuario_firstname, usuario_lastname",
      )
      .eq("tipo_reserva", "Fija")
      .eq("estado", "activa")
      .not("recurrence_end_date", "is", null)
      .gte("recurrence_end_date", now.toISOString())
      .lte("recurrence_end_date", thresholdDate)
      .order("recurrence_end_date", { ascending: true })
      .limit(1000);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Agrupar por recurrence_id para obtener una fila por serie
    const seriesMap = new Map();
    data.forEach((reserva) => {
      if (!seriesMap.has(reserva.recurrence_id)) {
        const endDate = dayjs(reserva.recurrence_end_date);
        seriesMap.set(reserva.recurrence_id, {
          recurrence_id: reserva.recurrence_id,
          recurrence_end_date: reserva.recurrence_end_date,
          usuario:
            `${reserva.usuario_firstname || ""} ${reserva.usuario_lastname || ""}`.trim() ||
            "Sin nombre",
          consultorio: reserva.consultorio_nombre,
          serie_desc: `${dayjs(reserva.start_time).format("dddd")} - ${dayjs(reserva.start_time).format("HH:mm")}hs`,
          dias_restantes: endDate.diff(now, "day"),
        });
      }
    });

    return Array.from(seriesMap.values());
  } catch (error) {
    console.error("Error al obtener series por vencer:", error);
    throw new Error(
      `No se pudieron obtener las series por vencer: ${error.message}`,
    );
  }
};

export const fetchPerformanceData = async (year) => {
  const startOfYear = dayjs().year(year).startOf("year").toISOString();
  const endOfYear = dayjs().year(year).endOf("year").toISOString();

  console.log(`Cargando datos de rendimiento para el año ${year}...`);

  const results = await Promise.allSettled([
    fetchMonthlyHoursStats(year),
    fetchReservationTypeStats(year),
    fetchHeatmapData(startOfYear, endOfYear),
    fetchTopUsers(10),
    fetchKpiStats(startOfYear, endOfYear),
    fetchMonthlyInvoiceStats(year),
  ]);

  const [
    monthlyHoursRes,
    reservationTypesRes,
    heatmapRes,
    topUsersRes,
    kpiStatsRes,
    monthlyInvoicesRes,
  ] = results;

  return {
    monthlyHours:
      monthlyHoursRes.status === "fulfilled" ? monthlyHoursRes.value : [],
    reservationTypes:
      reservationTypesRes.status === "fulfilled"
        ? reservationTypesRes.value
        : [],
    heatmap: heatmapRes.status === "fulfilled" ? heatmapRes.value : [],
    topUsers: topUsersRes.status === "fulfilled" ? topUsersRes.value : [],
    kpiStats:
      kpiStatsRes.status === "fulfilled"
        ? kpiStatsRes.value
        : {
            ticket_promedio: 0,
            tasa_cancelacion: 0,
            tasa_reagendamiento: 0,
            total_reservas: 0,
            ingresos_totales: 0,
          },
    monthlyInvoices:
      monthlyInvoicesRes.status === "fulfilled" ? monthlyInvoicesRes.value : [],
  };
};
