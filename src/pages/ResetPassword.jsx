import { updateUserPassword } from "../supabase";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from "@/components/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordSchema } from "@/validations/validationSchemas";
import { useUIStore } from "@/stores/uiStore";

export const ResetPassword = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

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
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo cambiar la contraseña.",
      });
    } finally {
      stopLoading();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-5">Restablecer Contraseña</h2>
      {/* --- Card de Cambio de Contraseña --- */}
      <Card className="max-w-md w-full">
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
