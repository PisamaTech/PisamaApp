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
import { ReservationStatus, ReservationType } from "@/utils/constants"; // Asegúrate de importar ReservationStatus
import { ConfirmCancelDialog } from "./ConfirmEventDialog";
// Importa tu nueva función de servicio y mantén la de series si aún la necesitas por separado
import { cancelBooking, cancelRecurringSeries, supabase } from "@/supabase";
import { useUIStore } from "@/stores/uiStore";
import { useEventStore } from "@/stores/calendarStore";

export const EventDialog = ({ open, onOpenChange, selectedEvent }) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [cancelActionType, setCancelActionType] = useState(null); // 'single' o 'series'
  const [futureEventsCount, setFutureEventsCount] = useState(0);

  const { showToast, startLoading, stopLoading, setError, clearError } =
    useUIStore(); // Obtén funciones de UI
  const {
    updateEvent,
    fetchEventsByWeek,
    updateMultipleEventsStatusToCancelled,
  } = useEventStore(); // Obtén updateEvent y fetchEventsByWeek

  // Mover el foco al DialogContent
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Extraer datos del usuario para la reserva desde el Store
  const { profile } = useAuthStore.getState();
  const { id: profileId } = profile;
  // Asegúrate de que selectedEvent no sea null antes de acceder a sus propiedades
  const mismoUsuario = selectedEvent && profileId === selectedEvent.usuario_id;

  // Obtener cantidad de eventos futuros en la serie (solo si es tipo FIJA)
  useEffect(() => {
    const fetchFutureEvents = async () => {
      if (
        !selectedEvent ||
        selectedEvent.tipo !== ReservationType.FIJA ||
        !selectedEvent.recurrence_id
      ) {
        setFutureEventsCount(0); // Resetea si no aplica
        return;
      }

      try {
        const startDate = dayjs(selectedEvent.start);
        if (!startDate.isValid()) {
          console.error("Fecha de inicio inválida para buscar eventos futuros");
          setFutureEventsCount(0);
          return;
        }

        // Contar solo las reservas activas de la serie a partir de la fecha del evento actual
        const { count, error } = await supabase
          .from("reservas")
          .select("*", { count: "exact" })
          .eq("recurrence_id", selectedEvent.recurrence_id)
          .eq("estado", ReservationStatus.ACTIVA) // Usa tu constante para 'activa'
          .gte("start_time", startDate.toISOString());

        if (error) throw error;
        setFutureEventsCount(count || 0);
      } catch (error) {
        console.error("Error al buscar eventos futuros:", error);
        setFutureEventsCount(0);
      }
    };

    if (open && selectedEvent) {
      // Ejecuta solo cuando el diálogo está abierto y hay un evento seleccionado
      fetchFutureEvents();
    }
  }, [open, selectedEvent]); // Dependencias: open y selectedEvent

  const getConfirmationMessage = () => {
    if (!selectedEvent) return ""; // Si no hay evento, no mostrar mensaje

    if (cancelActionType === "single") {
      // Si la acción es cancelar solo esta
      return (
        <p className="text-sm ">
          ¿Estás seguro de cancelar la reserva del <br />
          <span className="font-bold">
            {dayjs(selectedEvent.start).format("dddd[ - ]").toLocaleUpperCase()}
            {dayjs(selectedEvent.start).format("DD/MM/YYYY[ - ]")}
            {dayjs(selectedEvent.start).format("HH:mm[hs - ]")}
            {"Consultorio " + selectedEvent.resourceId}?
          </span>
          <br />
          <span className="text-xs text-gray-500">
            (Si cancelas con menos de 24hs de antelación, deberás pagar por la
            reserva, pero podrás reagendarla por un plazo de 6 días, a partir de
            la reserva original)
          </span>
        </p>
      );
    }

    if (cancelActionType === "series") {
      // Si la acción es cancelar la serie
      return (
        <p className="text-sm">
          ¿Estás seguro que querés cancelar las <b>{futureEventsCount}</b>{" "}
          reservas futuras de esta serie fija, comenzando desde el{" "}
          <b>{dayjs(selectedEvent.start).format("DD/MM/YYYY")}</b>?
          <br />
          Esta acción <b>NO</b> se puede deshacer.
          <br />
          <span className="text-xs text-gray-500">
            (La primera reserva de la serie podrías tener que abonarla, si su
            cancelación es con menos de 24hs de antelación)
          </span>
        </p>
      );
    }
    return ""; // Mensaje por defecto si no hay tipo de acción
  };

  const handleConfirmCancelAction = async () => {
    if (!selectedEvent || !profileId) return;

    clearError();
    startLoading();

    try {
      let result; // Puede ser una o varias reservas actualizadas

      if (cancelActionType === "single") {
        result = await cancelBooking(selectedEvent.id, profileId);
        showToast({
          type: "success",
          title: "Reserva Cancelada",
          message: `La reserva ha sido ${
            result.estado === ReservationStatus.PENALIZADA
              ? `cancelada con menos de 24hs de antelación y deberás pagar por la hora.\n Pero puede ser reagendada en un plazo de 6 días posterior a la reserva original sin costo extra`
              : "cancelada con más de 24hs de antelación y no deberás pagar por la hora."
          }.`,
        });
        updateEvent(result); // Actualiza el evento individual en el store
      } else if (cancelActionType === "series") {
        const currentDateForCancellation = dayjs().toDate(); // Fecha actual para la solicitud
        const rpcResult = await cancelRecurringSeries(
          selectedEvent.recurrence_id,
          profileId,
          selectedEvent.start_time
        );
        if (rpcResult.status === "success") {
          if (rpcResult.penalty_applied) {
            showToast({
              type: "success",
              title: "Serie de Reservas Cancelada",
              message: `Serie cancelada correctamente. Pero se te cobrará la primera consulta de la serie, ya que cancelaste con menos de 24hs de anticipación. Podrás reagendarla hasta el ${dayjs(
                rpcResult.reschedule_until
              ).format("dddd[, ]")}${dayjs(rpcResult.reschedule_until).format(
                "DD/MM/YYYY"
              )}, sin costo extra.`,
            });
          } else if (!rpcResult.penalty_applied) {
            showToast({
              type: "success",
              title: "Serie de Reservas Cancelada",
              message: rpcResult.message || "Serie cancelada correctamente.",
            });
          }
          // Si cancelRecurringSeries devuelve un array de eventos actualizados:
          if (
            rpcResult &&
            rpcResult.modified_ids &&
            Array.isArray(rpcResult.modified_ids)
          ) {
            updateMultipleEventsStatusToCancelled(
              rpcResult.modified_ids,
              currentDateForCancellation
            ); // Actualiza los eventos en el store
          }
        }
      }

      // Cerrar diálogos
      setIsConfirmDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      setError(error); // Usa el setError global
      showToast({
        type: "error",
        title: "Error en la Cancelación",
        message: error.message || "Ocurrió un error al intentar cancelar.",
      });
    } finally {
      stopLoading();
    }
  };

  // Si no hay evento seleccionado, no renderizar el diálogo
  if (!selectedEvent) {
    return null;
  }

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
          <DialogDescription>
            Aquí puede ver los detalles de la reserva seleccionada. <br />
            Si la reserva es tuya y está activa, podrás cancelarla.
          </DialogDescription>
          <div className="space-y-2">
            {/* ... (Inputs deshabilitados para mostrar datos - sin cambios) ... */}
            <div className="flex justify-between gap-4">
              {/* Titular */}
              <div className="space-y-2 w-full">
                <Label htmlFor="titular">Titular de la reserva</Label>
                <Input
                  id="titular"
                  type="text"
                  value={selectedEvent.titulo || "N/A"}
                  disabled
                />
              </div>
              {/* Consultorio */}
              <div className="space-y-2 w-full">
                <Label htmlFor="resourceId">Consultorio</Label>
                <Input
                  id="resourceId"
                  type="text"
                  value={selectedEvent.resourceId || "N/A"}
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
                      ? "bg-fija" // Asegúrate que estas clases CSS existen y dan el estilo deseado
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
              {/* Botón para cancelar TODA LA SERIE (solo si es fija) */}
              {selectedEvent.tipo === ReservationType.FIJA &&
                selectedEvent.estado === ReservationStatus.ACTIVA && (
                  <Button
                    onClick={() => {
                      setCancelActionType("series"); // Define que la acción es cancelar la serie
                      setIsConfirmDialogOpen(true);
                    }}
                    variant="destructive" // O un color diferente para series
                    className="ml-2 bg-fija hover:bg-fija/70"
                    disabled={!mismoUsuario}
                  >
                    Cancelar Serie Completa
                  </Button>
                )}
              {/* Botón para cancelar SOLO ESTA reserva (eventual o una instancia de fija) */}
              {selectedEvent.estado === ReservationStatus.ACTIVA && (
                <Button
                  onClick={() => {
                    setCancelActionType("single"); // Define que la acción es cancelar solo esta
                    setIsConfirmDialogOpen(true);
                  }}
                  variant="destructive" // O un color que indique acción de cancelar
                  className="bg-eventual text-slate-900 hover:bg-eventual/70"
                  disabled={!mismoUsuario}
                >
                  Cancelar Esta Reserva
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedEvent && ( // Renderiza el diálogo de confirmación solo si hay un evento seleccionado
        <ConfirmCancelDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          message={getConfirmationMessage()}
          onConfirm={handleConfirmCancelAction}
        />
      )}
    </>
  );
};
