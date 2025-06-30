import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  updateUserProfile,
  updateUserPassword,
} from "@/supabase/profileService";
import { profileSchema, passwordSchema } from "@/validations/validationSchemas";

// --- Importaciones de Componentes Shadcn UI ---
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import { Separator } from "@/components/ui/separator";

export const Perfil = () => {
  const { profile, updateProfileData } = useAuthStore();
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  // --- Formulario para Datos Personales ---
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
    },
  });

  // --- Formulario para Contraseña ---
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data) => {
    startLoading();
    try {
      const profileDataToUpdate = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      };
      const updatedProfile = await updateUserProfile(
        profile.id,
        profileDataToUpdate
      );
      updateProfileData(updatedProfile); // Actualiza el store global
      showToast({
        type: "success",
        title: "Éxito",
        message: "Tu perfil ha sido actualizado.",
      });
    } catch (error) {
      console.log(error);
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo actualizar el perfil.",
      });
    } finally {
      stopLoading();
    }
  };

  const onPasswordSubmit = async (data) => {
    startLoading();
    try {
      await updateUserPassword(data.newPassword);
      showToast({
        type: "success",
        title: "Éxito",
        message: "Tu contraseña ha sido cambiada.",
      });
      resetPasswordForm(); // Limpia los campos de contraseña
    } catch (error) {
      console.log(error);
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo cambiar la contraseña.",
      });
    } finally {
      stopLoading();
    }
  };

  if (!profile) return <p>Cargando perfil...</p>;

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuración de la Cuenta</h1>
        <p className="text-muted-foreground">
          Gestiona la información de tu perfil y tu cuenta.
        </p>
      </div>
      <Separator />
      {/* --- Card de Datos Personales --- */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Personales</CardTitle>
          <CardDescription>
            Actualiza tu nombre, apellido y teléfono.
          </CardDescription>
        </CardHeader>
        <Separator className="mt-[-4px] mb-4" />
        <CardContent>
          <form
            onSubmit={handleSubmitProfile(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" {...registerProfile("firstName")} />
                {profileErrors.firstName && (
                  <p className="text-sm text-red-500">
                    {profileErrors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" {...registerProfile("lastName")} />
                {profileErrors.lastName && (
                  <p className="text-sm text-red-500">
                    {profileErrors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...registerProfile("phone")} />
              {profileErrors.phone && (
                <p className="text-sm text-red-500">
                  {profileErrors.phone.message}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* --- Card de Configuración de Cuenta --- */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Cuenta</CardTitle>
        </CardHeader>
        <Separator className="mt-[-4px] mb-4" />
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={profile.email || "No disponible"} disabled />
          </div>
          <div className="space-y-1">
            <Label>Modalidad de Pago</Label>
            <Input
              value={profile.modalidad_pago || "No definida"}
              disabled
              className="capitalize"
            />
          </div>
        </CardContent>
      </Card>

      {/* --- Card de Cambio de Contraseña --- */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>
            Asegúrate de usar una contraseña segura.
          </CardDescription>
        </CardHeader>
        <Separator className="mt-[-4px] mb-4" />
        <CardContent>
          <form
            onSubmit={handleSubmitPassword(onPasswordSubmit)}
            className="space-y-4"
          >
            {/* --- CAMPO DE USUARIO OCULTO (SOLUCIÓN) --- */}
            {/* Añadimos un campo para el email/username para que los gestores de contraseñas funcionen correctamente. */}
            {/* Lo hacemos "sr-only" (solo para lectores de pantalla) u oculto con CSS. */}
            <div className="sr-only">
              <Label htmlFor="username">Email</Label>
              <Input
                id="username"
                autoComplete="username"
                value={profile.email || ""}
                readOnly // Usamos readOnly en lugar de disabled para que el valor se envíe con el formulario si fuera necesario
              />
            </div>
            {/* --- FIN DEL CAMPO OCULTO --- */}
            <div className="space-y-1">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...registerPassword("newPassword")}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-500">
                  {passwordErrors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">
                Confirmar Nueva Contraseña
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...registerPassword("confirmPassword")}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {passwordErrors.confirmPassword.message}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
