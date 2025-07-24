import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import dayjs from "dayjs";
import { useState, useEffect, useRef } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ReservationStatus, ReservationType } from "@/utils/constants"; // Asegúrate de importar ReservationStatus
import { ConfirmCancelDialog } from "./ConfirmEventDialog";
// Importa tu nueva función de servicio y mantén la de series si aún la necesitas por separado
import {
  cancelBooking,
  cancelRecurringSeries,
  renewAndValidateSeries,
  supabase,
} from "@/supabase";
import { useUIStore } from "@/stores/uiStore";
import { useEventStore } from "@/stores/calendarStore";
import { mapReservationToEvent } from "@/utils/calendarUtils";

export const EventDialog = ({ open, onOpenChange, selectedEvent }) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null); // 'single' o 'series'
  const [futureEventsCount, setFutureEventsCount] = useState(0);

  const {
    loading,
    showToast,
    startLoading,
    stopLoading,
    setError,
    clearError,
  } = useUIStore(); // Obtén funciones de UI
  const {
    updateEvent,
    loadInitialEvents: reloadCalendarEvents,
    clearEvents,
  } = useEventStore(); // Obtén updateEvent y fetchEventsByWeek

  // Mover el foco al DialogContent
  const dialogRef = useRef(null);
  console.log("Event Loading:" + loading);
  console.log("Event open:" + open);

  // Colores de fondo de estado de reserva
  const estadoBgColor = {
    activa: "bg-green-300",
    penalizada: "bg-red-300",
    cancelada: "bg-gray-300",
    utilizada: "bg-cyan-300",
    reagendada: "bg-orange-300",
  };

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
        selectedEvent.tipo_reserva !== ReservationType.FIJA ||
        !selectedEvent.recurrence_id
      ) {
        setFutureEventsCount(0); // Resetea si no aplica
        return;
      }

      try {
        const startDate = dayjs(selectedEvent.start_time);
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

    if (actionToConfirm === "single") {
      // Si la acción es cancelar solo esta
      return {
        action: "single",
        message: (
          <p className="text-sm ">
            ¿Estás seguro de cancelar la reserva del <br />
            <span className="font-bold">
              {dayjs(selectedEvent.start_time)
                .format("dddd[ - ]")
                .toLocaleUpperCase()}
              {dayjs(selectedEvent.start_time).format("DD/MM/YYYY[ - ]")}
              {dayjs(selectedEvent.start_time).format("HH:mm[hs - ]")}
              {"Consultorio " + selectedEvent.consultorio_id}?
            </span>
            <br />
            <span className="text-xs text-gray-500">
              (Si cancelas con menos de 24hs de antelación, deberás pagar por la
              reserva, pero podrás reagendarla por un plazo de 6 días, a partir
              de la reserva original)
            </span>
          </p>
        ),
      };
    }

    if (actionToConfirm === "series") {
      // Si la acción es cancelar la serie
      return {
        action: "series",
        message: (
          <p className="text-sm">
            ¿Estás seguro que querés cancelar las <b>{futureEventsCount}</b>{" "}
            reservas futuras de esta serie FIJA, comenzando desde el{" "}
            <b>{dayjs(selectedEvent.start_time).format("DD/MM/YYYY")}</b>?
            <br />
            Esta acción <b>NO</b> se puede deshacer.
            <br />
            <span className="text-xs text-gray-500">
              (La primera reserva de la serie podrías tener que abonarla, si su
              cancelación es con menos de 24hs de antelación)
            </span>
          </p>
        ),
      };
    }

    if (actionToConfirm === "renew") {
      // Si la acción es renovar
      return {
        action: "renew",
        message: (
          <p className="text-sm">
            ¿Estás seguro que deseas renovar la reserva FIJA de los <br />
            <span className="font-bold">
              {dayjs(selectedEvent.start_time)
                .format("dddd[ - ]")
                .toLocaleUpperCase()}
              {dayjs(selectedEvent.start_time).format("HH:mm[hs - ]")}
              {"Consultorio " + selectedEvent.consultorio_id}
            </span>{" "}
            por 4 meses más?
            <br />
            <span className="text-sm text-muted-foreground">
              Se crearán y validarán nuevas reservas para el próximo período.
            </span>
          </p>
        ),
      };
    }
    return ""; // Mensaje por defecto si no hay tipo de acción
  };

  // --- Función Final de Confirmación ---
  const handleConfirmAction = () => {
    setIsConfirmDialogOpen(false); // Cierra el modal de confirmación
    console.log("Event Loading:" + loading);
    console.log("Event open:" + open);

    if (actionToConfirm === "single" || actionToConfirm === "series") {
      handleConfirmCancelAction();
    } else if (actionToConfirm === "renew") {
      handleRenewSeries();
    }
  };

  const handleConfirmCancelAction = async () => {
    if (!selectedEvent || !profileId) return;

    setIsConfirmDialogOpen(false);
    clearError();
    startLoading();

    try {
      let result; // Puede ser una o varias reservas actualizadas

      if (actionToConfirm === "single") {
        result = await cancelBooking(selectedEvent.id, profileId);
      } else if (actionToConfirm === "series") {
        // const currentDateForCancellation = dayjs().toDate(); // Fecha actual para la solicitud
        result = await cancelRecurringSeries(
          selectedEvent.recurrence_id,
          profileId,
          selectedEvent.start_time
        );
      }
      console.log(result);
      if (result && result.updatedBookings) {
        // 1. Actualiza el store
        result.updatedBookings.forEach((booking) => {
          const formattedEvent = mapReservationToEvent(booking);
          updateEvent(formattedEvent);
        });

        // 2. Muestra el toast específico
        let toastTitle = "Acción Completada";
        let toastMessage = "La operación se realizó con éxito.";

        switch (result.actionType) {
          case "PENALIZED":
            toastTitle = "Reserva Penalizada";
            toastMessage =
              "Cancelaste con menos de 24hs. La reserva fue PENALIZADA, por lo que deberás pagarla. Pero puedes reagendarla por un plazo de 6 días a partir de la fecha de la reserva original, sin costo adicional.";
            break;
          case "CANCELLED":
            toastTitle = "Reserva Cancelada";
            toastMessage =
              "La reserva ha sido cancelada correctamente sin penalización.";
            break;
          case "RESCHEDULE_REVERTED":
            toastTitle = "Reagendamiento Cancelado";
            toastMessage =
              "Se canceló la reserva reagendada. La reserva original que fue PENALIZADA ha sido reactivada, por lo que puedes volver a reagendarla por un plazo de 6 días a partir de la fecha de la reserva original, sin costo adicional.";
            break;
          case "SERIES_CANCELLED_WITH_PENALTY":
            toastTitle = "Serie Cancelada con Penalización";
            toastMessage =
              "La serie fue cancelada. La primera reserva fue PENALIZADA, por haberla cancelado con menos de 24 horas de anticipación. El resto de las reservas fueron CANCELADAS sin costo.";
            break;
          case "SERIES_CANCELLED":
            toastTitle = "Serie Cancelada";
            toastMessage =
              "Toda la serie de reservas ha sido cancelada correctamente.";
            break;
          case "NO_FUTURE_BOOKINGS":
            toastTitle = "Información";
            toastMessage =
              "No se encontraron reservas futuras activas en esta serie para cancelar.";
            break;
        }
        showToast({
          type: "success",
          title: toastTitle,
          message: toastMessage,
        });
      }

      // Cerrar diálogos
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

  // --- Lógica de Renovación ---
  const handleRenewSeries = async () => {
    if (!profile || !selectedEvent?.recurrence_id) return;

    startLoading();
    clearError();
    try {
      const result = await renewAndValidateSeries(
        selectedEvent.recurrence_id,
        profile.id
      );

      showToast({
        type: "success",
        title: "¡Serie Renovada!",
        message: `Se crearon ${
          result.newly_created_count || 0
        } nuevas reservas.`,
      });

      // Recargar todos los eventos para reflejar los cambios masivos
      clearEvents();
      reloadCalendarEvents();
      console.log(result);
      onOpenChange(false); // Cierra el diálogo de detalles
    } catch (err) {
      setError(err);
      showToast({
        type: "error",
        title: "No se Pudo Renovar la Serie",
        message: `Conflicto detectado: ${err.message}`,
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
          className="max-h-full overflow-y-auto"
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
                  value={selectedEvent.consultorio_id || "N/A"}
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
                  value={dayjs(selectedEvent.start_time).format("dddd")}
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
                  value={dayjs(selectedEvent.start_time).format("YYYY-MM-DD")}
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-between gap-4">
              {/* Hora de inicio */}
              <div className="space-y-2 w-full">
                <Label htmlFor="startTime">Hora de reserva</Label>
                <Input
                  id="startTime"
                  type="text"
                  value={`${dayjs(selectedEvent.start_time).format(
                    "HH:mm"
                  )} - ${dayjs(selectedEvent.end_time).format("HH:mm")}`}
                  disabled
                />
              </div>

              {/* Hora de fin */}
              <div className="space-y-2 w-full">
                <Label htmlFor="id">Identificador de reserva</Label>
                <Input id="id" type="text" value={selectedEvent.id} disabled />
              </div>
            </div>
            <div className="flex justify-between gap-4">
              {/* Tipo de reserva */}

              <div className="space-y-2 w-full">
                <Label htmlFor="tipo">Tipo de reserva</Label>
                <Input
                  id="tipo"
                  type="text"
                  value={selectedEvent.tipo_reserva}
                  disabled
                  className={
                    selectedEvent.tipo_reserva === ReservationType.FIJA
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
            </div>{" "}
            <div className="flex justify-between gap-4">
              {/* Estado de reserva */}
              <div className="space-y-2 w-full">
                <Label htmlFor="estado">Estado de reserva</Label>
                <Input
                  id="estado"
                  type="text"
                  value={selectedEvent.estado}
                  disabled
                  className={`capitalize ${
                    estadoBgColor[selectedEvent.estado] || "bg-white"
                  }`}
                />
              </div>
              {/* Fecha de creación */}
              <div className="space-y-2 w-full">
                <Label htmlFor="fechaCreacion">Fecha de creación</Label>
                <Input
                  id="fechaCreacion"
                  type="text"
                  value={dayjs(selectedEvent.created_at).format("DD/MM/YYYY")}
                  disabled
                />
              </div>
            </div>
            {selectedEvent.fecha_cancelacion && (
              <div className="flex justify-between gap-4">
                {/* Fecha de cancelación */}
                <div className="space-y-2 w-full">
                  <Label htmlFor="fechaCancelacion">Fecha de cancelación</Label>
                  <Input
                    id="fechaCancelacion"
                    type="text"
                    value={dayjs(selectedEvent.fecha_cancelacion).format(
                      "DD/MM/YYYY"
                    )}
                    disabled
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="fueReagendada">¿Fue Reagendada?</Label>
                  <Input
                    id="fueReagendada"
                    type="text"
                    value={selectedEvent.fue_reagendada ? "Sí" : "No"}
                    disabled
                  />
                </div>
              </div>
            )}
            {selectedEvent.recurrence_end_date && (
              <div className="flex justify-between gap-4">
                {/* Fecha de cancelación */}
                <div className="space-y-2 w-full">
                  <Label htmlFor="finReservaFija">Fin de reserva fija</Label>
                  <Input
                    id="finReservaFija"
                    type="text"
                    value={dayjs(selectedEvent.recurrence_end_date).format(
                      "DD/MM/YYYY"
                    )}
                    disabled
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="extenderFinReservaFija">
                    Extender fin de reserva fija
                  </Label>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button
                              onClick={() => {
                                setActionToConfirm("renew"); // Define que la acción es renovar la serie fija
                                setIsConfirmDialogOpen(true);
                              }}
                              variant="destructive" //
                              className="bg-orange-400 hover:bg-orange-600/50"
                              disabled={
                                !mismoUsuario ||
                                (selectedEvent.recurrence_end_date &&
                                  dayjs(selectedEvent.recurrence_end_date).diff(
                                    dayjs(),
                                    "day"
                                  ) > 45) ||
                                selectedEvent.estado !== "activa"
                              }
                            >
                              Extender por 4 meses
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!mismoUsuario ||
                          (selectedEvent.recurrence_end_date &&
                            dayjs(selectedEvent.recurrence_end_date).diff(
                              dayjs(),
                              "day"
                            ) > 45)) && (
                          <TooltipContent>
                            <p>
                              El botón está desactivado porque no es el usuario
                              que realizó la reserva <br />O la fecha de
                              finalización de la reserva FIJA es mayor a 45
                              días. <br />
                              Recién 45 días antes de la fecha de finalización,
                              podrá extender por 4 meses.
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            )}
            {selectedEvent.estado === "penalizada" && (
              <div className="space-y-2 w-full">
                <Label htmlFor="permiteReagendamiento">
                  Permite reagendar hasta
                </Label>
                <Input
                  id="permiteReagendamiento"
                  type="text"
                  value={`${dayjs(selectedEvent.permite_reagendar_hasta).format(
                    "DD/MM/YYYY"
                  )}${
                    dayjs().isAfter(
                      dayjs(selectedEvent.permite_reagendar_hasta),
                      "day"
                    )
                      ? " - Plazo vencido. Ya no se puede reagendar."
                      : ""
                  }`}
                  disabled
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="mt-4 flex justify-end gap-2">
              {/* Botón para cancelar TODA LA SERIE (solo si es fija) */}
              {selectedEvent.tipo_reserva === ReservationType.FIJA &&
                selectedEvent.estado === ReservationStatus.ACTIVA && (
                  <Button
                    onClick={() => {
                      setActionToConfirm("series"); // Define que la acción es cancelar la serie
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
                    setActionToConfirm("single"); // Define que la acción es cancelar solo esta
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
          onConfirm={handleConfirmAction}
        />
      )}
    </>
  );
};
