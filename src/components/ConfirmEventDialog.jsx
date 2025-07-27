import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Repeat } from "lucide-react";
import { Separator } from "./ui";
import { useUIStore } from "@/stores/uiStore";
import { useCallback } from "react";

export const ConfirmCancelDialog = ({
  open,
  onOpenChange,
  message,
  onConfirm,
}) => {
  const { loading } = useUIStore();

  const isCancelAction =
    message.action === "single" || message.action === "series";
  const isRenewAction = message.action === "renew";

  const title = isCancelAction
    ? "Confirmar Cancelación"
    : isRenewAction
    ? "Renovar Reservas"
    : "Confirmar Acción";

  const icon = isCancelAction ? (
    <AlertTriangle className="h-5 w-5 text-red-600" />
  ) : isRenewAction ? (
    <Repeat className="h-5 w-5 text-green-600" />
  ) : null;

  const buttonVariant = isCancelAction ? "destructive" : "default";

  const confirmButtonText = isCancelAction
    ? loading
      ? "Confirmando..."
      : "Confirmar Cancelación"
    : isRenewAction
    ? loading
      ? "Renovando..."
      : "Renovar Reservas"
    : "Confirmar";

  // ✅ FUNCIÓN CRÍTICA: Manejar confirmación y cerrar inmediatamente
  const handleConfirm = useCallback(() => {
    // Primero cerrar el diálogo de confirmación
    onOpenChange(false);

    // Luego ejecutar la acción
    setTimeout(() => {
      onConfirm();
    }, 100);
  }, [onOpenChange, onConfirm]);

  // ✅ FUNCIÓN CRÍTICA: Manejar cancelación
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // ✅ CRÍTICO: Prevenir cierre accidental con escape/click fuera durante loading
      modal={true}
    >
      <DialogContent
        className="max-w-md"
        // ✅ CRÍTICO: Prevenir cierre durante operación
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
          <DialogTitle
            className={`flex items-center gap-2 ${
              isCancelAction
                ? "text-red-600"
                : isRenewAction
                ? "text-green-600"
                : ""
            }`}
          >
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>
        <Separator />
        <DialogDescription />
        <div className="space-y-8">
          <div className="text-gray-600">{message.message}</div>
          <DialogFooter>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Volver
              </Button>
              <Button
                variant={buttonVariant}
                onClick={handleConfirm}
                disabled={loading}
              >
                {confirmButtonText}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
