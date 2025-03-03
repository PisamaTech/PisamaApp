import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import "../components/calendar/calendarStyles.css";
import { Separator } from "@/components/ui";
import {
  calendarMessages,
  formatosPersonalizadosDayjs,
  resources,
} from "@/components/calendar/personalizacionCalendario";
import eventosDeEjemplo from "@/components/calendar/events";
import {
  CustomEventComponent,
  eventPropGetter,
} from "@/components/calendar/CustomEventComponent";
import { ReservationDialog } from "@/components/ReservationDialog";
import { ConfirmReservationDialog } from "@/components/ConfirmReservationDialog";
import {
  checkForExistingReservations,
  createReservations,
  mapEventsToReservations,
} from "@/supabase";
import { useUIStore } from "@/stores/uiStore";
import { isSameSlot } from "@/components/calendar/calendarHelper";
import { useCalendarState } from "@/hooks/useCalendarState";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

// Localizer
dayjs.locale("es");
const localizer = dayjsLocalizer(dayjs);

export const CalendarSemanal = () => {
  const {
    selectedSlot,
    isDialogOpen,
    isConfirmDialogOpen,
    hourlyEvents,
    handleSelectSlot,
    handleConfirmReserve,
    resetReservationState,
    setIsDialogOpen,
    setIsConfirmDialogOpen,
    cancelarReserveDialog,
  } = useCalendarState();

  const { startLoading, stopLoading, setError, showToast, clearError } =
    useUIStore();

  const { events, loadNextMonth, lastLoadedDate } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleRangeChange = (range) => {
    const viewEnd = Array.isArray(range)
      ? dayjs(range[range.length - 1])
      : dayjs(range.end);

    // Si el final de la vista está dentro de los últimos 7 días del mes cargado
    if (viewEnd.add(7, "days").isAfter(lastLoadedDate)) {
      loadNextMonth(viewEnd.toDate());
    }
  };

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  // Función para ponerle a la celda seleccionada la clase "slotSelected"
  const slotPropGetter = (date, resourceId) => ({
    className: isSameSlot(
      date,
      selectedSlot?.start,
      resourceId,
      selectedSlot?.resourceId
    )
      ? "slotSelected"
      : "",
  });

  // Función para subir reserva a Supabase
  const confirmarReserva = async () => {
    clearError();
    startLoading();

    try {
      const existingReservations = await checkForExistingReservations(
        hourlyEvents
      );
      if (existingReservations.length > 0) {
        const conflictos = existingReservations
          .map(
            (r) =>
              `Consultorio ${r.consultorio_id}: ${dayjs(r.start_time).format(
                "HH:mm"
              )} - ${dayjs(r.end_time).format("HH:mm")}`
          )
          .join("\n");

        throw new Error(`Horarios ocupados detectados:\n
          ${conflictos}`);
      }

      const reservasParaInsertar = mapEventsToReservations(hourlyEvents); // Mapear los eventos a la estructura de la tabla "reservas"
      const data = await createReservations(reservasParaInsertar);

      showToast({
        type: "success",
        title: "Confirmado",
        message: "Las reservas se han guardado correctamente.",
      });

      loadEvents((prev) => [...prev, ...hourlyEvents]);
      console.log(hourlyEvents);
      console.log(events);
    } catch (error) {
      setError(error);
      showToast({
        type: "error",
        title: "Error en la reserva",
        message: error.message,
      });
    } finally {
      stopLoading();
      resetReservationState();
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Disponibilidad Diaria
      </h1>
      <Separator />
      <div className="h-[800px] bg-white rounded-lg shadow-lg">
        <Calendar
          localizer={localizer}
          events={events}
          date={currentDate}
          onNavigate={handleNavigate}
          step={60}
          timeslots={1}
          onRangeChange={handleRangeChange}
          // views={["day"]}
          defaultView={"day"}
          startAccessor="start"
          endAccessor="end"
          resources={resources}
          resourceIdAccessor="id"
          resourceTitleAccessor="title"
          selectable
          formats={formatosPersonalizadosDayjs}
          messages={calendarMessages}
          min={dayjs("2024-12-03T07:00:00").toDate()}
          max={dayjs("2024-12-03T23:00:00").toDate()}
          eventPropGetter={eventPropGetter}
          components={{
            event: CustomEventComponent,
          }}
          onSelectSlot={handleSelectSlot}
          slotPropGetter={slotPropGetter}
        />
      </div>
      <ReservationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedSlot={selectedSlot}
        resources={resources}
        onConfirm={handleConfirmReserve}
        onCancel={cancelarReserveDialog}
      />
      <ConfirmReservationDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        hourlyEvents={hourlyEvents}
        onConfirm={confirmarReserva}
        onCancel={resetReservationState}
      />
    </div>
  );
};
