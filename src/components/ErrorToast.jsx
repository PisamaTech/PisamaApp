import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";

export default function ErrorToast() {
  const { toast, hideToast } = useUIStore(); // <--- Obtengo el estado y la función del store UI
  const { isOpen, type, title, message } = toast; // <--- Desestructura las propiedades

  const Icon = type === "error" ? AlertCircle : CheckCircle2;

  // ✅ SAFETY: Forzar limpieza de pointer-events al cerrar
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = ""; // También asegurar scroll
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  //  No renderizar si no está abierto
  if (!isOpen) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={hideToast}>
      <AlertDialogContent className="max-w-md p-0 overflow-hidden">
        <div
          className={cn(
            "p-4 bg-gradient-to-br",
            type === "error"
              ? "bg-gradient-to-b from-red-500 to-red-600"
              : "bg-gradient-to-b from-green-500 to-green-600"
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Icon className="w-6 h-6" />
              <span className="text-xl font-semibold">{title}</span>
            </AlertDialogTitle>
          </AlertDialogHeader>
        </div>
        <div className="p-4 bg-white">
          <AlertDialogDescription className="text-gray-700 text-base mb-4">
            {message}
          </AlertDialogDescription>
          <AlertDialogFooter className="flex justify-center pt-2">
            <Button
              onClick={hideToast} // Usa la función del store
              className={cn(
                "transition-colors",
                type === "error"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              )}
            >
              Cerrar
            </Button>
          </AlertDialogFooter>
        </div>
        <Button
          className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={hideToast} // Usa la función del store
          variant="ghost"
          size="icon"
        >
          <X className="w-4 h-4 text-white" />
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
