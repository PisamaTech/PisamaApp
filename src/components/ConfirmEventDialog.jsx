import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { DialogDescription, Separator } from "./ui";
import { useUIStore } from "@/stores/uiStore";

export const ConfirmCancelDialog = ({
  open,
  onOpenChange,
  message,
  onConfirm,
}) => {
  const { loading } = useUIStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Cancelación
          </DialogTitle>
        </DialogHeader>
        <Separator />
        <DialogDescription />
        <div className="space-y-8">
          <div className="text-gray-600">{message}</div>
          <DialogFooter>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Confirmando..." : "Confirmar Cancelación"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------------------------
// VERSION ANTERIOR
// ---------------------------------------------------------------------------------------------

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Button, Separator } from "@/components/ui/";
// import dayjs from "dayjs";
// import { useUIStore } from "@/stores/uiStore";
// import { DisplayEventos } from "./DisplayEventos";

// export const ConfirmEventDialog = ({
//   open,
//   onOpenChange,
//   selectedEvent,
//   onConfirm,
//   onCancel,
// }) => {
//   const { loading } = useUIStore();

//   return (
//     <Dialog open={true} onOpenChange={onOpenChange}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Cancelar Reserva</DialogTitle>
//           <Separator />
//           <DialogDescription>
//             Vas a cancelar la siguiente reserva:
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <Button variant="outline" onClick={onCancel}>
//             Cancelar
//           </Button>
//           <Button onClick={onConfirm} disabled={loading}>
//             {loading ? "Confirmando..." : "Confirmar"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };
