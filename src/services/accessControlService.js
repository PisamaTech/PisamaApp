import { supabase } from "@/supabase";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import minMax from "dayjs/plugin/minMax";

dayjs.extend(isBetween);
dayjs.extend(minMax);

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
      "id, usuario_id, start_time, end_time, consultorio_nombre, usuario_firstname, usuario_lastname, estado"
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
    (u) => u.access_system_name?.toLowerCase().trim() === normalizedName
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
      "minute"
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
    reservations
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

/**
 * Procesa un lote completo de registros de acceso
 * @param {Array} accessRecords - Registros parseados del Excel
 * @returns {Promise<Object>} Resultados del cotejo con estadísticas
 */
export const processAccessBatch = async (accessRecords) => {
  if (!accessRecords || accessRecords.length === 0) {
    throw new Error("No hay registros para procesar");
  }

  // Determinar rango de fechas de los accesos
  const dates = accessRecords.map((r) => dayjs(r.time));
  const minDate = dayjs.min(dates).startOf("day");
  const maxDate = dayjs.max(dates).endOf("day");

  // Cargar datos necesarios en paralelo
  const [users, reservations] = await Promise.all([
    fetchUsersForAccessMatching(),
    fetchReservationsInRange(minDate.toDate(), maxDate.toDate()),
  ]);

  // Procesar cada registro
  const results = accessRecords.map((record) =>
    processAccessRecord(record, users, reservations)
  );

  // Calcular estadísticas
  const stats = {
    total: results.length,
    valid: results.filter((r) => r.status === AccessMatchStatus.VALID).length,
    noReservation: results.filter(
      (r) => r.status === AccessMatchStatus.NO_RESERVATION
    ).length,
    unmatched: results.filter((r) => r.status === AccessMatchStatus.UNMATCHED)
      .length,
  };

  // Agrupar usuarios sin match (únicos)
  const unmatchedUsers = [
    ...new Set(
      results
        .filter((r) => r.status === AccessMatchStatus.UNMATCHED)
        .map((r) => r.accessUserName)
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
