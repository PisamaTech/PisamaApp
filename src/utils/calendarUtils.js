import { useEventStore } from "@/stores/calendarStore";
import {
  getOverlappingCamillaReservations,
  getOverlappingReservationsForConsultorio,
} from "@/supabase";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { ReservationStatus, ReservationType } from "./constants";

// Formatea los eventos de DB para formato del Calendario
export const mapReservationToEvent = (reserva) => ({
  ...reserva,
  start: new Date(reserva.start_time),
  end: new Date(reserva.end_time),
  resourceId: reserva.consultorio_id,
  tipo: reserva.tipo_reserva,
  status: reserva.estado,
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

//Maneja la navegación en el calendario
export const handleNavigate = (newDate, setCurrentDate) => {
  setCurrentDate(newDate);
  const weekOfYearToLoad = dayjs(newDate).week();
  const yearToLoad = dayjs(newDate).year();
  useEventStore.getState().fetchEventsByWeek(weekOfYearToLoad, yearToLoad); // Carga eventos de esa semana
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

// Verificar conflictos de consultorio y camilla
export const checkForConflicts = async (hourlyEvents) => {
  // Obtener reservas superpuestas para consultorios
  const consultoriosIds = [...new Set(hourlyEvents.map((e) => e.resourceId))];
  const consultorioConflicts = await Promise.all(
    consultoriosIds.map(async (consultorioId) => {
      const timeSlots = hourlyEvents
        .filter((e) => e.resourceId === consultorioId)
        .map((e) => [dayjs(e.start).toISOString(), dayjs(e.end).toISOString()]);
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
      dayjs(e.start).toISOString(),
      dayjs(e.end).toISOString(),
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
