import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState } from "react";
import "../components/calendar/calendarStyles.css";
import { useUIStore } from "@/stores/uiStore";
import {
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from "@/components/ui";
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
import { isSameSlot } from "@/components/calendar/calendarHelper";
import { useCalendarState } from "@/hooks/useCalendarState";
import CustomToolbar from "@/components/calendar/CustomToolbar";
import { EventDialog } from "../components/EventDialog";
import { useEventStore } from "../stores/calendarStore";
import { handleNavigate } from "@/utils/calendarUtils";
import { useReservationHandler } from "@/hooks/useReservationHandler";
import { XCircle } from "lucide-react";

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

  const isReagendamientoMode = useUIStore(
    (state) => state.isReagendamientoMode
  );
  const penalizedBookingForReagendamiento = useUIStore(
    (state) => state.penalizedBookingForReagendamiento
  );
  const stopReagendamientoMode = useUIStore(
    (state) => state.stopReagendamientoMode
  );

  const { handleReservation } = useReservationHandler(resetReservationState);

  const { events } = useEventStore(); // Usa el store de Zustand
  const [currentDate, setCurrentDate] = useState(new Date());

  // Cargar eventos iniciales al montar el componente
  useEffect(() => {
    if (useEventStore.getState().events.length === 0) {
      useEventStore.getState().loadInitialEvents(); // Llama a loadInitialEvents del store al montar
    }
  }, []);

  // Filtrar eventos por `resourceId` seleccionado
  const filteredEvents = events.filter(
    (event) => event.estado === "activa" || event.estado === "utilizada"
  );

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

  return (
    <div className="mx-auto p-4 space-y-4 max-h-screen w-full">
      {/* --- Indicador Visual de Reagendamiento --- */}
      {isReagendamientoMode && penalizedBookingForReagendamiento && (
        <Alert
          variant="default"
          className="mb-4 border-orange-500 text-orange-700 bg-orange-50"
        >
          <AlertTitle className="font-bold">
            Modo Reagendamiento Activo
          </AlertTitle>
          <AlertDescription className="flex justify-between items-center flex-wrap gap-2">
            <span>
              Reagendando reserva del{" "}
              <b>
                {dayjs(penalizedBookingForReagendamiento.start_time).format(
                  "DD/MM/YYYY HH:mm"
                )}
              </b>
              . Selecciona un nuevo horario en el calendario.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopReagendamientoMode}
              className="text-orange-700 hover:text-orange-900 hover:bg-orange-100 h-auto p-1"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Salir del modo
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* --- Fin del Indicador Visual --- */}
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Disponibilidad Diaria
      </h1>
      <Separator />
      <div className="h-[800px] bg-white rounded-lg shadow-lg">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          date={currentDate}
          onNavigate={(newDate) => handleNavigate(newDate, setCurrentDate)}
          step={60}
          timeslots={1}
          defaultView={"day"}
          startAccessor="start_time"
          endAccessor="end_time"
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
          isReagendamiento={isReagendamientoMode}
          penalizedBooking={penalizedBookingForReagendamiento}
        />
      )}
      {isConfirmDialogOpen && (
        <ConfirmReservationDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          hourlyEvents={hourlyEvents}
          onConfirm={handleReservation}
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
