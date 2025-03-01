import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // Ajusta la ruta según tu proyecto
import { Button, Badge, Separator } from "@/components/ui/"; // Ajusta la ruta según tu proyecto
import dayjs from "dayjs";
import "dayjs/locale/es"; // Para usar el idioma español

dayjs.locale("es"); // Configura Day.js en español

export const ConfirmReservationDialog = ({
  open,
  onOpenChange,
  hourlyEvents,
  onConfirm,
  onCancel,
}) => {
  // Función para formatear cada evento en el formato solicitado
  const formatEvent = (event) => {
    const dayOfWeek = dayjs(event.start).format("dddd").toUpperCase(); // Ej: "LUNES"
    const date = dayjs(event.start).format("D/M"); // Ej: "25/2"
    const time = dayjs(event.start).format("HH[h]"); // Ej: "19h"
    const consultorio = event.resourceId
      ? `Consultorio ${event.resourceId}`
      : "Sin consultorio";
    const camillaText = event.usaCamilla ? " - con Camilla" : ""; // Omite si usaCamilla es false

    return `  ${dayOfWeek} ${date} - ${time} - ${consultorio}${camillaText}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Reserva</DialogTitle>
          <Separator />
          <DialogDescription>
            Vas a reservar las siguientes horas:
            <ul className="mt-3">
              {hourlyEvents.map((event, index) => (
                <li key={index} className="text-sm font-bold">
                  <Badge
                    variant={event.tipo.toLowerCase()}
                    className="mr-1 mt-1"
                  >
                    <span>{event.tipo.toUpperCase()}</span>
                  </Badge>
                  {formatEvent(event)}
                </li>
              ))}
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
