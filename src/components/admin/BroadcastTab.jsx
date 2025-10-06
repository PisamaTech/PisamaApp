import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUIStore } from "@/stores/uiStore";
import { sendBroadcastNotification } from "@/services/adminService";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const broadcastSchema = z.object({
  tipo: z.string().nonempty("Debes seleccionar un tipo."),
  titulo: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres."),
  enlace: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => val === "" || /^\/[a-zA-Z0-9-_\/]+$/.test(val),
      "Debe ser una ruta válida que comience con '/' (por ejemplo: /perfil, /dashboard, /calendario_diario)."
    ),
});

const BroadcastTab = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(broadcastSchema),
  });

  const onSubmit = async (data) => {
    // Confirmación antes de enviar
    const confirmed = window.confirm(
      "¿Estás seguro de que quieres enviar esta notificación a TODOS los usuarios? Esta acción no se puede deshacer."
    );
    if (!confirmed) return;

    startLoading();
    try {
      const result = await sendBroadcastNotification(data);
      showToast({
        type: "success",
        title: "Envío Exitoso",
        message: `Se encolaron ${result.notifications_created} notificaciones para ser enviadas.`,
      });
      reset({ tipo: "", titulo: "", mensaje: "", enlace: "" }); // Limpia el formulario
    } catch (error) {
      showToast({
        type: "error",
        title: "Error en el Envío",
        message: error.message,
      });
    } finally {
      stopLoading();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar Notificación Masiva</CardTitle>
        <CardDescription>
          Envía un mensaje a todos los usuarios de la plataforma. La
          notificación se enviará a los canales que cada usuario tenga activados
          en sus preferencias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo de Notificación</Label>
            <Select
              onValueChange={(value) =>
                reset({ ...control._formValues, tipo: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de aviso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NUEVA_FUNCIONALIDAD">
                  Nueva Funcionalidad
                </SelectItem>
                <SelectItem value="CAMBIO_DE_PRECIO">
                  Cambio de Precio
                </SelectItem>
                <SelectItem value="AVISO_GENERAL">Aviso General</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-red-500">{errors.tipo.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              {...register("titulo")}
              placeholder="Ej: ¡Nueva sección de Ayuda disponible!"
            />
            {errors.titulo && (
              <p className="text-sm text-red-500">{errors.titulo.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="mensaje">Mensaje</Label>
            <Textarea
              id="mensaje"
              {...register("mensaje")}
              placeholder="Describe la novedad o el aviso aquí..."
              rows={5}
            />
            {errors.mensaje && (
              <p className="text-sm text-red-500">{errors.mensaje.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="enlace">Enlace (Opcional)</Label>
            <Input
              id="enlace"
              {...register("enlace")}
              placeholder="Ej: https://tu-app.com/ayuda"
            />
            {errors.enlace && (
              <p className="text-sm text-red-500">{errors.enlace.message}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Enviando..." : "Enviar a Todos los Usuarios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BroadcastTab;
