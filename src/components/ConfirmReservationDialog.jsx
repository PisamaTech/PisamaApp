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
import { useState } from "react";

dayjs.locale("es"); // Configura Day.js en español

export const ConfirmReservationDialog = ({
  open,
  onOpenChange,
  hourlyEvents,
  onConfirm,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false); // Estado local para bloqueo

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm(hourlyEvents); // Esperar a que complete la operación
      onOpenChange(false); // Cerrar el diálogo explícitamente
    } finally {
      setIsProcessing(false);
    }
  };

  // Determina si es un reagendamiento basado en los datos del evento
  const isReagendamiento = !!hourlyEvents?.[0]?.reagendamiento_de_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
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
