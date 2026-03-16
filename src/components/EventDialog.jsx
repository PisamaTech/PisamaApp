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
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CalendarClock, RefreshCw, ShieldCheck, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ReservationStatus, ReservationType } from "@/utils/constants";
import { ConfirmCancelDialog } from "./ConfirmEventDialog";
import {
  cancelBooking,
  cancelRecurringSeries,
  renewAndValidateSeries,
  forgivePenalty,
  supabase,
} from "@/supabase";
import { useUIStore } from "@/stores/uiStore";
import { useEventStore } from "@/stores/calendarStore";
import { mapReservationToEvent } from "@/utils/calendarUtils";

export const EventDialog = ({ open, onOpenChange, selectedEvent }) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [futureEventsCount, setFutureEventsCount] = useState(0);
  const navigate = useNavigate();

  const {
    loading,
    showToast,
    startLoading,
    stopLoading,
    setError,
    clearError,
    startReagendamientoMode,
  } = useUIStore();

  const {
    updateEvent,
    loadInitialEvents: reloadCalendarEvents,
    clearEvents,
  } = useEventStore();

  const dialogRef = useRef(null);

  // Estados de fondo para las reservas
  const estadoBgColor = {
    activa: "bg-green-300",
    penalizada: "bg-red-300",
    cancelada: "bg-gray-300",
    utilizada: "bg-cyan-300",
    reagendada: "bg-orange-300",
  };

  // ✅ FUNCIÓN CRÍTICA: Cerrar todos los diálogos de forma limpia
  const closeAllDialogs = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setActionToConfirm(null);
    // Usar un pequeño delay para asegurar que el estado se actualice
    setTimeout(() => {
      onOpenChange(false);
    }, 100);
  }, [onOpenChange]);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Extraer datos del usuario
  const { profile } = useAuthStore.getState();
  const { id: profileId, role: userRole } = profile;

  // Determinar si el usuario puede realizar acciones de cancelación
  const isOwner = selectedEvent && profileId === selectedEvent.usuario_id;
  const canCancel = isOwner || userRole === "admin";
  // Obtener cantidad de eventos futuros en la serie
  useEffect(() => {
    const fetchFutureEvents = async () => {
      if (
        !selectedEvent ||
        selectedEvent.tipo_reserva !== ReservationType.FIJA ||
        !selectedEvent.recurrence_id
      ) {
        setFutureEventsCount(0);
        return;
      }

      try {
        const startDate = dayjs(selectedEvent.start_time);
        if (!startDate.isValid()) {
          console.error("Fecha de inicio inválida para buscar eventos futuros");
          setFutureEventsCount(0);
          return;
        }

        const { count, error } = await supabase
          .from("reservas")
          .select("*", { count: "exact" })
          .eq("recurrence_id", selectedEvent.recurrence_id)
          .eq("estado", ReservationStatus.ACTIVA)
          .gte("start_time", startDate.toISOString());

        if (error) throw error;
        setFutureEventsCount(count || 0);
      } catch (error) {
        console.error("Error al buscar eventos futuros:", error);
        setFutureEventsCount(0);
      }
    };

    if (open && selectedEvent) {
      fetchFutureEvents();
    }
  }, [open, selectedEvent]);

  const getConfirmationMessage = () => {
    if (!selectedEvent) return "";

    if (actionToConfirm === "single") {
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
    return "";
  };

  // ✅ FUNCIÓN CORREGIDA: Manejar confirmación de acciones
  const handleConfirmAction = useCallback(() => {
    // Guardar la acción actual antes de que se resetee
    const currentAction = actionToConfirm;

    if (currentAction === "single" || currentAction === "series") {
      handleConfirmCancelAction();
    } else if (currentAction === "renew") {
      handleRenewSeries();
    }
  }, [actionToConfirm]);

  // ✅ FUNCIÓN CORREGIDA: Manejar cancelación con cierre apropiado
  const handleConfirmCancelAction = async () => {
    if (!selectedEvent || !profileId) return;

    // ✅ CRÍTICO: Activar loading con mensaje específico ANTES de cerrar diálogos
    clearError();

    // Determinar el mensaje de loading basado en la acción
    const loadingMessage =
      actionToConfirm === "single"
        ? "Cancelando reserva..."
        : "Cancelando serie de reservas...";

    startLoading(loadingMessage);

    // ✅ CRÍTICO: Cerrar diálogo de confirmación pero mantener el principal abierto para mostrar loading
    setIsConfirmDialogOpen(false);
    setActionToConfirm(null);

    try {
      let result;

      if (actionToConfirm === "single") {
        result = await cancelBooking(selectedEvent.id, profileId, userRole);
      } else if (actionToConfirm === "series") {
        result = await cancelRecurringSeries(
          selectedEvent.recurrence_id,
          selectedEvent.usuario_id, // seriesOwnerId
          profileId, // requestingUserId
          userRole, // requestingUserRole
          selectedEvent.start_time,
        );
      }

      if (result && result.updatedBookings) {
        // Actualizar el store
        result.updatedBookings.forEach((booking) => {
          const formattedEvent = mapReservationToEvent(booking);
          updateEvent(formattedEvent);
        });

        // Preparar el toast específico
        let toastTitle = "Acción Completada";
        let toastMessage = "La operación se realizó con éxito.";
        let toastType = "success"; // Por defecto es éxito (verde)

        switch (result.actionType) {
          case "PENALIZED":
            toastTitle = "Reserva Penalizada";
            toastMessage =
              "Cancelaste con menos de 24hs. La reserva fue PENALIZADA, por lo que deberás pagarla. Pero puedes reagendarla por un plazo de 6 días a partir de la fecha de la reserva original, sin costo adicional.";
            toastType = "warning"; // Ámbar para penalizaciones
            break;
          case "RESCHEDULE_PENALIZED":
            toastTitle = "Reserva reagendada Penalizada";
            toastMessage =
              "Cancelaste con menos de 24hs. La reserva ya era una reserva REAGENDADA, por lo que deberás pagarla, sin otra posibilidad de reagendarla.";
            toastType = "warning"; // Ámbar para penalizaciones
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
            toastType = "warning"; // Ámbar para penalizaciones
            break;
          case "SERIES_CANCELLED_WITH_PENALTY":
            toastTitle = "Serie Cancelada con Penalización";
            toastMessage =
              "La serie fue cancelada. La primera reserva fue PENALIZADA, por haberla cancelado con menos de 24 horas de anticipación. El resto de las reservas fueron CANCELADAS sin costo.";
            toastType = "warning"; // Ámbar para penalizaciones
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

        // ✅ CRÍTICO: Cerrar diálogo principal DESPUÉS de la operación exitosa
        onOpenChange(false);

        // Mostrar toast después de cerrar diálogos
        setTimeout(() => {
          showToast({
            type: toastType,
            title: toastTitle,
            message: toastMessage,
          });
        }, 200);
      }
    } catch (error) {
      setError(error);
      // ✅ También cerrar diálogo principal en caso de error
      onOpenChange(false);

      setTimeout(() => {
        showToast({
          type: "error",
          title: "Error en la Cancelación",
          message: error.message || "Ocurrió un error al intentar cancelar.",
        });
      }, 200);
    } finally {
      stopLoading();
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Manejar renovación con cierre apropiado
  const handleRenewSeries = async () => {
    if (!profile || !selectedEvent?.recurrence_id) return;

    // ✅ CRÍTICO: Activar loading ANTES de cerrar diálogos
    clearError();
    startLoading("Renovando reservas fijas...");

    // ✅ CRÍTICO: Cerrar diálogo de confirmación pero mantener el principal abierto para mostrar loading
    setIsConfirmDialogOpen(false);
    setActionToConfirm(null);

    try {
      const result = await renewAndValidateSeries(
        selectedEvent.recurrence_id,
        profile.id,
      );

      // ✅ CRÍTICO: Cerrar diálogo principal DESPUÉS de la operación exitosa
      onOpenChange(false);

      // Recargar eventos y mostrar toast
      setTimeout(() => {
        clearEvents();
        reloadCalendarEvents();

        showToast({
          type: "success",
          title: "¡Serie Renovada!",
          message: `Se crearon ${
            result.newly_created_count || 0
          } nuevas reservas.`,
        });
      }, 200);
    } catch (err) {
      setError(err);
      // ✅ También cerrar diálogo principal en caso de error
      onOpenChange(false);

      setTimeout(() => {
        showToast({
          type: "error",
          title: "No se Pudo Renovar la Serie",
          message: `Conflicto detectado: ${err.message}`,
        });
      }, 200);
    } finally {
      stopLoading();
    }
  };

  const handleForgivePenalty = async () => {
    if (!selectedEvent || userRole !== "admin" || !profileId) return;

    clearError();
    startLoading("Actualizando estado...");

    try {
      const updatedBooking = await forgivePenalty(selectedEvent.id, profileId);

      // Actualizar el store del calendario
      updateEvent(mapReservationToEvent(updatedBooking));

      // Cerrar el diálogo
      onOpenChange(false);

      // Mostrar toast después de cerrar
      setTimeout(() => {
        showToast({
          type: "success",
          title: "Estado Actualizado",
          message: "La penalización de la reserva ha sido perdonada.",
        });
      }, 200);
    } catch (err) {
      setError(err);
      onOpenChange(false); // Cerrar también en caso de error

      setTimeout(() => {
        showToast({
          type: "error",
          title: "Error",
          message: err.message || "No se pudo actualizar el estado.",
        });
      }, 200);
    } finally {
      stopLoading();
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Manejar cierre del diálogo de confirmación
  const handleConfirmDialogClose = useCallback((isOpen) => {
    setIsConfirmDialogOpen(isOpen);
    if (!isOpen) {
      setActionToConfirm(null);
    }
  }, []);

  // Si no hay evento seleccionado, no renderizar
  if (!selectedEvent) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={dialogRef}
          tabIndex={-1}
          className="max-h-full overflow-y-auto max-w-[95vw] sm:max-w-[600px]"
          // ✅ CRÍTICO: Prevenir cierre durante loading para mostrar el LoadingOverlay
          onPointerDownOutside={(e) => {
            if (loading) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (loading) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="mb-3">
              <div className="flex gap-2 sm:gap-3 items-center">
                <CalendarClock size={18} className="sm:w-5 sm:h-5" />
                <span className="text-base sm:text-lg">
                  Datos de la reserva
                </span>
              </div>
            </DialogTitle>
            <Separator />
          </DialogHeader>
          <DialogDescription className="text-xs sm:text-sm">
            Aquí puede ver los detalles de la reserva seleccionada. <br />
            Si la reserva es tuya y está activa, podrás cancelarla.
          </DialogDescription>

          <div className="space-y-2 sm:space-y-3">
            {/* Campos del formulario - mantienen el mismo contenido */}
            <div className="flex flex-row justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="titular" className="text-xs sm:text-sm">
                  Titular de la reserva
                </Label>
                <Input
                  id="titular"
                  type="text"
                  value={selectedEvent.titulo || "N/A"}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="resourceId" className="text-xs sm:text-sm">
                  Consultorio
                </Label>
                <Input
                  id="resourceId"
                  type="text"
                  value={selectedEvent.consultorio_id || "N/A"}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </div>

            <div className="flex flex-row justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="dia" className="text-xs sm:text-sm">
                  Día de reserva
                </Label>
                <Input
                  id="dia"
                  type="text"
                  value={dayjs(selectedEvent.start_time).format("dddd")}
                  className="capitalize text-xs sm:text-sm h-8 sm:h-10"
                  disabled
                />
              </div>
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="date" className="text-xs sm:text-sm">
                  Fecha de reserva
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={dayjs(selectedEvent.start_time).format("YYYY-MM-DD")}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </div>

            {/* Hora de reserva | ¿Utilizarás la camilla? */}
            <div className="flex flex-row justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="startTime" className="text-xs sm:text-sm">
                  Hora de reserva
                </Label>
                <Input
                  id="startTime"
                  type="text"
                  value={`${dayjs(selectedEvent.start_time).format(
                    "HH:mm",
                  )} - ${dayjs(selectedEvent.end_time).format("HH:mm")}`}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="usaCamilla" className="text-xs sm:text-sm">
                  ¿Utilizarás la camilla?
                </Label>
                <Input
                  id="usaCamilla"
                  type="text"
                  value={selectedEvent.usaCamilla ? "Sí" : "No"}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
            </div>

            {/* Tipo de reserva | Estado de reserva */}
            <div className="flex flex-row justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="tipo" className="text-xs sm:text-sm">
                  Tipo de reserva
                </Label>
                <Input
                  id="tipo"
                  type="text"
                  value={selectedEvent.tipo_reserva}
                  disabled
                  className={`text-xs sm:text-sm h-8 sm:h-10 ${
                    selectedEvent.tipo_reserva === ReservationType.FIJA
                      ? "bg-fija"
                      : "bg-eventual"
                  }`}
                />
              </div>
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="estado" className="text-xs sm:text-sm">
                  Estado de reserva
                </Label>
                <Input
                  id="estado"
                  type="text"
                  value={selectedEvent.estado}
                  disabled
                  className={`capitalize text-xs sm:text-sm h-8 sm:h-10 ${
                    estadoBgColor[selectedEvent.estado] || "bg-white"
                  }`}
                />
              </div>
            </div>

            {/* Fecha de creación | Fecha de cancelación (si existe) */}
            <div className="flex flex-row justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="fechaCreacion" className="text-xs sm:text-sm">
                  Fecha de creación
                </Label>
                <Input
                  id="fechaCreacion"
                  type="text"
                  value={dayjs(selectedEvent.created_at).format(
                    "DD/MM/YYYY - HH:mm",
                  )}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              {selectedEvent.fecha_cancelacion && (
                <div className="space-y-1 sm:space-y-2 w-full">
                  <Label
                    htmlFor="fechaCancelacion"
                    className="text-xs sm:text-sm"
                  >
                    Fecha de cancelación
                  </Label>
                  <Input
                    id="fechaCancelacion"
                    type="text"
                    value={dayjs(selectedEvent.fecha_cancelacion).format(
                      "DD/MM/YY [-] HH:mm",
                    )}
                    disabled
                    className="text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
              )}
            </div>

            {/* Identificador de reserva | ¿Fue Reagendada? (si hay fecha_cancelacion) */}
            <div className="flex flex-row justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="id" className="text-xs sm:text-sm">
                  Identificador de reserva
                </Label>
                <Input
                  id="id"
                  type="text"
                  value={selectedEvent.id}
                  disabled
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
              </div>
              {selectedEvent.fecha_cancelacion && (
                <div className="space-y-1 sm:space-y-2 w-full">
                  <Label htmlFor="fueReagendada" className="text-xs sm:text-sm">
                    ¿Fue Reagendada?
                  </Label>
                  <Input
                    id="fueReagendada"
                    type="text"
                    value={selectedEvent.fue_reagendada ? "Sí" : "No"}
                    disabled
                    className="text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
              )}
            </div>

            {/* Mostrar reagendamiento y/o permite reagendar */}
            {(selectedEvent.reagendamiento_de_id ||
              selectedEvent.estado === "penalizada") && (
              <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4">
                {/* Reagendamiento de reserva */}
                {selectedEvent.reagendamiento_de_id && (
                  <div
                    className={`space-y-1 sm:space-y-2 w-full ${
                      selectedEvent.estado === "penalizada" ? "sm:w-1/3" : ""
                    }`}
                  >
                    <Label
                      htmlFor="reagendamientoDeId"
                      className="text-xs sm:text-sm"
                    >
                      Reagendamiento de
                    </Label>
                    <Input
                      id="reagendamientoDeId"
                      type="text"
                      value={`#${selectedEvent.reagendamiento_de_id}`}
                      disabled
                      className="text-xs sm:text-sm h-8 sm:h-10 bg-orange-100 font-medium"
                    />
                  </div>
                )}

                {/* Permite reagendar hasta */}
                {selectedEvent.estado === "penalizada" && (
                  <div
                    className={`space-y-1 sm:space-y-2 w-full ${
                      selectedEvent.reagendamiento_de_id ? "sm:w-2/3" : ""
                    }`}
                  >
                    <Label
                      htmlFor="permiteReagendamiento"
                      className="text-xs sm:text-sm"
                    >
                      Permite reagendar hasta
                    </Label>
                    {/* Priorizar: si es reagendamiento, nunca puede reagendar */}
                    {selectedEvent.reagendamiento_de_id ? (
                      <Input
                        id="permiteReagendamiento"
                        type="text"
                        value="No permite - Ya era un reagendamiento"
                        disabled
                        className="text-xs sm:text-sm h-8 sm:h-10 bg-red-100 text-red-700 font-medium"
                      />
                    ) : selectedEvent.permite_reagendar_hasta ? (
                      <Input
                        id="permiteReagendamiento"
                        type="text"
                        value={`${dayjs(
                          selectedEvent.permite_reagendar_hasta,
                        ).format("DD/MM/YYYY")}${
                          dayjs().isAfter(
                            dayjs(selectedEvent.permite_reagendar_hasta),
                            "day",
                          )
                            ? " - Plazo vencido. Ya no se puede reagendar."
                            : ""
                        }`}
                        disabled
                        className="text-xs sm:text-sm h-8 sm:h-10"
                      />
                    ) : (
                      <Input
                        id="permiteReagendamiento"
                        type="text"
                        value="Sin fecha de reagendamiento"
                        disabled
                        className="text-xs sm:text-sm h-8 sm:h-10"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedEvent.recurrence_end_date && (
              <div className="flex flex-row justify-between gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2 w-full">
                  <Label
                    htmlFor="finReservaFija"
                    className="text-xs sm:text-sm"
                  >
                    Fin de reserva fija
                  </Label>
                  <Input
                    id="finReservaFija"
                    type="text"
                    value={dayjs(selectedEvent.recurrence_end_date).format(
                      "DD/MM/YYYY",
                    )}
                    disabled
                    className="text-xs sm:text-sm h-8 sm:h-10"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2 w-full">
                  <Label
                    htmlFor="extenderFinReservaFija"
                    className="text-xs sm:text-sm"
                  >
                    Extender fin de reserva fija
                  </Label>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block w-full">
                            <Button
                              onClick={() => {
                                setActionToConfirm("renew");
                                setIsConfirmDialogOpen(true);
                              }}
                              variant="destructive"
                              className="bg-orange-400 hover:bg-orange-600/50 text-xs sm:text-sm h-8 sm:h-10 w-full"
                              disabled={
                                !canCancel ||
                                loading ||
                                (selectedEvent.recurrence_end_date &&
                                  dayjs(selectedEvent.recurrence_end_date).diff(
                                    dayjs(),
                                    "day",
                                  ) > 45) ||
                                selectedEvent.estado !== "activa"
                              }
                            >
                              Extender por 4 meses
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!canCancel ||
                          (selectedEvent.recurrence_end_date &&
                            dayjs(selectedEvent.recurrence_end_date).diff(
                              dayjs(),
                              "day",
                            ) > 45)) && (
                          <TooltipContent className="text-xs">
                            <p>
                              El botón está desactivado porque no sos el usuario
                              que realizó la reserva ni sos administrador, <br />
                              o la fecha de finalización de la reserva FIJA es mayor a 45
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
          </div>

          <DialogFooter>
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end gap-2 w-full">
              {/* --- BOTÓN PARA DESPENALIZAR (solo admin) --- */}
              {userRole === "admin" &&
                selectedEvent.estado === ReservationStatus.PENALIZADA && (
                  <Button
                    onClick={handleForgivePenalty}
                    className="bg-emerald-700 hover:bg-emerald-600 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto"
                    disabled={loading}
                  >
                    <ShieldCheck className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Despenalizar Reserva
                  </Button>
                )}

              {/* --- BOTÓN PARA REAGENDAR (reserva penalizada que permite reagendamiento) --- */}
              {selectedEvent.estado === ReservationStatus.PENALIZADA &&
                canCancel &&
                !selectedEvent.reagendamiento_de_id &&
                selectedEvent.permite_reagendar_hasta &&
                !dayjs().isAfter(
                  dayjs(selectedEvent.permite_reagendar_hasta),
                  "day",
                ) && (
                  <Button
                    onClick={() => {
                      startReagendamientoMode(selectedEvent);
                      onOpenChange(false);
                      navigate("/calendario_diario");
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto"
                    disabled={loading}
                  >
                    <CalendarPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Reagendar Reserva
                  </Button>
                )}

              {selectedEvent.tipo_reserva === ReservationType.FIJA &&
                selectedEvent.estado === ReservationStatus.ACTIVA && (
                  <Button
                    onClick={() => {
                      setActionToConfirm("series");
                      setIsConfirmDialogOpen(true);
                    }}
                    variant="destructive"
                    className="bg-fija hover:bg-fija/70 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto"
                    disabled={!canCancel || loading}
                  >
                    Cancelar Serie Completa
                  </Button>
                )}

              {selectedEvent.estado === ReservationStatus.ACTIVA && (
                <Button
                  onClick={() => {
                    setActionToConfirm("single");
                    setIsConfirmDialogOpen(true);
                  }}
                  variant="destructive"
                  className="bg-eventual text-slate-900 hover:bg-eventual/70 text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto"
                  disabled={!canCancel || loading}
                >
                  Cancelar Esta Reserva
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <ConfirmCancelDialog
          open={isConfirmDialogOpen}
          onOpenChange={handleConfirmDialogClose}
          message={getConfirmationMessage()}
          onConfirm={handleConfirmAction}
        />
      )}
    </>
  );
};
