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
      useUIStore.getState(); // Obtiene funciones de UIStore

    // Optimización: Evitar cargar la misma semana repetidamente
    const weekKey = `${yearToLoad}-${weekOfYearToLoad}`;
    if (get().loadedWeeksOfYear.includes(weekKey)) {
      return;
    }

    startLoading("Cargando eventos..."); // Inicia el loading global de UIStore
    clearError(); // Limpia cualquier error previo en UIStore

    // Calcula el rango de fechas para la semana del año
    const startDateOfWeek = dayjs()
      .year(yearToLoad)
      .week(weekOfYearToLoad)
      .startOf("week")
      .toDate();
    const endDateOfWeek = dayjs()
      .year(yearToLoad)
      .week(weekOfYearToLoad)
      .endOf("week")
      .toDate();

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
      useUIStore.getState(); // Obtiene funciones de UIStore

    const now = dayjs();
    const currentWeekOfYear = now.week();
    const currentCalendarYear = now.year();
    const currentMonth = now.month();

    // Calcular el "Año de la Semana" (ISO Week Year aproximado)
    let yearForWeek = currentCalendarYear;
    if (currentWeekOfYear === 1 && currentMonth === 11) {
      yearForWeek = yearForWeek + 1;
    } else if (currentWeekOfYear >= 52 && currentMonth === 0) {
      yearForWeek = yearForWeek - 1;
    }

    // Calcula la fecha de inicio de la semana previa
    const initialStartDate = dayjs()
      .year(yearForWeek)
      .week(currentWeekOfYear - 1)
      .startOf("week")
      .toDate();
    // Calcula la fecha de fin de la semana siguiente
    const initialEndDate = dayjs()
      .year(yearForWeek)
      .week(currentWeekOfYear + 1)
      .endOf("week")
      .toDate();

    startLoading("Cargando eventos..."); 
    clearError();
    try {
      const fetchedReservations = await fetchEventsFromDatabase(
        initialStartDate,
        initialEndDate
      );
      const formattedEvents = fetchedReservations.map(mapReservationToEvent);

      const weeksToLoad = [
        currentWeekOfYear,
        currentWeekOfYear + 1,
        currentWeekOfYear - 1,
      ];

      const loadedKeys = weeksToLoad.map((w) => {
        const d = dayjs().year(yearForWeek).week(w);
        
        // Notar: si w es, por ejemplo, 53 de año anterior, dayjs(year).week(53) puede ser correcto.
        // Pero usamos la misma logica de deteccion de año:
        let valYear = d.year();
        const valWeek = d.week();

        // Aplicamos la misma corrección ISO para la key
        if (valWeek === 1 && d.month() === 11) {
          valYear = valYear + 1;
        } else if (valWeek >= 52 && d.month() === 0) {
          valYear = valYear - 1;
        }

        return `${valYear}-${valWeek}`;
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
