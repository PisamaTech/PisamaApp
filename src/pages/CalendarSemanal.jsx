import { Calendar, dayjsLocalizer } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
// import ReservationDialog from '@/components/ReservationDialog';
import "../components/calendar/calendarStyles.css";
import { Button, Separator } from "@/components/ui";
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
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/";
import { Dialog, DialogFooter } from "@/components/ui/dialog";

dayjs.locale("es");
// Localizer
const localizer = dayjsLocalizer(dayjs);

export const CalendarSemanal = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const slotPropGetter = (date, resourceId) => {
    const fechaSeleccionada = dayjs(selectedSlot?.start);
    const fechaRecibida = dayjs(date);
    if (
      selectedSlot &&
      fechaRecibida.isSame(fechaSeleccionada, "minute") &&
      resourceId === selectedSlot.resourceId // Opcional, si usas recursos
    ) {
      return {
        className: "slotSelected",
      };
    }
    return {};
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
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
          events={eventosDeEjemplo}
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
      />
    </div>
  );
};
