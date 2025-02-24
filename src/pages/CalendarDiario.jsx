import dayjs from "dayjs";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "dayjs/locale/es";
import { useState } from "react";
import {
  calendarMessages,
  formatosPersonalizadosDayjs,
  resources,
} from "@/components/calendar/personalizacionCalendario";
import { Separator } from "@/components/ui";
import eventosDeEjemplo from "@/components/calendar/events";
import {
  CustomEventComponent,
  eventPropGetter,
} from "@/components/calendar/CustomEventComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Localizer
const localizer = dayjsLocalizer(dayjs);
dayjs.locale("es");

const handleSelectSlot = (slotInfo) => {
  console.log(slotInfo);
};

export const CalendarDiario = () => {
  // Estado para el consultorio seleccionado
  const [selectedConsultorio, setSelectedConsultorio] = useState(
    resources[0].resourceId
  );

  // Manejar el cambio de consultorio
  const handleConsultorioChange = (e) => {
    setSelectedConsultorio(Number(e));
  };

  // Filtrar eventos por `resourceId` seleccionado
  const filteredEvents = eventosDeEjemplo.filter(
    (event) => event.resourceId === selectedConsultorio
  );

  return (
    <div className="container mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Disponibilidad Semanal
      </h1>
      <Separator />
      <div className="flex justify-center items-center">
        <Label htmlFor="consultorio" className="mr-3">
          Selecciona un consultorio:
        </Label>
        <Select onValueChange={handleConsultorioChange}>
          <SelectTrigger className="w-[180px]">
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
      <Separator className="mb-4" />
      <div className="h-2"></div>

      <div className="h-[800px] bg-white rounded-lg shadow-lg">
        {/* Calendario */}
        <Calendar
          localizer={localizer}
          events={filteredEvents} // Mostrar solo eventos filtrados
          step={60}
          timeslots={1}
          defaultView="week" // Vista semanal
          startAccessor="start"
          endAccessor="end"
          messages={calendarMessages}
          min={dayjs("2024-12-03T07:00:00").toDate()}
          max={dayjs("2024-12-03T23:00:00").toDate()}
          formats={formatosPersonalizadosDayjs}
          eventPropGetter={eventPropGetter}
          components={{
            event: CustomEventComponent,
          }}
          selectable={true}
          onSelectSlot={handleSelectSlot}
        />
      </div>
    </div>
  );
};
