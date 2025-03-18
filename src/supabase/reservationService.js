import { ReservationStatus, ReservationType } from "@/utils/constants";
import { supabase } from "./index";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";

// Función para insertar reservas en Supabase
export const createReservations = async (reservations) => {
  const { data, error } = await supabase
    .from("reservas")
    .insert(reservations)
    .select();

  if (error) throw error;
  return data;
};

export const fetchEventsFromDatabase = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error loading reservations:", error);
    return error;
  }
};

// Formatea los eventos del calendario para guardarlos en la base de datos.
export const mapEventsToReservations = (hourlyEvents) => {
  return hourlyEvents.map((event) => ({
    consultorio_id: event.resourceId,
    usuario_id: event.usuario_id,
    tipo_reserva: event.tipo,
    titulo: event.titulo,
    start_time: dayjs(event.start).toISOString(),
    end_time: dayjs(event.end).toISOString(),
    estado: event.status || ReservationStatus.ACTIVE,
    usaCamilla: event.usaCamilla,
    recurrence_id: event.recurrence_id || null,
    recurrence_end_date: event.recurrence_end_date || null,
  }));
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

// Generar serie de reservas FIJAS
export const generateRecurringEvents = (baseEvent) => {
  const events = [];
  const startDate = dayjs(baseEvent.start);
  const endDate = dayjs(baseEvent.end);
  const recurrenceEnd = startDate.add(2, "months");

  let currentStart = startDate;
  let currentEnd = endDate;
  const recurrenceId = uuidv4();

  while (currentStart.isBefore(recurrenceEnd)) {
    events.push({
      ...baseEvent,
      start: currentStart.toDate(),
      end: currentEnd.toDate(),
      tipo: ReservationType.FIJA,
      recurrence_end_date: recurrenceEnd.toDate(),
      recurrence_id: recurrenceId,
    });

    currentStart = currentStart.add(1, "week");
    currentEnd = currentEnd.add(1, "week");
  }
  return events;
};

// Cancelar una reserva unica
export const cancelSingleReservation = async (reservationId) => {
  console.log(reservationId);
  const { data, error } = await supabase
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", reservationId)
    .single();

  if (error) throw error;
  return data;
};

// Cancelar una serie de reserva fijas
export const cancelRecurringSeries = async (recurrenceId) => {
  const { data, error } = await supabase
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("recurrence_id", recurrenceId)
    .gte("start_time", new Date().toISOString());

  if (error) throw error;
  return data;
};
