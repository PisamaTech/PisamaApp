import { ReservationStatus } from "@/utils/constants";
import { supabase } from "./index";
import dayjs from "dayjs";

export const createReservations = async (reservations) => {
  const { data, error } = await supabase
    .from("reservas")
    .insert(reservations)
    .select();

  if (error) throw error;
  return data;
};

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
  }));
};

export const checkForExistingReservations = async (hourlyEvents) => {
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
            ([start, end]) => `and(start_time.lte.${end},end_time.gte.${start})`
          )
          .join(",")
      )
      .throwOnError();
  });

  const results = await Promise.all(queries);
  return results.flatMap((r) => r.data);
};
