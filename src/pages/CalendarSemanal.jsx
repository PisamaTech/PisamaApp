import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import { Plus } from "lucide-react";
// import ReservationDialog from '@/components/ReservationDialog';
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

dayjs.locale("es");
// Localizer
const localizer = dayjsLocalizer(dayjs);

// interface Event {
//   id: string;
//   title: string;
//   start: Date;
//   end: Date;
//   resourceId: number;
//   profesionalName: string;
//   frequency: 'eventual' | 'quincenal' | 'semanal';
// }

// interface SelectedSlot {
//   start: Date;
//   end: Date;
//   resourceId: number;
// }

export const CalendarSemanal = () => {
  //   const [events, setEvents] = useState([]);
  //   //   const [showReservationDialog, setShowReservationDialog] = useState(false);
  //   const [selectedSlot, setSelectedSlot] = useState(null);
  //   //   const [profesionalName, setProfesionalName] = useState('');
  //   //   const [frequency, setFrequency] = useState<'eventual' | 'quincenal' | 'semanal'>('eventual');
  //   const handleSelectSlot = (slotInfo) => {
  //     console.log("Selected slot:", slotInfo);
  //     const newSelectedSlot = {
  //       start: slotInfo.slots[0],
  //       end: slotInfo.slots[slotInfo.slots.length - 1],
  //       resourceId: slotInfo.resourceId,
  //     };
  //   if (
  //     selectedSlot &&
  //     selectedSlot.start.getTime() === newSelectedSlot.start.getTime() &&
  //     selectedSlot.end.getTime() === newSelectedSlot.end.getTime() &&
  //     selectedSlot.resourceId === newSelectedSlot.resourceId
  //   ) {
  //     //       setShowReservationDialog(true);
  //   } else {
  //     setSelectedSlot(newSelectedSlot);
  //     //       setShowReservationDialog(false);
  //   }
  // };

  //   const handleCreateReservation = () => {
  //     if (!selectedSlot || !profesionalName) return;
  //     const newEvent: Event = {
  //       id: Math.random().toString(),
  //       title: `Reserva - ${profesionalName}`,
  //       start: selectedSlot.start,
  //       end: selectedSlot.end,
  //       resourceId: selectedSlot.resourceId,
  //       profesionalName,
  //       frequency,
  //     };
  //     setEvents([...events, newEvent]);
  //     setShowReservationDialog(false);
  //     setProfesionalName('');
  //     setFrequency('eventual');
  // //     setSelectedSlot(null);
  // //   };
  // const components = {
  //   timeSlotWrapper: ({ children, value, resource }) => {
  //     const isSelected =
  //       selectedSlot &&
  //       selectedSlot.start.getTime() === value.getTime() &&
  //       selectedSlot.resourceId === resource?.id;
  //     return (
  //       <div
  //         className={`relative h-full ${
  //           isSelected ? "bg-medical-green/20" : ""
  //         }`}
  //       >
  //         {isSelected && (
  //           <div className="absolute inset-0 flex items-center justify-center">
  //             <Plus className="w-6 h-6 text-medical-green" />
  //           </div>
  //         )}
  //         {children}
  //       </div>
  //     );
  //   },
  // };

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
          // onSelectSlot={handleSelectSlot}
          messages={calendarMessages}
          min={dayjs("2024-12-03T07:00:00").toDate()}
          max={dayjs("2024-12-03T23:00:00").toDate()}
          eventPropGetter={eventPropGetter}
          components={{
            event: CustomEventComponent,
          }}
        />
      </div>
      {/* <ReservationDialog
        open={showReservationDialog}
        onOpenChange={setShowReservationDialog}
        selectedSlot={selectedSlot}
        profesionalName={profesionalName}
        setProfesionalName={setProfesionalName}
        frequency={frequency}
        setFrequency={setFrequency}
        onConfirm={handleCreateReservation}
      /> */}
    </div>
  );
};
