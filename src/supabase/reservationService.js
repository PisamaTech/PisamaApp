import { ReservationStatus } from "@/utils/constants";
import { supabase } from "./index";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"; // Para comparar fechas
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"; // Para comparar fechas
import { generateRecurringEventsForRenewal } from "@/utils/calendarUtils";
import { checkForConflicts } from "../utils/calendarUtils";
import { createNotification } from "@/services/notificationService";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Función para insertar reservas en Supabase
export const createReservations = async (reservations) => {
  const { data, error } = await supabase
    .from("reservas")
    .insert(reservations)
    .select();

  if (error) throw error;
  return data;
};

// Obtiene eventos de la base de datos en un rango de fechas
export const fetchEventsFromDatabase = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .or("estado.eq.activa,estado.eq.utilizada");

    if (error) {
      console.error(
        "Supabase error details:",
        error.details,
        error.hint,
        error.message
      );
      throw new Error("Error al cargar reservas desde la base de datos");
    }
    return data;
  } catch (error) {
    console.error("Error al cargar reservas desde la base de datos:", error);
    return error;
  }
};

// Verificiación de disponibilidad
export const checkForExistingReservations = async (hourlyEvents) => {
  // Verificación por consultorio
  const consultoriosIds = [...new Set(hourlyEvents.map((e) => e.resourceId))];

  const queries = consultoriosIds.map((consultorioId) => {
    const eventTimes = hourlyEvents
      .filter((e) => e.resourceId === consultorioId)
      .map((e) => [dayjs(e.start).toISOString(), dayjs(e.end).toISOString()]);

    return supabase
      .from("reservas")
      .select()
      .eq("consultorio_id", consultorioId)
      .or(
        eventTimes
          .map(
            ([start, end]) => `and(start_time.lt.${end},end_time.gt.${start})`
          )
          .join(",")
      )
      .throwOnError();
  });

  // Verificación de camilla
  const eventosConCamilla = hourlyEvents.filter((e) => e.usaCamilla);
  let camillaQuery = null;

  if (eventosConCamilla.length > 0) {
    const camillaTimeSlots = eventosConCamilla.map((e) => [
      dayjs(e.start).toISOString(),
      dayjs(e.end).toISOString(),
    ]);

    camillaQuery = supabase
      .from("reservas")
      .select()
      .eq("usaCamilla", true)
      .or(
        camillaTimeSlots
          .map(
            ([start, end]) => `and(start_time.lt.${end},end_time.gt.${start})`
          )
          .join(",")
      )
      .throwOnError();
  }

  // Ejecutar todas las consultas
  const allQueries = camillaQuery ? [...queries, camillaQuery] : queries;
  const results = await Promise.all(allQueries);

  // Filtrar y combinar resultados
  return results.flatMap((r) => r.data);
};

// Cancelar una reserva unica
export const cancelSingleReservation = async (reservationId) => {
  const { data, error } = await supabase
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", reservationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cancelar una serie de reserva fijas
export const cancelRecurringSeries = async (
  recurrenceId,
  seriesOwnerId,
  requestingUserId,
  requestingUserRole,
  cancellationRequestDate
) => {
  // Corroboramos que cancellationRequestDate es un objeto Date y luego lo convertimos a ISO string
  const cancellationDateISO =
    cancellationRequestDate instanceof Date
      ? cancellationRequestDate.toISOString()
      : new Date(cancellationRequestDate).toISOString();

  try {
    const { data: modifiedBookings, error } = await supabase.rpc(
      "cancel_recurring_series_with_penalty",
      {
        p_recurrence_id: recurrenceId,
        p_series_owner_id: seriesOwnerId,
        p_requesting_user_id: requestingUserId,
        p_requesting_user_role: requestingUserRole,
        p_cancellation_request_date: cancellationDateISO,
      }
    );

    if (error) {
      console.error(
        "Error al llamar a la RPC cancel_recurring_series_with_penalty:",
        error
      );
      throw error;
    }

    // Si no se modificó nada, retorna un tipo de acción específico
    if (!modifiedBookings || modifiedBookings.length === 0) {
      return {
        actionType: "NO_FUTURE_BOOKINGS",
        updatedBookings: [],
      };
    }

    // Determina el tipo de acción basado en el estado de la primera reserva devuelta.
    // La RPC devuelve las reservas en el orden en que se actualizan,
    // así que la primera debería ser la 'next_booking'.
    const firstUpdatedBooking = modifiedBookings[0];
    let actionType;

    if (firstUpdatedBooking.estado === ReservationStatus.PENALIZADA) {
      actionType = "SERIES_CANCELLED_WITH_PENALTY";
    } else {
      actionType = "SERIES_CANCELLED";
    }

    return {
      actionType: actionType,
      updatedBookings: modifiedBookings,
    };
  } catch (error) {
    console.error(
      `Error en la operación de cancelación de serie ${recurrenceId}:`,
      error
    );
    throw new Error(
      `No se pudo cancelar la serie de reservas: ${error.message}`
    );
  }
};

// Obtener reservas que se superponen con un consultorio específico
export const getOverlappingReservationsForConsultorio = async (
  consultorioId,
  timeSlots
) => {
  const queries = timeSlots.map(([start_time, end_time]) =>
    supabase
      .from("reservas")
      .select()
      .eq("consultorio_id", consultorioId)
      .eq("estado", ReservationStatus.ACTIVA)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
  );
  const results = await Promise.all(queries);
  return results.flatMap((r) => r.data);
};

// Obtener reservas que usan camilla y se superponen con los intervalos dados
export const getOverlappingCamillaReservations = async (timeSlots) => {
  const queries = timeSlots.map(([start_time, end_time]) =>
    supabase
      .from("reservas")
      .select()
      .eq("usaCamilla", true)
      .eq("estado", ReservationStatus.ACTIVA)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
  );
  const results = await Promise.all(queries);
  return results.flatMap((r) => r.data);
};

// Reciba userId y objeto filters como argumentos, y hace petición a Supabase para obtener las reservas que cumplen con esos criterios.
export const fetchUserReservations = async (
  userId,
  filters,
  currentPage = 1,
  itemsPerPage = 10
) => {
  // Calcula limit y offset para la paginación
  const limit = itemsPerPage;
  const offset = (currentPage - 1) * limit;

  let query = supabase
    .from("reservas")
    // Selecciona todas las columnas Y pide el conteo total exacto
    .select("*", { count: "exact" })
    .eq("usuario_id", userId)
    .order("start_time", { ascending: true }); // Ordena por fecha más antigua primero

  // Aplicar filtros adicionales
  if (filters.dateRange?.from) {
    query = query.gte("start_time", filters.dateRange.from.toISOString());
  }
  if (filters.dateRange?.to) {
    const endOfDay = dayjs(filters.dateRange.to).endOf("day").toISOString();
    query = query.lte("start_time", endOfDay); // Filtra por inicio <= fin del día del rango
  }
  if (filters.status && filters.status !== "Todos") {
    query = query.eq("estado", filters.status);
  }
  if (filters.consultorioId && filters.consultorioId !== "Todos") {
    query = query.eq("consultorio_id", filters.consultorioId);
  }
  if (filters.reservationType && filters.reservationType !== "Todos") {
    query = query.eq("tipo_reserva", filters.reservationType);
  }

  // Aplicar paginación con range()
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query; // Obtener data, error y count

  if (error) {
    console.error("Error fetching user reservations:", error);
    throw error;
  }

  // Devuelve un objeto con los datos de la página y el conteo total
  return { data: data || [], count: count || 0 };
};

export const _updateBookingStatus = async (
  bookingId,
  newStatus,
  cancellationDate,
  reagendarHastaDate
) => {
  // Validaciones básicas de entrada
  if (!bookingId || !newStatus || !cancellationDate) {
    throw new Error(
      "Faltan parámetros requeridos para actualizar el estado de la reserva."
    );
  }

  // Prepara el objeto con los datos a actualizar
  const updateData = {
    estado: newStatus,
    // Se asegura que cancellationDate sea un objeto Date antes de llamar a toISOString
    fecha_cancelacion:
      cancellationDate instanceof Date
        ? cancellationDate.toISOString()
        : new Date(cancellationDate).toISOString(),
    // Incluye permite_reagendar_hasta solo si se proporciona una fecha válida
    // Si reagendarHastaDate es null, Supabase actualizará el campo a NULL
    permite_reagendar_hasta:
      reagendarHastaDate instanceof Date
        ? reagendarHastaDate.toISOString()
        : null,
  };

  try {
    const { data: updatedBooking, error } = await supabase
      .from("reservas")
      .update(updateData)
      .eq("id", bookingId) // Filtra por el ID de la reserva
      .select() // Selecciona todas las columnas de la fila actualizada
      .single(); // Espera que solo una fila sea actualizada y devuelta

    if (error) {
      // Si Supabase devuelve un error, lánzalo para que sea manejado por el llamador
      console.error(`Supabase error updating booking ${bookingId}:`, error);
      throw error;
    }

    if (!updatedBooking) {
      // Esto podría pasar si el bookingId no existe
      throw new Error(
        `No se encontró la reserva con ID ${bookingId} para actualizar.`
      );
    }
    return updatedBooking; // Devuelve el objeto de la reserva actualizada
  } catch (error) {
    // Captura cualquier otro error (ej. de validación, red) y relánzalo
    console.error(`Failed to update status for booking ${bookingId}:`, error);
    // Es importante relanzar el error para que la función que llama (ej. cancelBooking) sepa que falló
    throw error;
  }
};

export const cancelBooking = async (bookingId, userId, userRole) => {
  // 1. Obtener la reserva a cancelar
  const { data: bookingToCancel, error: fetchError } = await supabase
    .from("reservas")
    .select("id, start_time, estado, usuario_id, reagendamiento_de_id")
    .eq("id", bookingId)
    .single();

  if (fetchError) {
    console.error("Error al obtener la reserva para cancelar:", fetchError);
    if (fetchError.code === "PGRST116") {
      throw new Error(`Reserva con ID ${bookingId} no encontrada.`);
    }
    throw new Error(`Error al buscar la reserva: ${fetchError.message}`);
  }

  // 2. Validaciones iniciales
  if (userRole !== "admin" && bookingToCancel.usuario_id !== userId) {
    throw new Error("No tienes permiso para cancelar esta reserva.");
  }
  if (bookingToCancel.estado !== ReservationStatus.ACTIVA) {
    throw new Error(
      `La reserva ya se encuentra en estado "${bookingToCancel.estado}" y no puede ser cancelada.`
    );
  }

  // 3. Calcular si se aplica penalización (lógica centralizada)
  const now = dayjs();
  const startTime = dayjs(bookingToCancel.start_time);
  const hoursDifference = startTime.diff(now, "hour");
  const isPenaltyApplicable = hoursDifference < 24;

  try {
    // 4. Lógica Condicional: ¿Es un Reagendamiento?
    if (bookingToCancel.reagendamiento_de_id) {
      // 4a. Si es un reagendamiento CANCELADO CON ANTICIPACIÓN
      if (!isPenaltyApplicable) {
        const updatedBookings = await revertReagendamiento(
          bookingId,
          bookingToCancel.reagendamiento_de_id,
          userId
        );
        return {
          actionType: "RESCHEDULE_REVERTED",
          updatedBookings,
        };
      }

      // 4b. Si es un reagendamiento CANCELADO CON PENALIZACIÓN
      const updatedBooking = await _updateBookingStatus(
        bookingId,
        ReservationStatus.PENALIZADA,
        now.toDate(), // fecha_cancelacion
        now.toDate() // reagendar_hasta (penalización inmediata)
      );
      return {
        actionType: "RESCHEDULE_PENALIZED",
        updatedBookings: [updatedBooking],
      };
    }

    // 5. Lógica de Cancelación Normal (NO es un reagendamiento)
    let newStatus;
    let reagendarHastaDate = null;
    let actionType;

    if (isPenaltyApplicable) {
      // 5a. Cancelación normal CON PENALIZACIÓN
      newStatus = ReservationStatus.PENALIZADA;
      actionType = "PENALIZED";
      reagendarHastaDate = dayjs(startTime)
        .add(6, "days")
        .endOf("day")
        .toDate();
    } else {
      // 5b. Cancelación normal SIN PENALIZACIÓN
      newStatus = ReservationStatus.CANCELADA;
      actionType = "CANCELLED";
    }

    const updatedBooking = await _updateBookingStatus(
      bookingId,
      newStatus,
      now.toDate(), // fecha_cancelacion
      reagendarHastaDate // reagendar_hasta
    );

    // SI ES PENALIZACIÓN CREA LA NOTIFICACIÓN AQUÍ ---
    if (actionType === "PENALIZED") {
      createNotification({
        usuario_id: userId,
        tipo: "REAGENDAMIENTO_DISPONIBLE",
        titulo: "Oportunidad de Reagendamiento",
        mensaje: `Tu reserva del ${dayjs(updatedBooking.start_time).format(
          "DD/MM[,] HH:mm[hs]"
        )} fue cancelada con penalización. Puedes reagendarla sin costo hasta el ${dayjs(
          updatedBooking.permite_reagendar_hasta
        ).format("dddd[, ]DD/MM/YYYY")}.`,
        enlace: "/dashboard",
        metadata: { reserva_id: updatedBooking.id },
      });
    }

    return {
      actionType,
      updatedBookings: [updatedBooking],
    };
  } catch (error) {
    // 6. Manejo de errores centralizado para actualizaciones
    console.error(
      `Falló la operación de cancelación para la reserva ${bookingId}:`,
      error
    );
    throw new Error(`No se pudo completar la cancelación: ${error.message}`);
  }
};

export const confirmarReagendamiento = async (
  newBookingData,
  penalizedBookingId,
  requestingUserId
) => {
  // El objeto newBookingData debe estar listo para ser enviado como JSON.
  // No necesita conversión aquí si ya tiene el formato correcto desde la UI.

  try {
    const { data: modifiedBookings, error } = await supabase.rpc(
      "handle_reagendamiento",
      {
        p_new_booking_data: newBookingData,
        p_penalized_booking_id: penalizedBookingId,
        p_requesting_user_id: requestingUserId,
      }
    );

    if (error) {
      // Si la RPC de Supabase devuelve un error (ej. por la validación o un problema de BD),
      // lo capturamos y lo lanzamos para que la UI lo maneje.
      console.error("Error al llamar a la RPC handle_reagendamiento:", error);
      throw error;
    }
    // La RPC devuelve un array de objetos de reserva completos, que es exactamente lo que necesitamos.
    // Asegurémonos de devolver un array, incluso si la RPC no devuelve nada.
    return modifiedBookings || [];
  } catch (error) {
    // Captura cualquier otro error (ej. de red) y relánzalo con un mensaje claro.
    console.error(
      `Error en la operación de reagendamiento para reserva ${penalizedBookingId}:`,
      error
    );
    // Es importante relanzar el error para que el componente que llama pueda manejarlo.
    throw new Error(`No se pudo completar el reagendamiento: ${error.message}`);
  }
};

// Función para llamar a la RPC de Revertir Reagendamiento.
export const revertReagendamiento = async (
  reagendadaBookingId,
  penalizedBookingId,
  requestingUserId
) => {
  const { data, error } = await supabase.rpc("revert_reagendamiento", {
    p_reagendada_booking_id: reagendadaBookingId,
    p_penalized_booking_id: penalizedBookingId,
    p_requesting_user_id: requestingUserId,
  });

  if (error) {
    console.error("Error al llamar a la RPC revert_reagendamiento:", error);
    throw error;
  }
  return data || [];
};

/**
 * Orquesta el proceso completo de renovación de una serie:
 * 1. Obtiene el patrón de la serie.
 * 2. Genera las nuevas reservas propuestas.
 * 3. Valida que no haya conflictos.
 * 4. Si no hay conflictos, llama a la RPC para extender y crear la serie.
 *
 * @param {string} oldRecurrenceId - El ID de la recurrencia que expira.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<object>} El resultado de la RPC si la operación es exitosa.
 * @throws {Error} Si se encuentran conflictos o si falla la RPC.
 */
export const renewAndValidateSeries = async (oldRecurrenceId, userId) => {
  // --- 1. Obtener el patrón de la serie antigua ---
  // Necesitamos una reserva de la serie para saber la hora, duración, consultorio, etc.
  const { data: baseEventPattern, error: patternError } = await supabase
    .from("reservas")
    .select("*")
    .eq("recurrence_id", oldRecurrenceId)
    .eq("usuario_id", userId)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  if (patternError) {
    throw new Error(
      `No se pudo encontrar la serie a renovar: ${patternError.message}`
    );
  }
  // --- 2. Generar las nuevas reservas propuestas en memoria ---
  const { newEvents, newRecurrenceEndDate } = generateRecurringEventsForRenewal(
    baseEventPattern,
    baseEventPattern.recurrence_end_date,
    4 // Duración fija en meses
  );

  if (!newEvents || newEvents.length === 0) {
    throw new Error(
      "No se generaron nuevas fechas para la renovación. Es posible que la serie ya esté extendida."
    );
  }

  // --- 3. Chequear conflictos ---
  // Aquí usamos la función que ya tenías, que debería devolver un objeto como
  // { conflictosConsultorio: [], conflictosCamilla: [] }
  const conflicts = await checkForConflicts(newEvents);

  if (
    conflicts.conflictosConsultorio.length > 0 ||
    conflicts.conflictosCamilla.length > 0
  ) {
    // Construir un mensaje de error detallado para mostrar al usuario
    const consultorioMsg =
      conflicts.conflictosConsultorio.length > 0
        ? `Consultorios ocupados en fechas: ${conflicts.conflictosConsultorio
            .map((c) => dayjs(c.start_time).format("DD/MM"))
            .join(", ")}`
        : "";
    const camillaMsg =
      conflicts.conflictosCamilla.length > 0
        ? `Camilla no disponible en fechas: ${conflicts.conflictosCamilla
            .map((c) => dayjs(c.start_time).format("DD/MM"))
            .join(", ")}`
        : "";

    const errorMessage =
      `No se puede renovar. ${consultorioMsg} ${camillaMsg}`.trim();
    console.error("Conflictos encontrados:", errorMessage, conflicts);
    throw new Error(errorMessage);
  }

  // --- 4. Llamar a la RPC de creación y extensión ---
  // Si no hubo conflictos, procedemos a llamar a la función que invoca la RPC.
  // Es importante pasarle el 'oldRecurrenceId' que es el que se mantiene.
  const result = await extendAndCreateSeries(
    oldRecurrenceId,
    newRecurrenceEndDate,
    newEvents,
    userId
  );

  return result; // Devuelve el resultado de la RPC (ej. { status: 'success', ... })
};

// Asegúrate de tener esta función puente a la RPC en el mismo archivo
// o importarla correctamente.
/**
 * Llama a la RPC para extender una serie y crear nuevas reservas.
 * @param {string} recurrenceId
 * @param {Date} newRecurrenceEndDate
 * @param {Array<object>} newBookings - Array de las nuevas reservas a crear.
 * @param {string} userId
 */
export const extendAndCreateSeries = async (
  recurrenceId,
  newRecurrenceEndDate,
  newBookings,
  userId
) => {
  try {
    const { data, error } = await supabase.rpc("extend_and_create_series", {
      p_recurrence_id: recurrenceId,
      p_new_recurrence_end_date:
        dayjs(newRecurrenceEndDate).format("YYYY-MM-DD"),
      p_new_bookings: newBookings,
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al llamar a la RPC extend_and_create_series:", error);
    throw new Error(
      `No se pudo extender la serie en la base de datos: ${error.message}`
    );
  }
};

/**
 * Permite a un administrador cambiar el estado de una reserva de 'penalizada' a 'cancelada'.
 * Llama a la RPC 'admin_forgive_penalties'.
 *
 * @param {string} bookingId - El ID de la reserva a modificar.
 * @param {string} adminUserId - El ID del administrador que realiza la acción.
 * @returns {Promise<object>} La reserva actualizada.
 */
export const forgivePenalty = async (bookingId, adminUserId) => {
  try {
    const { data, error } = await supabase
      .rpc("admin_forgive_penalties", {
        p_booking_id: bookingId,
        p_requesting_user_id: adminUserId,
      })
      .single(); // Esperamos un solo objeto de vuelta

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(
      `Error al perdonar la penalización para la reserva ${bookingId}:`,
      error
    );
    throw new Error(
      `No se pudo actualizar el estado de la reserva: ${error.message}`
    );
  }
};
