import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { createManualPayment } from "@/services/paymentService";
import { createNotification } from "@/services/notificationService";
import { PAYMENT_TYPES } from "@/utils/paymentHelpers";
import { Plus } from "lucide-react";

// --- Importaciones de Componentes Shadcn UI ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const RegisterPaymentModal = ({
  userId,
  userName,
  onSuccess,
  trigger,
}) => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    type: "transferencia",
    note: "",
  });

  const handleCreatePayment = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      showToast({
        type: "error",
        title: "Error",
        message: "El monto es requerido y debe ser un número válido",
      });
      return;
    }

    try {
      startLoading();
      await createManualPayment({
        userId,
        amount: parseFloat(form.amount),
        type: form.type,
        note: form.note,
      });

      // Crear notificación para el usuario
      await createNotification({
        usuarioId: userId,
        tipo: "PAGO_REGISTRADO",
        titulo: "Pago Registrado",
        mensaje: `Se ha registrado un pago de $${parseFloat(
          form.amount,
        ).toLocaleString("es-UY")} en tu cuenta.`,
        enlace: "/pagos",
      });

      showToast({
        type: "success",
        title: "Éxito",
        message: "Pago registrado correctamente",
      });

      setIsOpen(false);
      setForm({
        amount: "",
        type: "transferencia",
        note: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: `No se pudo registrar el pago: ${error.message}`,
      });
    } finally {
      stopLoading();
    }
  };

  const { amount, type, note } = form;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Pago
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Registra un pago manual para <strong>{userName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                className="pl-7"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Pago *</Label>
            <Select
              value={type}
              onValueChange={(value) => setForm({ ...form, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Textarea
              id="note"
              placeholder="Referencia de transferencia, número de recibo, etc."
              value={note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreatePayment} disabled={loading}>
            {loading ? "Registrando..." : "Registrar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
