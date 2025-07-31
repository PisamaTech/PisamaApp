import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState, useMemo } from "react";
import "../components/calendar/calendarStyles.css";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Label,
  Switch,
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
import { Plus, XCircle } from "lucide-react";

// Localizer
dayjs.locale("es");
const localizer = dayjsLocalizer(dayjs);

export const CalendarDiario = () => {
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

  const handleNewReservationClick = () => {
    setIsDialogOpen(true);
  };

  const isReagendamientoMode = useUIStore(
    (state) => state.isReagendamientoMode
  );
  const penalizedBookingForReagendamiento = useUIStore(
    (state) => state.penalizedBookingForReagendamiento
  );
  const stopReagendamientoMode = useUIStore(
    (state) => state.stopReagendamientoMode
  );

  const { profile } = useAuthStore();
  const userId = profile?.id;

  const { handleReservation } = useReservationHandler(resetReservationState);
  const { events } = useEventStore(); // Usa el store de Zustand
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOnlyMyReservations, setShowOnlyMyReservations] = useState(false);

  // Cargar eventos iniciales al montar el componente
  useEffect(() => {
    if (useEventStore.getState().events.length === 0) {
      useEventStore.getState().loadInitialEvents(); // Llama a loadInitialEvents del store al montar
    }
  }, []);
  console.log(useEventStore.getState().events.length);
  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const isActiveOrUsed =
        event.estado === "activa" || event.estado === "utilizada";
      if (!isActiveOrUsed) return false;

      if (showOnlyMyReservations) {
        return event.usuario_id === userId;
      }
      return true; // Muestra los eventos de todos los usuarios si el filtro está desactivado
    });
  }, [events, showOnlyMyReservations, userId]);

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
    <div className="mx-auto p-4 space-y-4 w-full">
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
      <div className="flex items-center justify-center space-x-2 my-4">
        <Switch
          id="my-reservations"
          checked={showOnlyMyReservations}
          onCheckedChange={setShowOnlyMyReservations}
        />
        <Label htmlFor="my-reservations" className="cursor-pointer italic">
          Mostrar solo mis reservas
        </Label>
      </div>
      {/* Leyenda de Colores de Eventos */}
      <div className="flex justify-center items-center flex-wrap gap-x-6 gap-y-2 p-3 my-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center">
          <div
            className="w-4 h-4 rounded-sm mr-2 border border-slate-400/50"
            style={{ backgroundColor: "#5b9bd5" }}
          ></div>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Reservas Fijas:</span> se repiten
            todas las semanas.
          </p>
        </div>
        <div className="flex items-center">
          <div
            className="w-4 h-4 rounded-sm mr-2 border border-slate-400/50"
            style={{ backgroundColor: "#92d050" }}
          ></div>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Reservas Eventuales:</span> uso
            único en esa fecha.
          </p>
        </div>
      </div>
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

      {/* Botón Flotante para Nueva Reserva */}
      <Button
        onClick={handleNewReservationClick}
        className="fixed bottom-8 right-8 z-50 h-16 w-16 rounded-full shadow-lg"
        size="icon"
        aria-label="Agendar nueva reserva"
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
};
