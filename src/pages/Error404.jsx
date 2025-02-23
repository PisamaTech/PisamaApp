import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import logoPisama from "../assets/EspacioPimasaLogo-300.webp";
import { CircleAlert } from "lucide-react";

export const Error404 = () => {
  const params = new URLSearchParams(window.location.hash.slice());
  const error = params.get("error_description");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-orange-300 from-10% via-neutral-400 via-45% to-teal-300 to-90%">
      <div className="w-full max-w-md p-4">
        <Card className="w-full animate__animated animate__jackInTheBox animate__slow">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-center text-primary">
              {/* Logo de Pisama */}
              <div className="flex justify-center mt-2 mb-4">
                <img
                  src={logoPisama}
                  alt="Espacio Pisama Logo"
                  className="w-36 h-36 drop-shadow-md hover:drop-shadow-xl"
                />
              </div>
              <div className="flex justify-center items-center mt-2 mb-4">
                <CircleAlert color="hsl(0 84.2% 60.2%" />

                <p className="text-center ml-2 text-destructive">
                  {error ? "Error" : "Página no encontrada"}
                </p>
              </div>
            </CardTitle>
            <Separator />
            <CardDescription className="text-center font-semibold ">
              {error && <p>{error}</p>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mt-1">
              <Link to="/">
                <Button>Ir al Inicio</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
