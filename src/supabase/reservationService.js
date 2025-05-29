import { ReservationStatus } from "@/utils/constants";
import { supabase } from "./index";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"; // Para comparar fechas
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"; // Para comparar fechas

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
  userId,
  cancellationRequestDate
) => {
  console.log(
    `Llamando a RPC para cancelar serie recurrenceId: ${recurrenceId}, usuario: ${userId}`
  );

  // Asegúrate de que cancellationRequestDate es un objeto Date y luego conviértelo a ISO string
  const cancellationDateISO =
    cancellationRequestDate instanceof Date
      ? cancellationRequestDate.toISOString()
      : new Date(cancellationRequestDate).toISOString();

  try {
    const { data, error } = await supabase.rpc(
      "cancel_recurring_series_with_penalty",
      {
        p_recurrence_id: recurrenceId,
        p_user_id: userId,
        p_cancellation_request_date: cancellationDateISO, // Pasa la fecha como ISO string
      }
    );

    if (error) {
      console.error(
        "Error al llamar a la RPC cancel_recurring_series_with_penalty:",
        error
      );
      throw error; // Relanza el error para que el llamador lo maneje
    }

    console.log("Resultado de la RPC para cancelación de serie:", data);
    // 'data' contendrá lo que retorna tu función RPC (el JSONB)
    // Puedes necesitar procesar 'data.modified_ids' para obtener las reservas completas
    // y actualizar el eventStore.
    // Por ahora, simplemente devolvemos el resultado directo de la RPC.
    return data;
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
  const queries = timeSlots.map(([start, end]) =>
    supabase
      .from("reservas")
      .select()
      .eq("consultorio_id", consultorioId)
      .eq("estado", ReservationStatus.ACTIVA)
      .lt("start_time", end)
      .gt("end_time", start)
  );
  const results = await Promise.all(queries);
  return results.flatMap((r) => r.data);
};

// Obtener reservas que usan camilla y se superponen con los intervalos dados
export const getOverlappingCamillaReservations = async (timeSlots) => {
  const queries = timeSlots.map(([start, end]) =>
    supabase
      .from("reservas")
      .select()
      .eq("usaCamilla", true)
      .eq("estado", ReservationStatus.ACTIVA)
      .lt("start_time", end)
      .gt("end_time", start)
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
    .order("start_time", { ascending: false }); // Ordena por fecha más reciente primero

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

  console.log(
    `Attempting to update booking ${bookingId} with data:`,
    updateData
  ); // Log para depuración

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

    console.log(`Booking ${bookingId} status updated successfully.`);
    return updatedBooking; // Devuelve el objeto de la reserva actualizada
  } catch (error) {
    // Captura cualquier otro error (ej. de validación, red) y relánzalo
    console.error(`Failed to update status for booking ${bookingId}:`, error);
    // Es importante relanzar el error para que la función que llama (ej. cancelBooking) sepa que falló
    throw error;
  }
};

export const cancelBooking = async (bookingId, userId) => {
  console.log(
    `Iniciando cancelación para reserva ID: ${bookingId} por usuario ID: ${userId}`
  );

  // 1. Obtener la reserva a cancelar
  let bookingToCancel;
  try {
    const { data, error } = await supabase
      .from("reservas")
      .select("id, start_time, estado, usuario_id, tipo_reserva, recurrence_id") // Selecciona solo los campos necesarios
      .eq("id", bookingId)
      .single(); // Espera encontrar exactamente una

    if (error && error.code !== "PGRST116") {
      // Ignora error 'PGRST116' (0 rows) por ahora
      throw error; // Lanza otros errores de Supabase
    }
    if (!data) {
      throw new Error(`Reserva con ID ${bookingId} no encontrada.`);
    }
    bookingToCancel = data;
    console.log("Reserva encontrada:", bookingToCancel);
  } catch (error) {
    console.error("Error al obtener la reserva para cancelar:", error);
    throw new Error(`Error al buscar la reserva: ${error.message}`); // Relanza con mensaje más descriptivo
  }

  // 2. Validar Propietario
  if (bookingToCancel.usuario_id !== userId) {
    console.warn(
      `Intento de cancelación no autorizado: Usuario ${userId} intentó cancelar reserva ${bookingId} de usuario ${bookingToCancel.usuario_id}`
    );
    throw new Error("No tienes permiso para cancelar esta reserva.");
  }
  console.log("Validación de propietario exitosa.");

  // 3. Validar Estado Actual
  if (bookingToCancel.estado !== ReservationStatus.ACTIVA) {
    // Usa tu constante
    console.warn(
      `Intento de cancelar reserva ${bookingId} con estado no válido: ${bookingToCancel.estado}`
    );
    throw new Error(
      `La reserva ya se encuentra en estado "${bookingToCancel.estado}" y no puede ser cancelada.`
    );
  }
  console.log("Validación de estado exitosa.");

  // 4. Calcular Diferencia Horaria y Penalización
  const now = dayjs();
  const startTime = dayjs(bookingToCancel.start_time);
  const hoursDifference = startTime.diff(now, "hour"); // Diferencia en horas
  const isPenaltyApplicable = hoursDifference <= 24;

  console.log(
    `Diferencia horaria: ${hoursDifference} horas. Aplica penalización: ${isPenaltyApplicable}`
  );

  // 5. Determinar Nuevo Estado y Fecha Límite de Reagendamiento
  let newStatus;
  let reagendarHastaDate = null;
  const cancellationDate = new Date(); // Fecha/hora actual de cancelación

  if (isPenaltyApplicable) {
    newStatus = ReservationStatus.PENALIZADA; // Usa tu constante
    reagendarHastaDate = dayjs(startTime).add(6, "days").endOf("day").toDate(); // Calcula fecha límite
    console.log(
      `Nuevo estado: ${newStatus}, Permite reagendar hasta: ${reagendarHastaDate}`
    );
  } else {
    newStatus = ReservationStatus.CANCELADA; // Usa tu constante
    console.log(`Nuevo estado: ${newStatus}`);
  }

  // 6. Actualizar la reserva en la Base de Datos usando la función auxiliar
  try {
    // Llama a la función auxiliar para hacer la actualización real en la BD
    const updatedBooking = await _updateBookingStatus(
      bookingId,
      newStatus,
      cancellationDate,
      reagendarHastaDate
    );

    console.log(`Reserva ${bookingId} cancelada/penalizada exitosamente.`);
    return updatedBooking; // Devuelve la reserva actualizada
  } catch (error) {
    console.error(
      `Error al actualizar el estado de la reserva ${bookingId} en la base de datos:`,
      error
    );
    // Relanza el error para que el componente UI lo maneje (mostrar toast)
    throw new Error(`No se pudo actualizar la reserva: ${error.message}`);
  }
};
