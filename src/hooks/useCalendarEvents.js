import { useState } from "react";
import { supabase } from "@/supabase";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/uiStore";

export const useCalendarEvents = () => {
  const { startLoading, stopLoading } = useUIStore();
  const [events, setEvents] = useState([]);
  // const [loadedRanges, setLoadedRanges] = useState(new Set());
  const [lastLoadedDate, setLastLoadedDate] = useState(null);

  const mapReservationToEvent = (reserva) => ({
    ...reserva,
    start: new Date(reserva.start_time),
    end: new Date(reserva.end_time),
    resourceId: reserva.consultorio_id,
    tipo: reserva.tipo_reserva,
    status: reserva.estado,
  });

  const loadNextMonth = async (baseDate) => {
    const monthStart = dayjs(baseDate).startOf("month");
    const monthEnd = monthStart.add(1, "month").endOf("month");
    // Si ya cargamos este mes, no hacer nada
    console.log(lastLoadedDate);
    console.log(monthEnd);
    console.log(monthEnd.isSameOrBefore(lastLoadedDate, "day"));
    if (lastLoadedDate && monthEnd.isSameOrBefore(lastLoadedDate, "day")) {
      console.log("Estamos acá!");
      return;
    }

    startLoading();
    try {
      console.log("Estmoas pidiendo reservas");
      const { data, error } = await supabase
        .from("reservas")
        .select("*")
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", monthEnd.toISOString());

      if (error) throw error;

      console.log(data);
      const newEvents = data.map(mapReservationToEvent);
      setEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        console.log(existingIds);
        return [...prev, ...newEvents.filter((e) => !existingIds.has(e.id))];
      });

      setLastLoadedDate(monthEnd);
    } catch (error) {
      console.error("Error loading reservations:", error);
    } finally {
      stopLoading();
    }
  };

  return { events, setEvents, loadNextMonth, lastLoadedDate };
};
