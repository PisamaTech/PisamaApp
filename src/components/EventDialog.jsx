import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { useState, useEffect, useRef } from "react";
import { Input, Label, Separator } from "./ui";
import { CalendarClock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ReservationStatus, ReservationType } from "@/utils/constants";
import { useCalendarState } from "@/hooks/useCalendarState";
import { ConfirmCancelDialog } from "./ConfirmEventDialog";
import {
  cancelRecurringSeries,
  cancelSingleReservation,
  supabase,
} from "@/supabase";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useUIStore } from "@/stores/uiStore";

export const EventDialog = ({ open, onOpenChange, selectedEvent }) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [cancelType, setCancelType] = useState(null);
  const [futureEventsCount, setFutureEventsCount] = useState(0);

  const { setEvents } = useCalendarEvents();
  const { showToast } = useUIStore();

  // Mover el foco al DialogContent
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Obtener cantidad de eventos futuros en la serie
  useEffect(() => {
    const fetchFutureEvents = async () => {
      console.log(selectedEvent.recurrence_id);
      if (selectedEvent?.recurrence_id) {
        const { count } = await supabase
          .from("reservas")
          .select("*", { count: "exact" })
          .eq("recurrence_id", selectedEvent.recurrence_id)
          .gte("start_time", dayjs(selectedEvent.start).toISOString());

        setFutureEventsCount(count || 0);
      }
    };

    if (selectedEvent?.tipo === ReservationType.FIJA) {
      fetchFutureEvents();
    }
  }, [selectedEvent]);

  const getConfirmationMessage = () => {
    if (cancelType === ReservationType.EVENTUAL) {
      return (
        <p className="text-sm ">
          ¿Estás seguro de cancelar la reserva del <br />
          <span className="font-bold">
            {dayjs(selectedEvent.start).format("dddd[ - ]").toLocaleUpperCase()}
            {dayjs(selectedEvent.start).format("DD/MM/YYYY[ - ]")}
            {dayjs(selectedEvent.start).format("HH:mm[hs - ]")}
            {"Consultorio " + selectedEvent.resourceId}?
          </span>
        </p>
      );
    }

    return (
      <p className="text-sm">
        {" "}
        ¿Estas seguro que querés cancelar las <b>{futureEventsCount}</b>{" "}
        reservas futuras de esta reserva FIJA? <br />
        Esta acción <b>no</b> se puede deshacer y afectará a todas las reservas
        programadas desde el{" "}
        <b>{dayjs(selectedEvent.start).format("DD/MM/YYYY")} </b>
        hasta el{" "}
        <b>{dayjs(selectedEvent.recurrence_end_date).format("DD/MM/YYYY")}</b>.
      </p>
    );
  };

  const handleConfirmCancel = async () => {
    try {
      if (cancelType === ReservationType.EVENTUAL) {
        await cancelSingleReservation(selectedEvent.id);
      } else {
        await cancelRecurringSeries(selectedEvent.recurrence_id);
      }

      // Cerrar diálogos y actualizar
      setIsConfirmDialogOpen(false);
      onOpenChange(false);
      // await setEvents(); --> ACA SE DEBERÍAN VOLVER A CARGAR LOS EVENTOS

      showToast({
        type: "success",
        title: "Serie cancelada",
        message: "La reserva eventual se canceló correctamente",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    }
  };

  // Extraer datos del usuario para la reserva desde el Store
  const { profile } = useAuthStore.getState();
  const { id: profileId } = profile;
  const mismoUsuario = profileId === selectedEvent.usuario_id; // Chequeo si el usuario que abre el evento es el mismo que lo creo.

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={dialogRef}
          tabIndex={-1}
          className="max-h-full overflow-y-auto "
        >
          <DialogHeader>
            <DialogTitle className="mb-3">
              <div className="flex gap-3">
                <CalendarClock size={20} /> Datos de la reserva
              </div>
            </DialogTitle>
            <Separator />
          </DialogHeader>
          {/* // Información sobre el evento seleccionado // */}
          <DialogDescription>
            Aquí puede ver los detalles de la reserva seleccionada. <br />
            Si la reserva es tuya, podrás cancelarla.
          </DialogDescription>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              {/* Titular */}
              <div className="space-y-2 w-full">
                <Label htmlFor="titular">Titular de la reserva</Label>
                <Input
                  id="titular"
                  type="text"
                  value={selectedEvent.titulo}
                  disabled
                />
              </div>
              {/* Consultorio */}
              <div className="space-y-2 w-full">
                <Label htmlFor="resourceId">Consultorio</Label>
                <Input
                  id="resourceId"
                  type="text"
                  value={selectedEvent.resourceId}
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-between gap-4">
              {/* Día */}
              <div className="space-y-2 w-full">
                <Label htmlFor="dia">Día de reserva</Label>
                <Input
                  id="dia"
                  type="text"
                  value={dayjs(selectedEvent.start).format("dddd")}
                  className="capitalize"
                  disabled
                />
              </div>
              {/* Fecha */}
              <div className="space-y-2 w-full">
                <Label htmlFor="date">Fecha de reserva</Label>
                <Input
                  id="date"
                  type="date"
                  value={dayjs(selectedEvent.start).format("YYYY-MM-DD")}
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-between gap-4">
              {/* Hora de inicio */}
              <div className="space-y-2 w-full">
                <Label htmlFor="startTime">Hora de inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={dayjs(selectedEvent.start).format("HH:mm")}
                  disabled
                />
              </div>

              {/* Hora de fin */}
              <div className="space-y-2 w-full">
                <Label htmlFor="endTime">Hora de finalización</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={dayjs(selectedEvent.end).format("HH:mm")}
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-between gap-4">
              {/* Tipo de reserva */}

              <div className="space-y-2 w-full">
                <Label htmlFor="tipo">Tipo de reserva</Label>
                <Input
                  id="tipo"
                  type="text"
                  value={selectedEvent.tipo}
                  disabled
                  className={
                    selectedEvent.tipo === ReservationType.FIJA
                      ? "bg-fija"
                      : "bg-eventual"
                  }
                />
              </div>
              {/* Uso de camilla */}
              <div className="space-y-2 w-full">
                <Label htmlFor="usaCamilla">¿Utilizarás la camilla?</Label>
                <Input
                  id="usaCamilla"
                  type="text"
                  value={selectedEvent.usaCamilla ? "Sí" : "No"}
                  disabled
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="mt-4 flex justify-end gap-2">
              {selectedEvent.tipo === ReservationType.FIJA && (
                <Button
                  onClick={() => {
                    setCancelType(ReservationType.FIJA);
                    setIsConfirmDialogOpen(true);
                  }}
                  className="bg-fija hover:bg-fija/70"
                  disabled={!mismoUsuario}
                >
                  Cancelar Reserva Fija
                </Button>
              )}
              {/* Botones */}

              <Button
                onClick={() => {
                  setCancelType(ReservationType.EVENTUAL);
                  setIsConfirmDialogOpen(true);
                }}
                type="button"
                className="bg-eventual text-slate-900 hover:bg-eventual/70"
                disabled={!mismoUsuario}
              >
                Cancelar Reserva Eventual
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmCancelDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        message={getConfirmationMessage()}
        onConfirm={handleConfirmCancel}
      />
    </>
  );
};
