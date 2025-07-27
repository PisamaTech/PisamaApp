import { useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@/components/ui";
import { Link } from "react-router-dom";
import "animate.css";
import logoPisama from "../assets/EspacioPimasaLogo-300.webp";
import { ChevronsDown, CircleCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export const ConfirmationPage = () => {
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    // Al llegar a esta página, cerramos cualquier sesión activa.
    // Esto fuerza al usuario a iniciar sesión con su email ya confirmado.
    signOut?.();
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-orange-300 from-10% via-neutral-400 via-45% to-teal-300 to-90%">
      <div className="w-full max-w-md p-4">
        <Card className="w-full animate__animated animate__jackInTheBox animate__slow">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-center text-primary ">
              {/* Logo de Pisama */}
              <div className="flex justify-center mt-2 mb-4">
                <img
                  src={logoPisama}
                  alt="Espacio Pisama Logo"
                  className="w-36 h-36 drop-shadow-md hover:drop-shadow-xl"
                />
              </div>
              Tu dirección de correo electrónico ha sido confirmada
              exitosamente.
              <CircleCheck
                size={48}
                color="#03a696"
                strokeWidth={1.5}
                className="mx-auto mt-1"
              />
            </CardTitle>
            <Separator />
            <CardDescription className="text-center font-semibold pt-1">
              Inicia sesión para continuar.
              <ChevronsDown size={48} absoluteStrokeWidth className="m-auto" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Link to="/">
                <Button>Iniciar Sesión</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
