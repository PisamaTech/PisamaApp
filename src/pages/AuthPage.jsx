import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Label, Input, Button, Checkbox } from "../components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useForm } from "react-hook-form"; // Importamos useForm y SubmitHandler
import { zodResolver } from "@hookform/resolvers/zod"; // Importamos el resolver de Zod
import {
  loginSchema,
  registerSchema,
} from "../validations/validationSchemas.js"; // Importamos los esquemas de validación
// import { handleSignIn, handleSignUp } from "../helpers/authFunctions";

import logoPisama from "../assets/EspacioPimasaLogo-300.webp";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../stores/authStore.js";

export const AuthPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { profile, signOut, loading, signIn, signUp } = useAuthStore();
  // Configuración de React Hook Form para el inicio de sesión
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Configuración de React Hook Form para el registro
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  // Manejador de envío del formulario de inicio de sesión
  const onLoginSubmit = async ({ email, password }) => {
    console.log(email, password);
    await signIn(email, password);
  };

  // Manejador de envío del formulario de registro
  const onRegisterSubmit = async ({
    email,
    password,
    firstName,
    lastName,
    phone,
  }) => {
    console.log("solicitado");
    await signUp(email, password, firstName, lastName, phone);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-orange-300 from-10% via-neutral-400 via-45% to-teal-300 to-90%">
      <div className="w-full max-w-md p-4">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-primary">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-center font-semibold">
              {/* Logo de Pisama */}
              <div className="flex justify-center mt-2 mb-3">
                <img
                  src={logoPisama}
                  alt="Espacio Pisama Logo"
                  className="w-36 h-36 drop-shadow-md hover:drop-shadow-xl"
                />
              </div>
              Inicia sesión o crea una cuenta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Contraseña"
                          className={
                            loginErrors.password ? "border-red-500" : ""
                          } // Borde rojo si hay error
                          autoComplete="current-password"
                          {...loginRegister("password")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff size={16} strokeWidth={1.8} />
                          ) : (
                            <Eye size={16} strokeWidth={1.8} />
                          )}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className="text-sm text-red-500">
                          {loginErrors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between text-sm text-foreground font-semibold">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="rememberUser" />
                        <label
                          htmlFor="rememberUser"
                          className="text-sm font-medium leading-none"
                        >
                          Recordarme
                        </label>
                      </div>
                      <p>Forgot password?</p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full mt-3"
                      disabled={loading}
                    >
                      {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleRegisterSubmit(onRegisterSubmit)}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {" "}
                      {/* Contenedor grid para Nombre y Apellido */}
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Nombre</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Juan"
                          className={
                            registerErrors.firstName ? "border-red-500" : ""
                          }
                          {...registerRegister("firstName")}
                        />
                        {registerErrors.firstName && (
                          <p className="text-sm text-red-500">
                            {registerErrors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Apellido</Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Pérez"
                          className={
                            registerErrors.lastName ? "border-red-500" : ""
                          }
                          {...registerRegister("lastName")}
                        />
                        {registerErrors.lastName && (
                          <p className="text-sm text-red-500">
                            {registerErrors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>{" "}
                    {/* Cierre del contenedor grid */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="095547845"
                        className={registerErrors.phone ? "border-red-500" : ""}
                        {...registerRegister("phone")}
                      />
                      {registerErrors.phone && (
                        <p className="text-sm text-red-500">
                          {registerErrors.phone.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="ejemplo@correo.com"
                        className={registerErrors.email ? "border-red-500" : ""}
                        autoComplete="username"
                        {...registerRegister("email")}
                      />
                      {registerErrors.email && (
                        <p className="text-sm text-red-500">
                          {registerErrors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Contraseña"
                          className={
                            registerErrors.password ? "border-red-500" : ""
                          }
                          autoComplete="new-password"
                          {...registerRegister("password")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff size={16} strokeWidth={1.8} />
                          ) : (
                            <Eye size={16} strokeWidth={1.8} />
                          )}
                        </button>
                      </div>
                      {registerErrors.password && (
                        <p className="text-sm text-red-500">
                          {registerErrors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirmar contraseña
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirmar contraseña"
                          className={
                            registerErrors.confirmPassword
                              ? "border-red-500"
                              : ""
                          }
                          autoComplete="new-password"
                          {...registerRegister("confirmPassword")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} strokeWidth={1.8} />
                          ) : (
                            <Eye size={16} strokeWidth={1.8} />
                          )}
                        </button>
                      </div>
                      {registerErrors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {registerErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Registrando..." : "Registrarse"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-1">
              <div className="relative flex justify-center text-xs uppercase">
                {/* Esta línea es para confirmar si se registró el usuario */}
                {profile && <p>{profile.firstName}</p>}
                {/* Después de probarla hay que borrarla */}
                <span className="bg-background px-2 text-muted-foreground"></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
