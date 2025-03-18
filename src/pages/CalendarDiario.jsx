import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState } from "react";
import "../components/calendar/calendarStyles.css";
import { Separator } from "@/components/ui";
import {
  calendarMessages,
  formatosPersonalizadosDayjs,
  resources,
} from "@/components/calendar/personalizacionCalendario";
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
import CustomToolbar from "@/components/calendar/CustomToolbar";
import { EventDialog } from "../components/EventDialog";
import { useEventStore } from "../stores/calendarStore";

// Localizer
dayjs.locale("es");
const localizer = dayjsLocalizer(dayjs);

export const CalendarSemanal = () => {
  const {
    selectedSlot,
    selectedEvent,
    isDialogOpen,
    isConfirmDialogOpen,
    isEventDialogOpen,
    hourlyEvents,
    handleSelectSlot,
    handleSelectEvent,
    handleConfirmReserve,
    resetReservationState,
    setIsDialogOpen,
    setIsConfirmDialogOpen,
    setIsEventDialogOpen,
    cancelarReserveDialog,
  } = useCalendarState();

  const {
    startLoading,
    stopLoading,
    setError,
    showToast,
    clearError,
    loading,
  } = useUIStore(); // Usa loading y error de UIStore

  const { events, fetchEventsByWeek } = useEventStore(); // Usa el store de Zustand
  const [currentDate, setCurrentDate] = useState(new Date());

  // Cargar eventos iniciales al montar el componente
  useEffect(() => {
    if (useEventStore.getState().events.length === 0) {
      useEventStore.getState().loadInitialEvents(); // Llama a loadInitialEvents del store al montar
    }
  }, []);

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
    const weekOfYearToLoad = dayjs(newDate).week();
    const yearToLoad = dayjs(newDate).year();
    fetchEventsByWeek(weekOfYearToLoad, yearToLoad); // Carga eventos de esa semana
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

  // Función para agregar reservas a Supabase
  const confirmarReserva = async () => {
    clearError();
    startLoading();

    try {
      const existingReservations = await checkForExistingReservations(
        hourlyEvents
      );

      if (existingReservations.length > 0) {
        // Reviso si hay conflicto de camilla
        const conflictosCamilla = existingReservations.filter(
          (r) =>
            r.usaCamilla &&
            hourlyEvents.some(
              (e) =>
                e.usaCamilla &&
                dayjs(e.start).isBefore(r.end_time) &&
                dayjs(e.end).isAfter(r.start_time)
            )
        );
        // Reviso si hay conflsicto de consultorio.
        const conflictosConsultorio = existingReservations.filter(
          (r) =>
            !conflictosCamilla.includes(r) &&
            hourlyEvents.some(
              (e) =>
                e.resourceId === r.consultorio_id &&
                dayjs(e.start).isBefore(r.end_time) &&
                dayjs(e.end).isAfter(r.start_time)
            )
        );

        if (conflictosCamilla.length > 0) {
          throw new Error(
            `La camilla está ocupada: ${conflictosCamilla
              .map(
                (r) =>
                  `${dayjs(r.start_time).format(
                    "D[/]M[/]YYYY - HH:mm"
                  )}-${dayjs(r.end_time).format("HH:mm")}`
              )
              .join(", ")}`
          );
        }
        // Mensaje de error si ya está ocupado el consultorio a esa hora.
        if (conflictosConsultorio.length > 0) {
          const conflictos = existingReservations
            .map(
              (r) =>
                `Consultorio ${r.consultorio_id} - ${dayjs(r.start_time).format(
                  "D[/]M[/]YYYY - HH:mm"
                )} - ${dayjs(r.end_time).format("HH:mm")}`
            )
            .join("\n");

          throw new Error(`Horarios ocupados detectados:\n
          ${conflictos}`);
        }
      }

      const reservasParaInsertar = mapEventsToReservations(hourlyEvents); // Mapear los eventos a la estructura de la tabla "reservas"
      const data = await createReservations(reservasParaInsertar);

      showToast({
        type: "success",
        title: "Confirmado",
        message: "Las reservas se han guardado correctamente.",
      });
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
          // onRangeChange={handleRangeChange}
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
            toolbar: CustomToolbar,
          }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          slotPropGetter={slotPropGetter}
        />
      </div>
      {isDialogOpen && (
        <ReservationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          selectedSlot={selectedSlot}
          resources={resources}
          onConfirm={handleConfirmReserve}
          onCancel={cancelarReserveDialog}
        />
      )}
      {isConfirmDialogOpen && (
        <ConfirmReservationDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          hourlyEvents={hourlyEvents}
          onConfirm={confirmarReserva}
          onCancel={resetReservationState}
        />
      )}
      {isEventDialogOpen && (
        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          selectedEvent={selectedEvent}
          // onConfirm={handleConfirmReserve}
        />
      )}
    </div>
  );
};
