import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/notificationService";

// --- Importaciones de Componentes Shadcn UI ---
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const NotificationPreferences = () => {
  const { profile } = useAuthStore();
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const { control, handleSubmit, reset } = useForm();

  // Cargar las preferencias actuales del usuario al montar
  useEffect(() => {
    const loadPreferences = async () => {
      if (!profile?.id) return;
      startLoading();
      try {
        const prefs = await fetchNotificationPreferences(profile.id);
        if (prefs) {
          reset(prefs); // Llena el formulario con los datos de la BD
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: `No se pudieron cargar tus preferencias: ${error}`,
        });
      } finally {
        stopLoading();
      }
    };
    loadPreferences();
  }, [profile, reset, startLoading, stopLoading, showToast]);

  // Función que se ejecuta al guardar los cambios
  const onSubmit = async (data) => {
    startLoading();
    try {
      // Filtramos el 'usuario_id' para no enviarlo en el update
      const { usuario_id, ...prefsToUpdate } = data;
      await updateNotificationPreferences(profile.id, prefsToUpdate);
      showToast({
        type: "success",
        title: "Guardado",
        message: "Tus preferencias de notificación han sido actualizadas.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: `No se pudieron guardar los cambios: ${error}`,
      });
    } finally {
      stopLoading();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias de Notificación</CardTitle>
        <CardDescription>
          Elige cómo y cuándo quieres recibir notificaciones. Las alertas dentro
          de la aplicación no se pueden desactivar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Fila de Títulos de Canal */}
          <div className="flex">
            <div className="w-2/3"></div>
            <div className="w-1/3 flex justify-around">
              <Label className="font-semibold">WhatsApp</Label>
              <Label className="font-semibold">Email</Label>
            </div>
          </div>

          {/* Fila de Preferencia: Factura Nueva */}
          <PreferenceRow
            control={control}
            name="factura_nueva"
            label="Cuando se genera una nueva factura"
          />

          {/* Fila de Preferencia: Factura Pagada */}
          <PreferenceRow
            control={control}
            name="factura_pagada"
            label="Cuando se confirma el pago de una factura"
          />

          {/* Fila de Preferencia: Recordatorio de Pago */}
          <PreferenceRow
            control={control}
            name="recordatorio_pago"
            label="Recordatorio de facturas pendientes"
          />

          {/* Fila de Preferencia: Recordatorio Semanal */}
          <PreferenceRow
            control={control}
            name="recordatorio_semanal"
            label="Resumen semanal de tus reservas"
          />

          {/* Fila de Preferencia: Último día reagendamiento */}
          <PreferenceRow
            control={control}
            name="ultimo_dia_reagendamiento"
            label="Aviso de último día para reagendar"
          />

          {/* Puedes añadir más filas aquí para otros tipos de notificaciones */}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Preferencias"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Componente auxiliar para no repetir código
const PreferenceRow = ({ control, name, label }) => (
  <div className="flex items-center">
    <Label className="w-2/3">{label}</Label>
    <div className="w-1/3 flex justify-around">
      <Controller
        control={control}
        name={`${name}_whatsapp`}
        render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name={`${name}_email`}
        render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
    </div>
  </div>
);

export default NotificationPreferences;
