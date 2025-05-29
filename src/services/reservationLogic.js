import { createReservations } from "@/supabase";
import {
  checkForConflicts,
  mapEventsToReservations,
} from "@/utils/calendarUtils";
import dayjs from "dayjs";

// Función para confirmar reservas
export const confirmarReserva = async (hourlyEvents) => {
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

  // Mapear los eventos a reservas e insertarlas en la base de datos
  const reservasParaInsertar = mapEventsToReservations(hourlyEvents);
  const data = await createReservations(reservasParaInsertar);
  return data; // Devolver los datos insertados para uso en el componente;
};
