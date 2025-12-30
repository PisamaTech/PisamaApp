import { create } from "zustand";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { fetchEventsFromDatabase } from "@/supabase";
import { mapReservationToEvent } from "@/utils/calendarUtils";
import { useUIStore } from "@/stores/uiStore"; // Importa useUIStore
import { ReservationStatus } from "@/utils/constants";

// Extiende dayjs con el plugin para poder acceder al número de cada semana del año.
dayjs.extend(weekOfYear);

export const useEventStore = create((set, get) => ({
  events: [],
  loadedWeeksOfYear: [], // Mantenemos el registro de semanas cargadas para optimización

  // Función para cargar eventos por semana del año
  fetchEventsByWeek: async (weekOfYearToLoad, yearToLoad) => {
    const { startLoading, stopLoading, setError, clearError } =
      useUIStore.getState();

    // Optimización: Evitar cargar la misma semana repetidamente
    const weekKey = `${yearToLoad}-${weekOfYearToLoad}`;
    if (get().loadedWeeksOfYear.includes(weekKey)) {
      return;
    }

    startLoading("Cargando eventos..."); // Inicia el loading global de UIStore
    clearError(); // Limpia cualquier error previo en UIStore

    // Calcula el rango de fechas para la semana del año
    // Usamos el 4 de enero del año como referencia (siempre está en la semana 1 ISO)
    // y luego sumamos las semanas necesarias
    const jan4 = dayjs(`${yearToLoad}-01-04`);
    const targetWeek = jan4.week(weekOfYearToLoad);
    const startDateOfWeek = targetWeek.startOf("week").toDate();
    const endDateOfWeek = targetWeek.endOf("week").toDate();

    try {
      const fetchedReservations = await fetchEventsFromDatabase(
        startDateOfWeek,
        endDateOfWeek
      );

      // Obtener los IDs existentes en el store actual
      const existingEventIds = get().events.map((event) => event.id);

      // Filtrar eventos nuevos (que no existan en el store)
      const formattedEvents = fetchedReservations
        .filter((reservation) => !existingEventIds.includes(reservation.id))
        .map(mapReservationToEvent);

      set((state) => ({
        events: [...state.events, ...formattedEvents],
        loadedWeeksOfYear: [...state.loadedWeeksOfYear, weekKey], // Guarda la semana cargada
      }));
      stopLoading(); // Detiene el loading global de UIStore
      return formattedEvents;
    } catch (error) {
      console.error(
        `Error al cargar eventos para la semana ${weekOfYearToLoad} del año ${yearToLoad}:`,
        error
      );
      setError(error); // Setea el error en UIStore
      stopLoading(); // Detiene el loading global de UIStore (incluso en caso de error)
      return null;
    }
  },
  // Función para carga inicial: carga varias semanas alrededor de la semana actual
  loadInitialEvents: async () => {
    const { startLoading, stopLoading, setError, clearError } =
      useUIStore.getState();

    const now = dayjs();

    // Usar la fecha actual como referencia y calcular semana anterior y siguiente
    // Esto evita problemas con el cambio de año
    const initialStartDate = now.subtract(1, "week").startOf("week").toDate();
    const initialEndDate = now.add(1, "week").endOf("week").toDate();

    startLoading("Cargando eventos..."); 
    clearError();
    try {
      const fetchedReservations = await fetchEventsFromDatabase(
        initialStartDate,
        initialEndDate
      );
      const formattedEvents = fetchedReservations.map(mapReservationToEvent);

      // Generar las keys de las semanas cargadas usando las fechas reales
      const weeksLoaded = [
        now.subtract(1, "week"),
        now,
        now.add(1, "week"),
      ];

      const loadedKeys = weeksLoaded.map((d) => {
        return `${d.year()}-${d.week()}`;
      });

      set((state) => ({
        events: [...state.events, ...formattedEvents],
        loadedWeeksOfYear: [...state.loadedWeeksOfYear, ...loadedKeys], 
      }));
      stopLoading(); 
      return formattedEvents;
    } catch (error) {
      setError(error); 
      stopLoading(); 
      return null;
    }
  },

  clearEvents: () => {
    set({ events: [], loadedWeeksOfYear: [] }); // Limpia estados locales de EventStore
    useUIStore.getState().clearError(); // Limpia error en UIStore
  },

  updateMultipleEventsStatusToCancelled: (eventIds, cancellationDate) =>
    set((state) => {
      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return {}; // No hacer nada si no hay IDs o no es un array
      }
      const cancellationDateISO =
        cancellationDate instanceof Date
          ? cancellationDate.toISOString()
          : new Date(cancellationDate).toISOString();

      return {
        events: state.events.map((event) => {
          if (eventIds.includes(event.id)) {
            // Si el ID del evento está en la lista de IDs a cancelar
            return {
              ...event,
              estado: ReservationStatus.CANCELADA, // Usa tu constante para 'cancelada'
              fecha_cancelacion: cancellationDateISO,
              permite_reagendar_hasta: null,
              fue_reagendada: false,
            };
          }
          return event; // Devuelve el evento sin cambios si no está en la lista
        }),
      };
    }),

  addEvent: (newEvent) =>
    set((state) => ({
      events: [
        ...state.events,
        ...(Array.isArray(newEvent) ? newEvent : [newEvent]),
      ],
    })),

  updateEvent: (updatedEvent) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      ),
    })),

  deleteEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
    })),
}));
