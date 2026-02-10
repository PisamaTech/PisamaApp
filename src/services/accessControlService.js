import { supabase } from "@/supabase";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import minMax from "dayjs/plugin/minMax";
import utc from "dayjs/plugin/utc";

dayjs.extend(isBetween);
dayjs.extend(minMax);
dayjs.extend(utc);

// Constantes de configuración
const ACCESS_TOLERANCE_MINUTES = 50; // Tolerancia antes del inicio de reserva

/**
 * Tipos de resultado del cotejo
 */
export const AccessMatchStatus = {
  VALID: "valido",
  NO_RESERVATION: "sin_reserva",
  UNMATCHED: "sin_match",
};

/**
 * Obtiene todos los usuarios con su access_system_name para matching
 * @returns {Promise<Array>} Lista de usuarios con id, firstName, lastName, access_system_name
 */
export const fetchUsersForAccessMatching = async () => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, firstName, lastName, access_system_name")
    .order("lastName", { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Obtiene reservas activas/utilizadas en un rango de fechas
 * @param {Date} startDate - Fecha inicio del rango
 * @param {Date} endDate - Fecha fin del rango
 * @returns {Promise<Array>} Reservas en el rango
 */
export const fetchReservationsInRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from("reservas_completas")
    .select(
      "id, usuario_id, start_time, end_time, consultorio_nombre, usuario_firstname, usuario_lastname, estado",
    )
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .in("estado", ["activa", "utilizada"]);

  if (error) throw error;
  return data || [];
};

/**
 * Busca un usuario por nombre del sistema de acceso
 * Primero busca por access_system_name exacto, luego por coincidencia de nombre
 * @param {string} accessName - Nombre del sistema de acceso
 * @param {Array} users - Lista de usuarios cargados
 * @returns {Object|null} Usuario encontrado o null
 */
export const findUserByAccessName = (accessName, users) => {
  if (!accessName) return null;

  const normalizedName = accessName.toLowerCase().trim();

  // 1. Buscar por access_system_name exacto
  const exactMatch = users.find(
    (u) => u.access_system_name?.toLowerCase().trim() === normalizedName,
  );
  if (exactMatch) return exactMatch;

  // 2. Buscar por nombre completo (firstName + lastName)
  const fullNameMatch = users.find((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase().trim();
    return fullName === normalizedName;
  });
  if (fullNameMatch) return fullNameMatch;

  // 3. Buscar por apellido + nombre (formato invertido)
  const invertedMatch = users.find((u) => {
    const invertedName = `${u.lastName} ${u.firstName}`.toLowerCase().trim();
    return invertedName === normalizedName;
  });
  if (invertedMatch) return invertedMatch;

  // 4. Buscar por solo nombre o solo apellido
  const partialMatch = users.find((u) => {
    const firstName = u.firstName?.toLowerCase().trim();
    const lastName = u.lastName?.toLowerCase().trim();
    return firstName === normalizedName || lastName === normalizedName;
  });
  if (partialMatch) return partialMatch;

  return null;
};

/**
 * Verifica si un acceso tiene una reserva válida
 * @param {Date} accessTime - Hora del acceso
 * @param {string} userId - ID del usuario
 * @param {Array} reservations - Lista de reservas
 * @returns {Object|null} Reserva válida o null
 */
export const findValidReservation = (accessTime, userId, reservations) => {
  const accessMoment = dayjs(accessTime);

  return reservations.find((res) => {
    if (res.usuario_id !== userId) return false;

    const reservaStart = dayjs(res.start_time);
    const reservaEnd = dayjs(res.end_time);

    // Ventana de acceso válido: desde (inicio - tolerancia) hasta fin
    const windowStart = reservaStart.subtract(
      ACCESS_TOLERANCE_MINUTES,
      "minute",
    );
    const windowEnd = reservaEnd;

    return accessMoment.isBetween(windowStart, windowEnd, null, "[)");
  });
};

/**
 * Procesa un registro de acceso individual
 * @param {Object} accessRecord - Registro del Excel {time, user, content}
 * @param {Array} users - Lista de usuarios del sistema
 * @param {Array} reservations - Lista de reservas
 * @returns {Object} Resultado del cotejo
 */
export const processAccessRecord = (accessRecord, users, reservations) => {
  const { time, user: accessUserName, content } = accessRecord;
  const accessTime = dayjs(time);

  // Buscar usuario
  const matchedUser = findUserByAccessName(accessUserName, users);

  if (!matchedUser) {
    return {
      accessTime: time,
      accessUserName,
      content,
      status: AccessMatchStatus.UNMATCHED,
      matchedUser: null,
      reservation: null,
    };
  }

  // Buscar reserva válida
  const validReservation = findValidReservation(
    accessTime.toDate(),
    matchedUser.id,
    reservations,
  );

  if (validReservation) {
    return {
      accessTime: time,
      accessUserName,
      content,
      status: AccessMatchStatus.VALID,
      matchedUser: {
        id: matchedUser.id,
        name: `${matchedUser.firstName} ${matchedUser.lastName}`,
      },
      reservation: {
        id: validReservation.id,
        startTime: validReservation.start_time,
        endTime: validReservation.end_time,
        consultorio: validReservation.consultorio_nombre,
      },
    };
  }

  return {
    accessTime: time,
    accessUserName,
    content,
    status: AccessMatchStatus.NO_RESERVATION,
    matchedUser: {
      id: matchedUser.id,
      name: `${matchedUser.firstName} ${matchedUser.lastName}`,
    },
    reservation: null,
  };
};

// ==================== REGLAS DE NOMBRES ====================

/**
 * Obtiene todas las reglas de nombres de acceso
 * @returns {Promise<Array>} Lista de reglas
 */
export const fetchAccessNameRules = async () => {
  const { data, error } = await supabase
    .from("access_name_rules")
    .select("*")
    .order("access_name", { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Crea una nueva regla de nombre de acceso
 * @param {Object} rule - { access_name, action, description? }
 * @returns {Promise<Object>} Regla creada
 */
export const createAccessNameRule = async (rule) => {
  const { data, error } = await supabase
    .from("access_name_rules")
    .insert(rule)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Elimina una regla
 * @param {string} ruleId - ID de la regla
 */
export const deleteAccessNameRule = async (ruleId) => {
  const { error } = await supabase
    .from("access_name_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw error;
};

// ==================== HISTORIAL CON FILTROS ====================

/**
 * Obtiene el historial de access_logs con filtros y paginación
 * @param {number} page - Página actual
 * @param {number} itemsPerPage - Items por página
 * @param {Object} filters - Filtros a aplicar
 * @returns {Promise<{data: Array, count: number}>}
 */
export const fetchAccessLogs = async (
  page = 1,
  itemsPerPage = 20,
  filters = {},
) => {
  const offset = (page - 1) * itemsPerPage;

  let query = supabase.from("access_logs").select("*", { count: "exact" });

  // Filtro por rango de fechas
  if (filters.dateRange?.from) {
    query = query.gte("access_time", filters.dateRange.from.toISOString());
  }
  if (filters.dateRange?.to) {
    const endOfDay = dayjs(filters.dateRange.to).endOf("day").toISOString();
    query = query.lte("access_time", endOfDay);
  }

  // Filtro por usuario
  if (filters.userId && filters.userId !== "todos") {
    query = query.eq("user_id", filters.userId);
  }

  // Filtro por estado
  if (filters.status && filters.status !== "todos") {
    query = query.eq("status", filters.status);
  }

  // Filtro por notificado
  if (filters.notified !== undefined && filters.notified !== "todos") {
    query = query.eq("notified", filters.notified === "si");
  }

  // Filtro solo Mari
  if (filters.mariOnly) {
    query = query.eq("access_name", "Mari");
  }

  // Ordenamiento y paginación
  query = query
    .order("access_time", { ascending: false })
    .range(offset, offset + itemsPerPage - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Enriquecer con datos de usuario y reserva si existen
  if (data && data.length > 0) {
    // Obtener usuarios
    const userIds = [
      ...new Set(data.map((log) => log.user_id).filter(Boolean)),
    ];
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, firstName, lastName, email")
        .in("id", userIds);

      const userMap = new Map(users?.map((u) => [u.id, u]) || []);
      data.forEach((log) => {
        if (log.user_id) {
          log.usuario = userMap.get(log.user_id);
        }
      });
    }

    // Obtener reservas
    const reservationIds = [
      ...new Set(data.map((log) => log.reservation_id).filter(Boolean)),
    ];
    if (reservationIds.length > 0) {
      const { data: reservations } = await supabase
        .from("reservas_completas")
        .select("id, start_time, end_time, consultorio_nombre")
        .in("id", reservationIds);

      const reservationMap = new Map(reservations?.map((r) => [r.id, r]) || []);
      data.forEach((log) => {
        if (log.reservation_id) {
          log.reservation = reservationMap.get(log.reservation_id);
        }
      });
    }
  }

  return { data: data || [], count: count || 0 };
};

// ==================== PROCESAMIENTO CON REGLAS ====================

/**
 * Procesa un lote completo de registros de acceso aplicando reglas
 * @param {Array} accessRecords - Registros parseados del Excel
 * @returns {Promise<Object>} Resultados del cotejo con estadísticas
 */
export const processAccessBatch = async (accessRecords) => {
  if (!accessRecords || accessRecords.length === 0) {
    throw new Error("No hay registros para procesar");
  }

  // 1. Cargar reglas de nombres
  const rules = await fetchAccessNameRules();
  const rulesMap = new Map(
    rules.map((r) => [r.access_name.toLowerCase().trim(), r.action]),
  );

  // 2. Filtrar registros según reglas
  const recordsToProcess = [];
  const ignoredRecords = [];
  const trackedRecords = [];

  for (const record of accessRecords) {
    const normalizedName = record.user?.toLowerCase()?.trim();
    const ruleAction = rulesMap.get(normalizedName);

    if (ruleAction === "ignore") {
      ignoredRecords.push(record);
      continue;
    }

    if (ruleAction === "track") {
      // Guardar sin intentar matchear user_id
      trackedRecords.push({
        accessTime: record.time,
        accessUserName: record.user,
        content: record.content,
        status: AccessMatchStatus.UNMATCHED,
        matchedUser: null,
        reservation: null,
        isTracked: true,
      });
      continue;
    }

    // Sin regla especial, procesar normalmente
    recordsToProcess.push(record);
  }

  // 3. Si no hay registros para procesar, retornar solo tracked
  if (recordsToProcess.length === 0 && trackedRecords.length === 0) {
    return {
      results: [],
      stats: {
        total: 0,
        valid: 0,
        noReservation: 0,
        unmatched: 0,
        ignored: ignoredRecords.length,
        tracked: 0,
      },
      unmatchedUsers: [],
      dateRange: { from: "-", to: "-" },
    };
  }

  // 4. Determinar rango de fechas
  const allDates = [
    ...recordsToProcess.map((r) => dayjs(r.time)),
    ...trackedRecords.map((r) => dayjs(r.accessTime)),
  ];
  const minDate =
    allDates.length > 0 ? dayjs.min(allDates).startOf("day") : dayjs();
  const maxDate =
    allDates.length > 0 ? dayjs.max(allDates).endOf("day") : dayjs();

  // 5. Cargar datos necesarios en paralelo
  const [users, reservations] = await Promise.all([
    fetchUsersForAccessMatching(),
    fetchReservationsInRange(minDate.toDate(), maxDate.toDate()),
  ]);

  // 6. Procesar cada registro normal
  const processedResults = recordsToProcess.map((record) =>
    processAccessRecord(record, users, reservations),
  );

  // 7. Combinar resultados
  const results = [...processedResults, ...trackedRecords];

  // 8. Calcular estadísticas
  const stats = {
    total: results.length,
    valid: results.filter((r) => r.status === AccessMatchStatus.VALID).length,
    noReservation: results.filter(
      (r) => r.status === AccessMatchStatus.NO_RESERVATION,
    ).length,
    unmatched: results.filter(
      (r) => r.status === AccessMatchStatus.UNMATCHED && !r.isTracked,
    ).length,
    ignored: ignoredRecords.length,
    tracked: trackedRecords.length,
  };

  // 9. Agrupar usuarios sin match (únicos, excluyendo tracked)
  const unmatchedUsers = [
    ...new Set(
      results
        .filter((r) => r.status === AccessMatchStatus.UNMATCHED && !r.isTracked)
        .map((r) => r.accessUserName),
    ),
  ];

  return {
    results,
    stats,
    unmatchedUsers,
    dateRange: {
      from: minDate.format("DD/MM/YYYY"),
      to: maxDate.format("DD/MM/YYYY"),
    },
  };
};

/**
 * Actualiza el access_system_name de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} accessName - Nombre en el sistema de acceso
 * @returns {Promise<Object>} Usuario actualizado
 */
export const updateUserAccessName = async (userId, accessName) => {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ access_system_name: accessName })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Guarda un lote de registros de acceso en la base de datos.
 * Utiliza upsert con ignoreDuplicates para evitar errores por duplicados.
 * @param {Array} processedResults - Resultados procesados por processAccessBatch
 * @returns {Promise<Object>} Resultado de la operación
 */
export const saveAccessBatch = async (processedResults) => {
  if (!processedResults || processedResults.length === 0) return;

  // Mapear los resultados al formato de la tabla DB
  const logsToInsert = processedResults.map((r) => ({
    access_time: r.accessTime, // Asegurarse de que esté en formato ISO o Date válido
    access_name: r.accessUserName,
    user_id: r.matchedUser?.id || null,
    content: r.content,
    status: r.status,
    reservation_id: r.reservation?.id || null,
    notified: false,
  }));

  const { data, error } = await supabase
    .from("access_logs")
    .upsert(logsToInsert, {
      onConflict: "access_time, access_name",
      ignoreDuplicates: true, // Importante: ignora si ya existe
    })
    .select();

  if (error) throw error;
  return data;
};

/**
 * Obtiene los registros de acceso sin reserva que aún no han sido notificados.
 * @returns {Promise<Array>} Lista de logs
 */
export const fetchUnresolvedAccessLogs = async () => {
  const { data, error } = await supabase
    .from("access_logs")
    .select("*")
    .eq("status", AccessMatchStatus.NO_RESERVATION)
    .eq("notified", false)
    .order("access_time", { ascending: false });

  if (error) throw error;

  // Manually fetch user details for each log if needed
  if (data && data.length > 0) {
    const userIds = [
      ...new Set(data.map((log) => log.user_id).filter(Boolean)),
    ];
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, firstName, lastName, email")
        .in("id", userIds);

      // Attach user data to each log
      const userMap = new Map(users?.map((u) => [u.id, u]) || []);
      data.forEach((log) => {
        if (log.user_id) {
          log.usuario = userMap.get(log.user_id);
        }
      });
    }
  }

  return data || [];
};

/**
 * Marca un registro de acceso como notificado.
 * @param {string} logId - ID del registro en access_logs
 * @returns {Promise<void>}
 */
export const markAccessAsNotified = async (logId) => {
  const { error } = await supabase
    .from("access_logs")
    .update({ notified: true })
    .eq("id", logId);

  if (error) throw error;
};

/**
 * Obtiene el historial de accesos de un usuario específico.
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de sus accesos
 */
export const fetchUserAccessLogs = async (userId) => {
  const { data, error } = await supabase
    .from("access_logs")
    .select("*")
    .eq("user_id", userId)
    .order("access_time", { ascending: false })
    .limit(100); // Límite razonable para mostrar

  if (error) throw error;

  // Manually fetch reservation details for each log with a reservation_id
  if (data && data.length > 0) {
    const reservationIds = [
      ...new Set(data.map((log) => log.reservation_id).filter(Boolean)),
    ];
    if (reservationIds.length > 0) {
      const { data: reservations } = await supabase
        .from("reservas_completas")
        .select("id, start_time, end_time, consultorio_nombre")
        .in("id", reservationIds);

      // Attach reservation data to each log
      const reservationMap = new Map(reservations?.map((r) => [r.id, r]) || []);
      data.forEach((log) => {
        if (log.reservation_id) {
          log.reservation = reservationMap.get(log.reservation_id);
        }
      });
    }
  }

  return data || [];
};
