import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import {
  generateRecurringEvents,
  generateRecurringEventsForRenewal,
  mapReservationToEvent,
  mapEventsToReservations,
  checkForConflicts,
} from "../calendarUtils";
import { ReservationType, ReservationStatus } from "../constants";

// Extend dayjs with plugin
dayjs.extend(isSameOrBefore);

// Mock Supabase functions
vi.mock("@/supabase", () => ({
  getOverlappingReservationsForConsultorio: vi.fn(),
  getOverlappingCamillaReservations: vi.fn(),
}));

// Mock stores
vi.mock("@/stores/calendarStore", () => ({
  useEventStore: {
    getState: vi.fn(() => ({
      fetchEventsByWeek: vi.fn(),
    })),
  },
}));

describe("generateRecurringEvents", () => {
  it("should generate weekly recurring events for 4 months", () => {
    const baseEvent = {
      consultorio_id: 1,
      usuario_id: "user-123",
      titulo: "Terapia",
      usaCamilla: false,
      start_time: dayjs("2025-01-01T10:00:00").toDate(),
      end_time: dayjs("2025-01-01T11:00:00").toDate(),
    };

    const events = generateRecurringEvents(baseEvent, 4);

    // Should generate approximately 16-17 weeks (4 months)
    expect(events.length).toBeGreaterThanOrEqual(16);
    expect(events.length).toBeLessThanOrEqual(18);

    // All events should have the same recurrence_id
    const recurrenceIds = events.map((e) => e.recurrence_id);
    const uniqueIds = [...new Set(recurrenceIds)];
    expect(uniqueIds.length).toBe(1);

    // Each event should be 1 week apart
    for (let i = 1; i < events.length; i++) {
      const prevStart = dayjs(events[i - 1].start_time);
      const currentStart = dayjs(events[i].start_time);
      const diffInDays = currentStart.diff(prevStart, "day");
      expect(diffInDays).toBe(7);
    }

    // All events should be type FIJA
    events.forEach((event) => {
      expect(event.tipo_reserva).toBe(ReservationType.FIJA);
      expect(event.recurrence_id).toBeDefined();
      expect(event.recurrence_end_date).toBeDefined();
    });
  });

  it("should generate events with correct time slots", () => {
    const baseEvent = {
      consultorio_id: 2,
      usuario_id: "user-456",
      titulo: "Consulta",
      usaCamilla: true,
      start_time: dayjs("2025-02-01T14:00:00").toDate(),
      end_time: dayjs("2025-02-01T16:00:00").toDate(),
    };

    const events = generateRecurringEvents(baseEvent, 2);

    // All events should have same hour and duration
    events.forEach((event) => {
      const start = dayjs(event.start_time);
      const end = dayjs(event.end_time);

      expect(start.hour()).toBe(14);
      expect(start.minute()).toBe(0);
      expect(end.hour()).toBe(16);
      expect(end.minute()).toBe(0);

      // Duration should be 2 hours
      expect(end.diff(start, "hour")).toBe(2);
    });
  });

  it("should preserve base event properties", () => {
    const baseEvent = {
      consultorio_id: 3,
      usuario_id: "user-789",
      titulo: "Sesión Especial",
      usaCamilla: true,
      start_time: dayjs("2025-03-01T09:00:00").toDate(),
      end_time: dayjs("2025-03-01T10:00:00").toDate(),
    };

    const events = generateRecurringEvents(baseEvent, 1);

    events.forEach((event) => {
      expect(event.consultorio_id).toBe(3);
      expect(event.usuario_id).toBe("user-789");
      expect(event.titulo).toBe("Sesión Especial");
      expect(event.usaCamilla).toBe(true);
    });
  });
});

describe("generateRecurringEventsForRenewal", () => {
  it("should generate events after old end date", () => {
    const baseEventPattern = {
      start_time: dayjs("2025-01-01T10:00:00").toDate(),
      end_time: dayjs("2025-01-01T11:00:00").toDate(),
      consultorio_id: 1,
      usuario_id: "user-123",
      titulo: "Terapia",
      usaCamilla: false,
      recurrence_id: "existing-recurrence-id",
    };

    const oldEndDate = dayjs("2025-05-01").toDate();
    const result = generateRecurringEventsForRenewal(baseEventPattern, oldEndDate, 2);

    // All new events should start after oldEndDate
    result.newEvents.forEach((event) => {
      const eventStart = dayjs(event.start_time);
      expect(eventStart.isAfter(dayjs(oldEndDate))).toBe(true);
    });

    // New recurrence end date should be 2 months after old end date
    const expectedEndDate = dayjs(oldEndDate).add(2, "months");
    expect(dayjs(result.newRecurrenceEndDate).format("YYYY-MM-DD")).toBe(
      expectedEndDate.format("YYYY-MM-DD")
    );
  });

  it("should maintain same recurrence_id", () => {
    const baseEventPattern = {
      start_time: dayjs("2025-01-01T14:00:00").toDate(),
      end_time: dayjs("2025-01-01T15:00:00").toDate(),
      consultorio_id: 2,
      usuario_id: "user-456",
      titulo: "Consulta",
      usaCamilla: true,
      recurrence_id: "my-recurrence-id-123",
    };

    const oldEndDate = dayjs("2025-04-01").toDate();
    const result = generateRecurringEventsForRenewal(baseEventPattern, oldEndDate, 3);

    // All events should have the same recurrence_id
    result.newEvents.forEach((event) => {
      expect(event.recurrence_id).toBe("my-recurrence-id-123");
      expect(event.tipo_reserva).toBe(ReservationType.FIJA);
      expect(event.estado).toBe("activa");
    });
  });

  it("should generate weekly events with correct spacing", () => {
    const baseEventPattern = {
      start_time: dayjs("2025-02-03T10:00:00").toDate(), // Monday
      end_time: dayjs("2025-02-03T11:00:00").toDate(),
      consultorio_id: 1,
      usuario_id: "user-789",
      titulo: "Sesión",
      usaCamilla: false,
      recurrence_id: "rec-id",
    };

    const oldEndDate = dayjs("2025-06-01").toDate();
    const result = generateRecurringEventsForRenewal(baseEventPattern, oldEndDate, 2);

    // Each event should be exactly 7 days apart
    for (let i = 1; i < result.newEvents.length; i++) {
      const prevStart = dayjs(result.newEvents[i - 1].start_time);
      const currentStart = dayjs(result.newEvents[i].start_time);
      expect(currentStart.diff(prevStart, "day")).toBe(7);
    }
  });
});

describe("mapReservationToEvent", () => {
  it("should convert reservation to calendar event format", () => {
    const reserva = {
      id: 123,
      consultorio_id: 2,
      usuario_id: "user-abc",
      tipo_reserva: "Eventual",
      titulo: "Consulta",
      start_time: "2025-03-15T10:00:00Z",
      end_time: "2025-03-15T11:00:00Z",
      estado: "activa",
      usaCamilla: true,
    };

    const event = mapReservationToEvent(reserva);

    expect(event.id).toBe(123);
    expect(event.resourceId).toBe(2);
    expect(event.tipo_reserva).toBe("Eventual");
    expect(event.estado).toBe("activa");
    expect(event.start_time).toBeInstanceOf(Date);
    expect(event.end_time).toBeInstanceOf(Date);
  });

  it("should convert ISO string dates to Date objects", () => {
    const reserva = {
      consultorio_id: 1,
      start_time: "2025-04-20T14:30:00Z",
      end_time: "2025-04-20T15:30:00Z",
      tipo_reserva: "Fija",
      estado: "activa",
    };

    const event = mapReservationToEvent(reserva);

    expect(event.start_time).toBeInstanceOf(Date);
    expect(event.end_time).toBeInstanceOf(Date);
    expect(event.start_time.toISOString()).toBe("2025-04-20T14:30:00.000Z");
  });
});

describe("mapEventsToReservations", () => {
  it("should convert calendar events to reservation format", () => {
    const hourlyEvents = [
      {
        resourceId: 1,
        usuario_id: "user-123",
        tipo_reserva: "Eventual",
        titulo: "Terapia",
        start_time: dayjs("2025-03-10T10:00:00").toDate(),
        end_time: dayjs("2025-03-10T11:00:00").toDate(),
        usaCamilla: false,
        status: "activa",
      },
      {
        resourceId: 2,
        usuario_id: "user-456",
        tipo_reserva: "Fija",
        titulo: "Consulta",
        start_time: dayjs("2025-03-10T14:00:00").toDate(),
        end_time: dayjs("2025-03-10T15:00:00").toDate(),
        usaCamilla: true,
        recurrence_id: "rec-123",
        recurrence_end_date: dayjs("2025-07-10").toDate(),
      },
    ];

    const reservations = mapEventsToReservations(hourlyEvents);

    expect(reservations).toHaveLength(2);

    // First reservation
    expect(reservations[0].consultorio_id).toBe(1);
    expect(reservations[0].usuario_id).toBe("user-123");
    expect(reservations[0].tipo_reserva).toBe("Eventual");
    expect(reservations[0].usaCamilla).toBe(false);
    expect(reservations[0].estado).toBe("activa");
    expect(typeof reservations[0].start_time).toBe("string");
    expect(typeof reservations[0].end_time).toBe("string");

    // Second reservation with recurrence
    expect(reservations[1].recurrence_id).toBe("rec-123");
    expect(reservations[1].recurrence_end_date).toBeDefined();
  });

  it("should use default status if not provided", () => {
    const hourlyEvents = [
      {
        resourceId: 1,
        usuario_id: "user-123",
        tipo_reserva: "Eventual",
        titulo: "Terapia",
        start_time: dayjs("2025-03-10T10:00:00").toDate(),
        end_time: dayjs("2025-03-10T11:00:00").toDate(),
        usaCamilla: false,
        // status not provided
      },
    ];

    const reservations = mapEventsToReservations(hourlyEvents);

    expect(reservations[0].estado).toBe(ReservationStatus.ACTIVE);
  });
});

describe("checkForConflicts", () => {
  it("should detect consultorio conflicts", async () => {
    const { getOverlappingReservationsForConsultorio } = await import("@/supabase");

    // Mock overlapping reservations
    getOverlappingReservationsForConsultorio.mockResolvedValue([
      {
        id: 999,
        consultorio_id: 1,
        start_time: "2025-03-15T10:00:00Z",
        end_time: "2025-03-15T11:00:00Z",
      },
    ]);

    const hourlyEvents = [
      {
        consultorio_id: 1,
        start_time: dayjs("2025-03-15T10:30:00").toDate(),
        end_time: dayjs("2025-03-15T11:30:00").toDate(),
        usaCamilla: false,
      },
    ];

    const result = await checkForConflicts(hourlyEvents);

    expect(result.conflictosConsultorio).toHaveLength(1);
    expect(result.conflictosConsultorio[0].id).toBe(999);
  });

  it("should detect camilla conflicts", async () => {
    const {
      getOverlappingReservationsForConsultorio,
      getOverlappingCamillaReservations
    } = await import("@/supabase");

    getOverlappingReservationsForConsultorio.mockResolvedValue([]);
    getOverlappingCamillaReservations.mockResolvedValue([
      {
        id: 888,
        start_time: "2025-03-15T14:00:00Z",
        end_time: "2025-03-15T15:00:00Z",
      },
    ]);

    const hourlyEvents = [
      {
        consultorio_id: 2,
        start_time: dayjs("2025-03-15T14:30:00").toDate(),
        end_time: dayjs("2025-03-15T15:30:00").toDate(),
        usaCamilla: true,
      },
    ];

    const result = await checkForConflicts(hourlyEvents);

    expect(result.conflictosCamilla).toHaveLength(1);
    expect(result.conflictosCamilla[0].id).toBe(888);
  });

  it("should return no conflicts when slots are available", async () => {
    const {
      getOverlappingReservationsForConsultorio,
      getOverlappingCamillaReservations
    } = await import("@/supabase");

    getOverlappingReservationsForConsultorio.mockResolvedValue([]);
    getOverlappingCamillaReservations.mockResolvedValue([]);

    const hourlyEvents = [
      {
        consultorio_id: 1,
        start_time: dayjs("2025-03-15T10:00:00").toDate(),
        end_time: dayjs("2025-03-15T11:00:00").toDate(),
        usaCamilla: false,
      },
    ];

    const result = await checkForConflicts(hourlyEvents);

    expect(result.conflictosConsultorio).toHaveLength(0);
    expect(result.conflictosCamilla).toHaveLength(0);
  });
});
