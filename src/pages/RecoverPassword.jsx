import { useState } from "react";
import { supabase } from "../supabase";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import "animate.css";
import resetPasswordImage from "../assets/ResetPasswordLogo2.webp";

// Schema específico para recuperación (solo email)
const recoverPasswordSchema = z.object({
  email: z.string().email("Por favor, introduce un email válido"),
});

export const RecoverPassword = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recoverPasswordSchema),
  });

  const handleRecover = async (data) => {
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `https://reservas.pisama.uy/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña."
        );
      }
    } catch (err) {
      setError("Ocurrió un error inesperado. Por favor, inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-orange-300 from-10% via-neutral-400 via-45% to-teal-300 to-90%">
      <div className="w-full max-w-md p-4">
        <Card className="w-full animate__animated animate__jackInTheBox animate__slow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-xl">
              Recuperar Contraseña
            </CardTitle>
            <CardDescription className="text-center font-semibold">
              <div className="flex justify-center mt-2 mb-3">
                <img
                  src={resetPasswordImage}
                  alt="Espacio Pisama Logo"
                  className="w-64 h-64 drop-shadow-md hover:drop-shadow-xl"
                />
              </div>
              Introduce tu correo electrónico y te enviaremos un enlace para que
              puedas restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate__animated animate__fadeIn animate__slow">
              <form onSubmit={handleSubmit(handleRecover)}>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      className={errors.email ? "border-red-500" : ""}
                      autoComplete="username"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Mensaje de éxito */}
                  {message && (
                    <div className="p-3 rounded-md bg-green-50 border border-green-200">
                      <p className="text-sm text-green-700">{message}</p>
                    </div>
                  )}

                  {/* Mensaje de error */}
                  {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading
                      ? "Enviando..."
                      : "Enviar enlace de recuperación"}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
