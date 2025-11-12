import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, Separator } from "@/components/ui/";
import dayjs from "dayjs";
import "dayjs/locale/es"; // Para usar el idioma español
import { useUIStore } from "@/stores/uiStore";
import { DisplayEventos } from "./DisplayEventos";
import { useState, useCallback } from "react";

dayjs.locale("es"); // Configura Day.js en español

export const ConfirmReservationDialog = ({
  open,
  onOpenChange,
  hourlyEvents,
  onConfirm,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false); // Estado local para bloqueo

  // ✅ FUNCIÓN CORREGIDA: Manejar confirmación con control de cierre mejorado
  const handleConfirm = useCallback(async () => {
    if (isProcessing) return; // Prevenir doble clic

    try {
      setIsProcessing(true);

      // Ejecutar la confirmación
      await onConfirm(hourlyEvents);

      // Cerrar diálogo con un pequeño delay para evitar conflictos de DOM
      setTimeout(() => {
        onOpenChange(false);
      }, 150);
    } catch (error) {
      console.error("Error al confirmar reserva:", error);
      // En caso de error, asegurar que el diálogo se cierre correctamente
      setTimeout(() => {
        onOpenChange(false);
      }, 150);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onConfirm, hourlyEvents, onOpenChange]);

  // ✅ FUNCIÓN CORREGIDA: Manejar cancelación
  const handleCancel = useCallback(() => {
    if (isProcessing) return; // No permitir cancelar durante procesamiento
    onOpenChange(false);
  }, [isProcessing, onOpenChange]);

  // ✅ FUNCIÓN CORREGIDA: Manejar cambios de estado del diálogo
  const handleOpenChange = useCallback(
    (isOpen) => {
      if (!isOpen && !isProcessing) {
        // Solo cerrar si no está procesando
        onOpenChange(isOpen);
      } else if (isOpen) {
        // Permitir abrir normalmente
        onOpenChange(isOpen);
      }
    },
    [isProcessing, onOpenChange]
  );

  // Determina si es un reagendamiento basado en los datos del evento
  const isReagendamiento = !!hourlyEvents?.[0]?.reagendamiento_de_id;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        // ✅ CRÍTICO: Prevenir cierre durante procesamiento
        onPointerDownOutside={(e) => {
          if (isProcessing) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isProcessing) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          {/* Título Condicional */}
          <DialogTitle>
            {isReagendamiento
              ? "Confirmar Reagendamiento"
              : "Confirmar Reserva"}
          </DialogTitle>
          <Separator />
          <DialogDescription>
            {isReagendamiento
              ? "Vas a crear la siguiente nueva reserva como reemplazo de tu reserva penalizada:"
              : "Vas a reservar las siguientes horas:"}
          </DialogDescription>
          <DisplayEventos hourlyEvents={hourlyEvents} />
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? "Confirmando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
