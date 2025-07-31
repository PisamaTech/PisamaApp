import dayjs from "dayjs";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "dayjs/locale/es";
import { useEffect, useState, useMemo } from "react";
import {
  calendarMessages,
  formatosPersonalizadosDayjs,
  resources,
} from "@/components/calendar/personalizacionCalendario";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/components/ui";
import {
  CustomEventComponent,
  eventPropGetter,
} from "@/components/calendar/CustomEventComponent";
import CustomToolbar from "@/components/calendar/CustomToolbar";
import { useCalendarState } from "@/hooks/useCalendarState";
import { isSameSlot } from "@/components/calendar/calendarHelper";
import { ReservationDialog } from "@/components/ReservationDialog";
import { ConfirmReservationDialog } from "@/components/ConfirmReservationDialog";
import { useEventStore } from "@/stores/calendarStore";
import { handleNavigate } from "@/utils/calendarUtils";
import { EventDialog } from "@/components";
import { useReservationHandler } from "@/hooks/useReservationHandler";
import { Info, Plus, XCircle } from "lucide-react";
import flecha from "../assets/double-right.gif";

// Localizer
const localizer = dayjsLocalizer(dayjs);
dayjs.locale("es");

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
  const isAdmin = profile?.role === "admin";
  const userId = profile?.id;
  const [isAdminBookingMode, setIsAdminBookingMode] = useState(false);

  const { events } = useEventStore(); // Usa el store de Zustand
  const { handleReservation } = useReservationHandler(resetReservationState);

  // Estado para el consultorio seleccionado
  const [selectedConsultorio, setSelectedConsultorio] = useState(
    resources[0].resourceId
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOnlyMyReservations, setShowOnlyMyReservations] = useState(false);

  // Cargar eventos iniciales al montar el componente
  useEffect(() => {
    if (useEventStore.getState().events.length === 0) {
      useEventStore.getState().loadInitialEvents(); // Llama a loadInitialEvents del store al montar
    }
  }, []);

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

  // Manejar el cambio de consultorio
  const handleConsultorioChange = (e) => {
    setSelectedConsultorio(Number(e));
  };

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const isActiveOrUsed =
        event.estado === "activa" || event.estado === "utilizada";
      const isCorrectConsultorio = event.resourceId === selectedConsultorio;

      if (!isActiveOrUsed || !isCorrectConsultorio) return false;

      if (showOnlyMyReservations) {
        return event.usuario_id === userId;
      }
      return true; // Muestra los eventos de todos si el filtro está desactivado
    });
  }, [events, selectedConsultorio, showOnlyMyReservations, userId]);

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
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Disponibilidad Semanal
      </h1>
      {/* --- 3. Añadir el Interruptor de Modo Admin --- */}
      {isAdmin && (
        <div className="flex items-center space-x-2 bg-yellow-100 border border-yellow-300 p-3 rounded-md">
          <Switch
            id="admin-booking-mode"
            checked={isAdminBookingMode}
            onCheckedChange={setIsAdminBookingMode}
          />
          <Label
            htmlFor="admin-booking-mode"
            className="font-semibold text-yellow-800"
          >
            Modo Administrador: Agendar para otro usuario
          </Label>
        </div>
      )}
      <Separator />
      <div className="flex justify-center items-center">
        <img
          src={flecha}
          alt="flecha indicadora de selección"
          className="w-7 h-6 mr-3"
        />
        <Label htmlFor="consultorio" className="mr-3">
          Selecciona un consultorio:
        </Label>
        <Select onValueChange={handleConsultorioChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Selecciona un consultorio" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((resource) => (
              <SelectItem key={resource.id} value={String(resource.id)}>
                {resource.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-center space-x-2 my-4">
        <Switch
          id="my-reservations-semanal"
          checked={showOnlyMyReservations}
          onCheckedChange={setShowOnlyMyReservations}
        />
        <Label
          htmlFor="my-reservations-semanal"
          className="cursor-pointer italic"
        >
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

      {/* --- Mensaje de Ayuda para Reservar --- */}
      {!selectedSlot && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <Info className="h-4 w-4 !text-blue-800" />
          <AlertTitle>¿Cómo reservar?</AlertTitle>
          <AlertDescription>
            Para realizar una reserva, selecciona un horario disponible y luego
            haz clic nuevamente sobre él o en el botón flotante (+) para
            confirmar.
          </AlertDescription>
        </Alert>
      )}

      <Separator className="mb-4" />
      <div className="h-2"></div>

      <div className="h-[800px] bg-white rounded-lg shadow-lg">
        {/* Calendario */}
        <Calendar
          localizer={localizer}
          events={filteredEvents} // Mostrar solo eventos filtrados
          date={currentDate}
          onNavigate={(newDate) => handleNavigate(newDate, setCurrentDate)}
          step={60}
          timeslots={1}
          defaultView="week" // Vista semanal
          startAccessor="start_time"
          endAccessor="end_time"
          messages={calendarMessages}
          min={dayjs("2024-12-03T07:00:00").toDate()}
          max={dayjs("2024-12-03T23:00:00").toDate()}
          formats={formatosPersonalizadosDayjs}
          eventPropGetter={eventPropGetter}
          components={{
            event: CustomEventComponent,
            toolbar: CustomToolbar,
          }}
          selectable={true}
          longPressThreshold={20}
          onSelectSlot={(slotInfo) =>
            handleSelectSlot(slotInfo, selectedConsultorio)
          }
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
          selectedConsultorio={selectedConsultorio}
          isAdminBookingMode={isAdminBookingMode}
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
