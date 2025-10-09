import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUIStore } from "@/stores/uiStore";
import {
  sendBroadcastNotification,
  sendNotificationToUsers,
  fetchAllUsers,
} from "@/services/adminService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserMultiSelectCombobox } from "@/components/admin/UserMultiSelectCombobox";

const broadcastSchema = z
  .object({
    targetMode: z.enum(["all", "specific"], {
      required_error: "Debes seleccionar a quién enviar el mensaje.",
    }),
    userIds: z.array(z.string()).optional(),
    tipo: z.string().optional(),
    titulo: z.string().min(5, "El título debe tener al menos 5 caracteres."),
    mensaje: z
      .string()
      .min(10, "El mensaje debe tener al menos 10 caracteres."),
    enlace: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (val === "") return true;
          const isInternalPath = val.startsWith("/");
          const isExternalUrl =
            val.startsWith("http://") || val.startsWith("https://");
          return isInternalPath || isExternalUrl;
        },
        {
          message:
            "Debe ser una ruta interna (ej: /perfil) o una URL completa (ej: https://...).",
        }
      ),
  })
  .refine(
    (data) => {
      if (data.targetMode === "specific") {
        return data.userIds && data.userIds.length > 0;
      }
      return true;
    },
    {
      message: "Debes seleccionar al menos un usuario.",
      path: ["userIds"], // Asocia el error al campo de usuarios
    }
  );

const Broadcast = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const [allUsers, setAllUsers] = useState([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      targetMode: "all",
      userIds: [],
      tipo: "AVISO_GENERAL", // Hardcoded value
      titulo: "",
      mensaje: "",
      enlace: "",
    },
  });

  const targetMode = watch("targetMode");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Pedimos un número alto de usuarios para traer a todos.
        const { data } = await fetchAllUsers(1, 1000);
        setAllUsers(data);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error al Cargar Usuarios",
          message: error.message,
        });
      }
    };
    loadUsers();
  }, [showToast]);

  const onSubmit = async (data) => {
    const { targetMode, userIds, ...notificationData } = data;

    const confirmationMessage =
      targetMode === "all"
        ? "¿Estás seguro de que quieres enviar esta notificación a TODOS los usuarios?"
        : `¿Estás seguro de que quieres enviar esta notificación a ${userIds.length} usuario(s) seleccionado(s)?`;

    if (!window.confirm(confirmationMessage)) return;

    startLoading();
    try {
      let result;
      if (targetMode === "all") {
        result = await sendBroadcastNotification(notificationData);
      } else {
        result = await sendNotificationToUsers(userIds, notificationData);
      }

      showToast({
        type: "success",
        title: "Envío Exitoso",
        message: `Se encolaron ${result.notifications_created} notificaciones para ser enviadas.`,
      });
      reset(); // Limpia todo el formulario a sus valores por defecto
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
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Comunicación</h1>
        <p className="text-muted-foreground">
          Envía notificaciones masivas o a usuarios específicos.
        </p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificación</CardTitle>
          <CardDescription>
            Selecciona el destinatario y completa los detalles del mensaje.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              name="targetMode"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">Todos los usuarios</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific">Usuarios Específicos</Label>
                  </div>
                </RadioGroup>
              )}
            />

            {targetMode === "specific" && (
              <div className="space-y-1">
                <Label>Usuarios</Label>
                <Controller
                  name="userIds"
                  control={control}
                  render={({ field }) => (
                    <UserMultiSelectCombobox
                      users={allUsers}
                      selectedUserIds={field.value}
                      onUsersChange={field.onChange}
                    />
                  )}
                />
                {errors.userIds && (
                  <p className="text-sm text-red-500">
                    {errors.userIds.message}
                  </p>
                )}
              </div>
            )}

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
                placeholder="Ej: /dashboard"
              />
              {errors.enlace && (
                <p className="text-sm text-red-500">{errors.enlace.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Notificación"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Broadcast;
