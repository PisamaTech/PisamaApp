import { useState } from "react";
import { supabase } from "../supabase"; // Asegúrate de tener esta configuración
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { TabsContent } from "@radix-ui/react-tabs";
import "animate.css";
import resetPasswordImage from "../assets/ResetPasswordLogo2.webp";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  registerSchema,
} from "../validations/validationSchemas.js"; // Importamos los esquemas de validación
import { useAuthStore } from "@/stores/authStore";

export const RecoverPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { loading } = useAuthStore();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const handleRecover = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Revisa tu email para restablecer tu contraseña.");
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
              <form onSubmit={() => {}}>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      className={loginErrors.email ? "border-red-500" : ""} // Borde rojo si hay error
                      autoComplete="username"
                      {...loginRegister("email")}
                    />
                    {loginErrors.email && (
                      <p className="text-sm text-red-500">
                        {loginErrors.email.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? "Restableciendo contraseña..."
                      : "Restablecer contraseña"}
                  </Button>
                </div>
                <div className="h-2.5" />
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
