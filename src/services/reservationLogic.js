import { confirmarReagendamiento, createReservations } from "@/supabase";
import {
  checkForConflicts,
  mapEventsToReservations,
  mapReservationToEvent,
} from "@/utils/calendarUtils";
import dayjs from "dayjs";
import { useEventStore } from "@/stores/calendarStore";
import { useUIStore } from "@/stores/uiStore";

// Función para confirmar reservas
export const confirmarReserva = async (hourlyEvents) => {
  const {
    startLoading,
    stopLoading,
    setError,
    showToast,
    clearError,
    stopReagendamientoMode,
  } = useUIStore.getState();
  const { addEvent, updateEvent } = useEventStore.getState();

  // Verificar conflictos con reservas existentes
  const { conflictosConsultorio, conflictosCamilla } = await checkForConflicts(
    hourlyEvents
  );

  // Si hay conflictos con camillas, lanzar un error
  if (conflictosCamilla.length > 0) {
    throw new Error(
      `La camilla está ocupada: ${conflictosCamilla
        .map(
          (r) =>
            `${dayjs(r.start_time).format("D[/]M[/]YYYY - HH:mm")}-${dayjs(
              r.end_time
            ).format("HH:mm")}`
        )
        .join(", ")}`
    );
  }

  // Si hay conflictos con consultorios, lanzar un error
  if (conflictosConsultorio.length > 0) {
    const conflictos = conflictosConsultorio
      .map(
        (r) =>
          `Consultorio ${r.consultorio_id} - ${dayjs(r.start_time).format(
            "D[/]M[/]YYYY - HH:mm"
          )} - ${dayjs(r.end_time).format("HH:mm")}`
      )
      .join("\n");
    throw new Error(`Horarios ocupados detectados:\n${conflictos}`);
  }

  const eventData = hourlyEvents?.[0];
  if (!eventData) return;

  clearError();
  startLoading();
  try {
    const isReagendamiento = !!eventData.reagendamiento_de_id;

    if (isReagendamiento) {
      // --- Lógica de Reagendamiento ---
      const newBookingData = {
        // Construye el objeto de datos que espera tu RPC, sin el id de reagendamiento
        consultorio_id: eventData.resourceId,
        usuario_id: eventData.usuario_id,
        tipo_reserva: eventData.tipo_reserva,
        start_time: dayjs(eventData.start_time).toISOString(),
        end_time: dayjs(eventData.end_time).toISOString(),
        titulo: eventData.titulo,
        usaCamilla: eventData.usaCamilla,
      };
      console.log(newBookingData);
      const penalizedBookingId = eventData.reagendamiento_de_id;
      const requestingUserId = eventData.usuario_id;

      // Llama al servicio que invoca la RPC
      const modifiedBookings = await confirmarReagendamiento(
        newBookingData,
        penalizedBookingId,
        requestingUserId
      );

      // Actualiza el store de Zustand con las reservas devueltas por la RPC
      if (Array.isArray(modifiedBookings)) {
        modifiedBookings.forEach((booking) => {
          const formattedEvent = mapReservationToEvent(booking); // Formatea para el calendario
          if (booking.id === penalizedBookingId) {
            updateEvent(formattedEvent); // Actualiza la original (ahora 'reagendada')
          } else {
            addEvent(formattedEvent); // Añade la nueva reserva
          }
        });
      }

      showToast({
        type: "success",
        title: "Reagendamiento Exitoso",
        message: "La reserva ha sido reagendada correctamente.",
      });
      stopReagendamientoMode(); // <-- Clave: Salir del modo reagendamiento
      return modifiedBookings;
    } else {
      // --- Lógica de Reserva Normal ---
      const reservasParaInsertar = mapEventsToReservations(hourlyEvents);
      const createdBookings = await createReservations(reservasParaInsertar);
      console.log(createdBookings);

      // Añade las nuevas reservas al store
      createdBookings.forEach((booking) => {
        const formattedEvent = mapReservationToEvent(booking);
        addEvent(formattedEvent);
      });

      showToast({
        type: "success",
        title: "Confirmado",
        message: "Las reservas se han guardado correctamente.",
      });
      return createdBookings;
    }
  } catch (error) {
    setError(error);
    showToast({
      type: "error",
      title: "Error en la Confirmación",
      message: error.message,
    });
  } finally {
    stopLoading();
  }
};

// -> VERSION ANTERIOR
// Mapear los eventos a reservas e insertarlas en la base de datos
// const reservasParaInsertar = mapEventsToReservations(hourlyEvents);
// const data = await createReservations(reservasParaInsertar);
// return data; // Devolver los datos insertados para uso en el componente;
