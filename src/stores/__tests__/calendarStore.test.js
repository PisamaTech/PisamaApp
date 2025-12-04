import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { ReservationStatus } from "@/utils/constants";

dayjs.extend(weekOfYear);

// Mock Supabase functions - before imports
vi.mock("@/supabase", () => ({
  fetchEventsFromDatabase: vi.fn(),
}));

// Mock calendar utils
vi.mock("@/utils/calendarUtils", () => ({
  mapReservationToEvent: (reservation) => ({
    ...reservation,
    start_time: new Date(reservation.start_time),
    end_time: new Date(reservation.end_time),
    resourceId: reservation.consultorio_id,
  }),
}));

// Mock UIStore
vi.mock("@/stores/uiStore", () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      startLoading: vi.fn(),
      stopLoading: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn(),
    })),
  },
}));

import { useEventStore } from "../calendarStore";
import { fetchEventsFromDatabase } from "@/supabase";
import { useUIStore } from "@/stores/uiStore";

describe("calendarStore", () => {
  beforeEach(() => {
    // Reset store state
    useEventStore.setState({
      events: [],
      loadedWeeksOfYear: [],
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("fetchEventsByWeek", () => {
    it("should fetch events for a specific week", async () => {
      const mockReservations = [
        {
          id: 1,
          consultorio_id: 1,
          start_time: "2025-03-10T10:00:00Z",
          end_time: "2025-03-10T11:00:00Z",
          titulo: "Terapia",
        },
        {
          id: 2,
          consultorio_id: 2,
          start_time: "2025-03-11T14:00:00Z",
          end_time: "2025-03-11T15:00:00Z",
          titulo: "Consulta",
        },
      ];

      fetchEventsFromDatabase.mockResolvedValue(mockReservations);

      const { fetchEventsByWeek } = useEventStore.getState();
      const result = await fetchEventsByWeek(10, 2025);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(2);
      expect(state.loadedWeeksOfYear).toContain(10);

      const uiStore = useUIStore.getState();
      expect(uiStore.startLoading).toHaveBeenCalledWith("Cargando eventos...");
      expect(uiStore.stopLoading).toHaveBeenCalled();
      expect(uiStore.clearError).toHaveBeenCalled();
    });

    it("should not fetch already loaded week", async () => {
      // Set initial state with week already loaded
      useEventStore.setState({
        loadedWeeksOfYear: [10],
        events: [],
      });

      const { fetchEventsByWeek } = useEventStore.getState();
      await fetchEventsByWeek(10, 2025);

      expect(fetchEventsFromDatabase).not.toHaveBeenCalled();
      const uiStore = useUIStore.getState();
      expect(uiStore.startLoading).not.toHaveBeenCalled();
    });

    it("should filter out duplicate events", async () => {
      // Set initial state with existing event
      const existingEvent = {
        id: 1,
        consultorio_id: 1,
        start_time: new Date("2025-03-10T10:00:00Z"),
        end_time: new Date("2025-03-10T11:00:00Z"),
      };

      useEventStore.setState({
        events: [existingEvent],
        loadedWeeksOfYear: [],
      });

      const mockReservations = [
        {
          id: 1, // Duplicate ID
          consultorio_id: 1,
          start_time: "2025-03-10T10:00:00Z",
          end_time: "2025-03-10T11:00:00Z",
        },
        {
          id: 2, // New event
          consultorio_id: 2,
          start_time: "2025-03-11T14:00:00Z",
          end_time: "2025-03-11T15:00:00Z",
        },
      ];

      fetchEventsFromDatabase.mockResolvedValue(mockReservations);

      const { fetchEventsByWeek } = useEventStore.getState();
      await fetchEventsByWeek(11, 2025);

      const state = useEventStore.getState();
      // Should only add the new event, not the duplicate
      expect(state.events).toHaveLength(2);
      expect(state.events.find((e) => e.id === 2)).toBeDefined();
    });

    it("should handle fetch error", async () => {
      const mockError = new Error("Database connection failed");
      fetchEventsFromDatabase.mockRejectedValue(mockError);

      const { fetchEventsByWeek } = useEventStore.getState();
      const result = await fetchEventsByWeek(12, 2025);

      expect(result).toBeNull();
      const uiStore = useUIStore.getState();
      expect(uiStore.setError).toHaveBeenCalledWith(mockError);
      expect(uiStore.stopLoading).toHaveBeenCalled();
    });
  });

  describe("loadInitialEvents", () => {
    it("should load events for 3 weeks (prev, current, next)", async () => {
      const mockReservations = [
        {
          id: 1,
          consultorio_id: 1,
          start_time: "2025-03-03T10:00:00Z",
          end_time: "2025-03-03T11:00:00Z",
        },
        {
          id: 2,
          consultorio_id: 2,
          start_time: "2025-03-10T14:00:00Z",
          end_time: "2025-03-10T15:00:00Z",
        },
        {
          id: 3,
          consultorio_id: 1,
          start_time: "2025-03-17T09:00:00Z",
          end_time: "2025-03-17T10:00:00Z",
        },
      ];

      fetchEventsFromDatabase.mockResolvedValue(mockReservations);

      const { loadInitialEvents } = useEventStore.getState();
      const result = await loadInitialEvents();

      expect(result).toHaveLength(3);

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(3);
      expect(state.loadedWeeksOfYear).toHaveLength(3);

      // Should load current week and neighbors
      const currentWeek = dayjs().week();
      expect(state.loadedWeeksOfYear).toContain(currentWeek);
      expect(state.loadedWeeksOfYear).toContain(currentWeek - 1);
      expect(state.loadedWeeksOfYear).toContain(currentWeek + 1);

      const uiStore = useUIStore.getState();
      expect(uiStore.startLoading).toHaveBeenCalledWith("Cargando eventos...");
      expect(uiStore.stopLoading).toHaveBeenCalled();
    });

    it("should handle error during initial load", async () => {
      const mockError = new Error("Failed to load");
      fetchEventsFromDatabase.mockRejectedValue(mockError);

      const { loadInitialEvents } = useEventStore.getState();
      const result = await loadInitialEvents();

      expect(result).toBeNull();
      const uiStore = useUIStore.getState();
      expect(uiStore.setError).toHaveBeenCalledWith(mockError);
      expect(uiStore.stopLoading).toHaveBeenCalled();
    });
  });

  describe("clearEvents", () => {
    it("should clear all events and loaded weeks", () => {
      useEventStore.setState({
        events: [{ id: 1 }, { id: 2 }],
        loadedWeeksOfYear: [10, 11, 12],
      });

      const { clearEvents } = useEventStore.getState();
      clearEvents();

      const state = useEventStore.getState();
      expect(state.events).toEqual([]);
      expect(state.loadedWeeksOfYear).toEqual([]);

      const uiStore = useUIStore.getState();
      expect(uiStore.clearError).toHaveBeenCalled();
    });
  });

  describe("updateMultipleEventsStatusToCancelled", () => {
    it("should update multiple events to cancelled status", () => {
      const initialEvents = [
        {
          id: 1,
          titulo: "Event 1",
          estado: ReservationStatus.ACTIVE,
          fecha_cancelacion: null,
        },
        {
          id: 2,
          titulo: "Event 2",
          estado: ReservationStatus.ACTIVE,
          fecha_cancelacion: null,
        },
        {
          id: 3,
          titulo: "Event 3",
          estado: ReservationStatus.ACTIVE,
          fecha_cancelacion: null,
        },
      ];

      useEventStore.setState({ events: initialEvents });

      const cancellationDate = new Date("2025-03-15T12:00:00Z");
      const { updateMultipleEventsStatusToCancelled } = useEventStore.getState();
      updateMultipleEventsStatusToCancelled([1, 2], cancellationDate);

      const state = useEventStore.getState();

      // Events 1 and 2 should be cancelled
      expect(state.events[0].estado).toBe(ReservationStatus.CANCELADA);
      expect(state.events[0].fecha_cancelacion).toBe(cancellationDate.toISOString());
      expect(state.events[0].permite_reagendar_hasta).toBeNull();
      expect(state.events[0].fue_reagendada).toBe(false);

      expect(state.events[1].estado).toBe(ReservationStatus.CANCELADA);

      // Event 3 should remain unchanged
      expect(state.events[2].estado).toBe(ReservationStatus.ACTIVE);
      expect(state.events[2].fecha_cancelacion).toBeNull();
    });

    it("should handle empty event IDs array", () => {
      const initialEvents = [{ id: 1, estado: ReservationStatus.ACTIVE }];
      useEventStore.setState({ events: initialEvents });

      const { updateMultipleEventsStatusToCancelled } = useEventStore.getState();
      updateMultipleEventsStatusToCancelled([], new Date());

      const state = useEventStore.getState();
      expect(state.events[0].estado).toBe(ReservationStatus.ACTIVE);
    });

    it("should handle non-array input", () => {
      const initialEvents = [{ id: 1, estado: ReservationStatus.ACTIVE }];
      useEventStore.setState({ events: initialEvents });

      const { updateMultipleEventsStatusToCancelled } = useEventStore.getState();
      updateMultipleEventsStatusToCancelled(null, new Date());

      const state = useEventStore.getState();
      expect(state.events[0].estado).toBe(ReservationStatus.ACTIVE);
    });
  });

  describe("addEvent", () => {
    it("should add single event", () => {
      const newEvent = {
        id: 1,
        titulo: "New Event",
        start_time: new Date(),
      };

      const { addEvent } = useEventStore.getState();
      addEvent(newEvent);

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0]).toEqual(newEvent);
    });

    it("should add multiple events from array", () => {
      const newEvents = [
        { id: 1, titulo: "Event 1" },
        { id: 2, titulo: "Event 2" },
      ];

      const { addEvent } = useEventStore.getState();
      addEvent(newEvents);

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(2);
    });

    it("should append to existing events", () => {
      useEventStore.setState({
        events: [{ id: 1, titulo: "Existing Event" }],
      });

      const { addEvent } = useEventStore.getState();
      addEvent({ id: 2, titulo: "New Event" });

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(2);
    });
  });

  describe("updateEvent", () => {
    it("should update specific event", () => {
      const initialEvents = [
        { id: 1, titulo: "Original Title", estado: "activa" },
        { id: 2, titulo: "Event 2", estado: "activa" },
      ];

      useEventStore.setState({ events: initialEvents });

      const updatedEvent = {
        id: 1,
        titulo: "Updated Title",
        estado: "cancelada",
      };

      const { updateEvent } = useEventStore.getState();
      updateEvent(updatedEvent);

      const state = useEventStore.getState();
      expect(state.events[0].titulo).toBe("Updated Title");
      expect(state.events[0].estado).toBe("cancelada");

      // Other event should remain unchanged
      expect(state.events[1].titulo).toBe("Event 2");
    });

    it("should not modify array if event ID not found", () => {
      const initialEvents = [{ id: 1, titulo: "Event 1" }];
      useEventStore.setState({ events: initialEvents });

      const { updateEvent } = useEventStore.getState();
      updateEvent({ id: 999, titulo: "Non-existent" });

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe(1);
    });
  });

  describe("deleteEvent", () => {
    it("should delete specific event", () => {
      const initialEvents = [
        { id: 1, titulo: "Event 1" },
        { id: 2, titulo: "Event 2" },
        { id: 3, titulo: "Event 3" },
      ];

      useEventStore.setState({ events: initialEvents });

      const { deleteEvent } = useEventStore.getState();
      deleteEvent(2);

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(2);
      expect(state.events.find((e) => e.id === 2)).toBeUndefined();
      expect(state.events.find((e) => e.id === 1)).toBeDefined();
      expect(state.events.find((e) => e.id === 3)).toBeDefined();
    });

    it("should not modify array if event ID not found", () => {
      const initialEvents = [{ id: 1, titulo: "Event 1" }];
      useEventStore.setState({ events: initialEvents });

      const { deleteEvent } = useEventStore.getState();
      deleteEvent(999);

      const state = useEventStore.getState();
      expect(state.events).toHaveLength(1);
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useEventStore.getState();

      expect(state.events).toEqual([]);
      expect(state.loadedWeeksOfYear).toEqual([]);
    });
  });
});
