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
import { supabase } from "@/supabase";
import { useUIStore } from "@/stores/uiStore";

// Localizer
dayjs.locale("es");
const localizer = dayjsLocalizer(dayjs);

export const CalendarSemanal = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [events, setEvents] = useState(eventosDeEjemplo);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hourlyEvents, setHourlyEvents] = useState([]);

  const { startLoading, stopLoading, setError, showToast, clearError } =
    useUIStore();

  // Función para manejar la selección de una celda
  const handleSelectSlot = (slotInfo) => {
    const { start, end, resourceId } = slotInfo;
    const fechaClickeada = dayjs(start);
    const fechaAlmacenda = dayjs(selectedSlot?.start);

    if (
      selectedSlot &&
      fechaClickeada.isSame(fechaAlmacenda, "hour") &&
      resourceId === selectedSlot.resourceId
    ) {
      setIsDialogOpen(true);
    } else {
      const selectedDate = {
        start: start,
        end: end,
        resourceId: resourceId,
      };
      setSelectedSlot(selectedDate); // Guardo la celda clickeada en el estado de selectedSlot
    }
  };

  // Función para ponerle a la celda seleccionada la clase "slotSelected"
  const slotPropGetter = (date, resourceId) => {
    const fechaSeleccionada = dayjs(selectedSlot?.start);
    const fechaRecibida = dayjs(date);
    if (
      selectedSlot &&
      fechaRecibida.isSame(fechaSeleccionada, "minute") &&
      resourceId === selectedSlot.resourceId
    ) {
      return {
        className: "slotSelected",
      };
    }
    return {};
  };

  // Función para confirmar la reserva
  const handleConfirmReserve = (reservationData) => {
    const { userId, start, end, resourceId, title, tipo, usaCamilla, status } =
      reservationData;
    const startTime = dayjs(start);
    const endTime = dayjs(end);
    const durationHours = endTime.diff(startTime, "hour");

    // Generar eventos por hora
    const newHourlyEvents = [];
    for (let i = 0; i < durationHours; i++) {
      const eventStart = startTime.add(i, "hour");
      const eventEnd = eventStart.add(1, "hour");
      newHourlyEvents.push({
        userId,
        title: title,
        start: eventStart.toDate(),
        end: eventEnd.toDate(),
        resourceId,
        tipo,
        usaCamilla,
        status,
      });
    }
    // Actualizar el estado con los eventos generados
    setHourlyEvents(newHourlyEvents);
    setIsConfirmDialogOpen(true); // Abrir el diálogo después de actualizar el estado
  };

  // Función para confirmar la reserva
  const confirmarReserva = async () => {
    // Mapear los eventos a la estructura de la tabla "reservas"
    const reservasParaInsertar = hourlyEvents.map((event) => ({
      consultorio_id: event.resourceId,
      usuario_id: event.userId, // UUID del usuario autenticado
      tipo_reserva: event.tipo,
      start_time: dayjs(event.start).toISOString(),
      end_time: dayjs(event.end).toISOString(),
      estado: event.status || "activa",
      // Campos como fecha_cancelacion y reserva_original_id se dejan null por defecto
    }));
    clearError();
    startLoading();
    // Insertar en Supabase
    const { data, error } = await supabase
      .from("reservas")
      .insert(reservasParaInsertar)
      .select(); // Opcional: devuelve los datos insertados

    if (error) {
      setError(error);
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
      stopLoading();
      console.error("Error al guardar reservas:", error.message);
    } else {
      console.log("Reservas guardadas:", data);
      showToast({
        type: "success",
        title: "Confirmado",
        message: "Las reservas se han guardado correctamente.",
      });
      stopLoading();
    }
    setEvents((prevEvents) => [...prevEvents, ...hourlyEvents]);
    setSelectedSlot(null); // Limpiar celda seleccionada después de confirmar
    setIsConfirmDialogOpen(false);
    setHourlyEvents([]); // Limpiar array de horas después de confirmar
  };

  // Función para cancelar la reserva
  const cancelarReserva = () => {
    setIsConfirmDialogOpen(false);
    setHourlyEvents([]); // Limpiar si se cancela
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
          step={60}
          timeslots={1}
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
            // timeSlotWrapper: TimeSlotWrapper,
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
      />
      <ConfirmReservationDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        hourlyEvents={hourlyEvents}
        onConfirm={confirmarReserva}
        onCancel={cancelarReserva}
      />
    </div>
  );
};
