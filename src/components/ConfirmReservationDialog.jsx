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

dayjs.locale("es"); // Configura Day.js en español

export const ConfirmReservationDialog = ({
  open,
  onOpenChange,
  hourlyEvents,
  onConfirm,
  onCancel,
}) => {
  const { loading } = useUIStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Reserva</DialogTitle>
          <Separator />
          <DialogDescription>
            Vas a reservar las siguientes horas:
          </DialogDescription>
          <DisplayEventos hourlyEvents={hourlyEvents} />
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Confirmando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
