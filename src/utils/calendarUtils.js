import { useEventStore } from "@/stores/calendarStore";
import {
  getOverlappingCamillaReservations,
  getOverlappingReservationsForConsultorio,
} from "@/supabase";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { v4 as uuidv4 } from "uuid";
import { ReservationStatus, ReservationType } from "./constants";

dayjs.extend(isSameOrBefore);

// Formatea los eventos de DB para formato del Calendario
export const mapReservationToEvent = (reserva) => ({
  ...reserva,
  start_time: new Date(reserva.start_time),
  end_time: new Date(reserva.end_time),
  resourceId: reserva.consultorio_id,
  tipo_reserva: reserva.tipo_reserva,
  estado: reserva.estado,
});

// Formatea los eventos de DB para formato del Calendario
export const mapNewReservationToEvent = (reserva) => ({
  ...reserva,
  start: new Date(reserva.start),
  end: new Date(reserva.end),
});

// Formatea los eventos del calendario para guardarlos en la DB.
export const mapEventsToReservations = (hourlyEvents) => {
  return hourlyEvents.map((event) => ({
    consultorio_id: event.resourceId,
    usuario_id: event.usuario_id,
    tipo_reserva: event.tipo_reserva,
    titulo: event.titulo,
    start_time: dayjs(event.start_time).toISOString(),
    end_time: dayjs(event.end_time).toISOString(),
    estado: event.status || ReservationStatus.ACTIVE,
    usaCamilla: event.usaCamilla,
    recurrence_id: event.recurrence_id || null,
    recurrence_end_date: event.recurrence_end_date || null,
  }));
};

//Maneja la navegación en el calendario
export const handleNavigate = (newDate, setCurrentDate) => {
  setCurrentDate(newDate);
  const weekOfYearToLoad = dayjs(newDate).week();
  const yearToLoad = dayjs(newDate).year();
  useEventStore.getState().fetchEventsByWeek(weekOfYearToLoad, yearToLoad); // Carga eventos de esa semana
};

// Generar serie de reservas FIJAS
export const generateRecurringEvents = (baseEvent, durationInMonths = 2) => {
  const events = [];
  const startDate = dayjs(baseEvent.start_time);
  const endDate = dayjs(baseEvent.end_time);
  const recurrenceEnd = startDate.add(durationInMonths, "months");

  let currentStart = startDate;
  let currentEnd = endDate;
  const recurrenceId = uuidv4();

  while (currentStart.isBefore(recurrenceEnd)) {
    events.push({
      ...baseEvent,
      start_time: currentStart.toDate(),
      end_time: currentEnd.toDate(),
      tipo_reserva: ReservationType.FIJA,
      recurrence_end_date: recurrenceEnd.toDate(),
      recurrence_id: recurrenceId,
    });

    currentStart = currentStart.add(1, "week");
    currentEnd = currentEnd.add(1, "week");
  }
  console.log(events);
  return events;
};

// Verificar conflictos de consultorio y camilla
export const checkForConflicts = async (hourlyEvents) => {
  console.log(hourlyEvents);
  // Obtener reservas superpuestas para consultorios
  const consultoriosIds = [
    ...new Set(hourlyEvents.map((e) => e.consultorio_id)),
  ];
  console.log(consultoriosIds);
  const consultorioConflicts = await Promise.all(
    consultoriosIds.map(async (consultorioId) => {
      const timeSlots = hourlyEvents
        .filter((e) => e.consultorio_id === consultorioId)
        .map((e) => [
          dayjs(e.start_time).toISOString(),
          dayjs(e.end_time).toISOString(),
        ]);

      const overlapping = await getOverlappingReservationsForConsultorio(
        consultorioId,
        timeSlots
      );
      return overlapping;
    })
  );

  // Obtener reservas superpuestas para camilla
  const eventosConCamilla = hourlyEvents.filter((e) => e.usaCamilla);
  let camillaConflicts = [];
  if (eventosConCamilla.length > 0) {
    const camillaTimeSlots = eventosConCamilla.map((e) => [
      dayjs(e.start_time).toISOString(),
      dayjs(e.end_time).toISOString(),
    ]);
    camillaConflicts = await getOverlappingCamillaReservations(
      camillaTimeSlots
    );
  }

  // Combinar y devolver los conflictos
  return {
    conflictosConsultorio: consultorioConflicts.flat(),
    conflictosCamilla: camillaConflicts,
  };
};

/**
 * Genera un array de objetos de reserva para un nuevo ciclo de recurrencia,
 * saltando de semana en semana para mayor eficiencia.
 *
 * @param {object} baseEventPattern - Un objeto de una reserva existente de la serie para obtener el patrón.
 *   Debe contener: start_time, end_time, consultorio_id, usuario_id, titulo, usaCamilla, recurrence_id.
 * @param {Date|string} oldEndDate - La fecha en que termina el ciclo actual de la serie.
 * @param {number} [durationInMonths=6] - La duración del nuevo ciclo en meses.
 * @returns {{newEvents: Array<object>, newRecurrenceEndDate: Date}} Un objeto con los nuevos eventos y la nueva fecha de fin.
 */
export const generateRecurringEventsForRenewal = (
  baseEventPattern,
  oldEndDate,
  durationInMonths = 6
) => {
  // 1. Preparación de Variables y Fechas
  const events = []; // Array para almacenar las nuevas reservas

  // La nueva fecha de finalización para TODA la serie (viejas y nuevas).
  const newRecurrenceEndDate = dayjs(oldEndDate).add(
    durationInMonths,
    "months"
  );

  // Convertimos las horas de la reserva base a objetos Dayjs para fácil manipulación
  const baseStartTime = dayjs(baseEventPattern.start_time);
  const baseEndTime = dayjs(baseEventPattern.end_time);

  // 2. Calcular el punto de partida para el nuevo ciclo.
  // Tomamos la fecha de inicio de la reserva base y le sumamos semanas
  // hasta que sea posterior a la fecha de fin del ciclo antiguo.
  let currentStart = baseStartTime;
  while (currentStart.isSameOrBefore(dayjs(oldEndDate))) {
    currentStart = currentStart.add(1, "week");
  }

  // Hacemos lo mismo para la fecha de fin para mantener la duración correcta.
  let currentEnd = baseEndTime;
  while (currentEnd.isSameOrBefore(dayjs(oldEndDate))) {
    currentEnd = currentEnd.add(1, "week");
  }

  // 3. Bucle de Generación (Saltando por semana)
  // El bucle continuará mientras la fecha de inicio que estamos generando
  // sea anterior o igual a la nueva fecha de finalización de la serie.
  while (currentStart.isSameOrBefore(newRecurrenceEndDate)) {
    // 4. Construcción del Nuevo Objeto de Evento
    events.push({
      // Usamos los datos del patrón de la reserva base.
      // Estos nombres ( usaCamilla) son los que espera la RPC en el JSON.
      consultorio_id: baseEventPattern.consultorio_id,
      usuario_id: baseEventPattern.usuario_id,
      titulo: baseEventPattern.titulo,
      usaCamilla: baseEventPattern.usaCamilla,
      tipo_reserva: ReservationType.FIJA,
      estado: "activa",
      fecha_cancelacion: null,
      reagendamiento_de_id: null,
      permite_reagendar_hasta: null,
      fue_reagendada: false,

      // Asignamos las nuevas fechas y la información de recurrencia
      start_time: currentStart.toDate(), // Convertimos de dayjs a objeto Date de JS
      end_time: currentEnd.toDate(),
      recurrence_id: baseEventPattern.recurrence_id, // ¡Importante! Mantenemos el ID de recurrencia existente
      recurrence_end_date: newRecurrenceEndDate.toDate(), // Usamos la nueva fecha final
    });

    // 5. Incrementar el Iterador (una semana a la vez)
    currentStart = currentStart.add(1, "week");
    currentEnd = currentEnd.add(1, "week");
  }

  console.log(`Se generaron ${events.length} nuevas reservas propuestas.`);
  console.log(events);
  console.log(newRecurrenceEndDate);

  // 6. Retorno de Resultados
  // Devolvemos un objeto que contiene tanto el array de nuevos eventos
  // como la nueva fecha final de la serie.
  return {
    newEvents: events,
    newRecurrenceEndDate: newRecurrenceEndDate.toDate(),
  };
};
