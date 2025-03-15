import { create } from "zustand";
import dayjs from "dayjs";
import { supabase } from "@/supabase";

export const useCalendarStore = create((set, get) => ({
  events: {},
  loadingRanges: new Set(),
  currentConsultorio: "all",

  // Acciones
  loadEvents: async (consultorioId, start, end) => {
    const cacheKey = `${consultorioId}-${dayjs(start).format(
      "YYYY-MM-DD"
    )}-${dayjs(end).format("YYYY-MM-DD")}`;

    // Evitar cargas duplicadas
    if (get().loadingRanges.has(cacheKey)) return;

    set((state) => ({
      loadingRanges: new Set([...state.loadingRanges, cacheKey]),
    }));

    try {
      let query = supabase
        .from("reservas")
        .select("*")
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString());

      if (consultorioId !== "all") {
        query = query.eq("consultorio_id", consultorioId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const normalizedData = data.map((event) => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        resourceId: event.consultorio_id.toString(),
      }));

      set((state) => ({
        events: {
          ...state.events,
          [consultorioId]: {
            ...(state.events[consultorioId] || {}),
            [cacheKey]: normalizedData,
          },
        },
      }));
    } finally {
      set((state) => {
        const newLoading = new Set(state.loadingRanges);
        newLoading.delete(cacheKey);
        return { loadingRanges: newLoading };
      });
    }
  },

  getEvents: (consultorioId, view) => {
    const currentDate = dayjs();
    const rangeStart = currentDate.startOf(view);
    const rangeEnd = currentDate.endOf(view);

    return Object.values(get().events[consultorioId] || {})
      .flat()
      .filter(
        (event) =>
          dayjs(event.start).isBetween(rangeStart, rangeEnd, null, "[]") &&
          event.estado !== "cancelada"
      );
  },

  addEvents: (newEvents) => {
    set((state) => {
      const updatedEvents = { ...state.events };
      newEvents.forEach((event) => {
        const consultorio = event.resourceId;
        const dateKey = dayjs(event.start).format("YYYY-MM-DD");

        if (!updatedEvents[consultorio]) updatedEvents[consultorio] = {};
        if (!updatedEvents[consultorio][dateKey])
          updatedEvents[consultorio][dateKey] = [];

        updatedEvents[consultorio][dateKey].push(event);
      });
      return { events: updatedEvents };
    });
  },
}));
