import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchDashboardData } from "@/services/dashboardService"; // Importa la función agregadora
import { fetchUserBalance } from "@/services/paymentService";
import { renewAndValidateSeries } from "@/supabase";
import { useEventStore } from "@/stores/calendarStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { ConfirmCancelDialog } from "@/components";

import { EventDialog } from "@/components/EventDialog";
import { useNavigate } from "react-router-dom"; // Para el botón de agendar

// --- Importaciones de Componentes Shadcn UI ---
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarDays,
  RefreshCw,
  Wallet,
} from "lucide-react";

dayjs.extend(relativeTime);
dayjs.locale("es");

const Dashboard = () => {
  const { profile } = useAuthStore();
  const {
    showToast,
    loading,
    error,
    startLoading,
    stopLoading,
    setError,
    clearError,
  } = useUIStore();
  const { loadInitialEvents: reloadCalendarEvents } = useEventStore(); // Renombramos para mayor claridad de su función
  const navigate = useNavigate(); // Hook para navegar
  const startReagendamientoMode = useUIStore(
    (state) => state.startReagendamientoMode,
  );

  const storeNotifications = useNotificationStore(
    (state) => state.notifications,
  );
  const notificationsLoading = useNotificationStore((state) => state.isLoading);

  // --- Estados para ConfirmEventDialog ---
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null); // 'renewSeries' u otras
  const [selectedSerieForAction, setSelectedSerieForAction] = useState(null);

  // --- Estados para el EventDialog ---
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEventForDialog, setSelectedEventForDialog] = useState(null);

  // --- Estado para almacenar todos los datos del dashboard ---
  const [dashboardData, setDashboardData] = useState(null);

  // --- Estado para el balance del usuario ---
  const [userBalance, setUserBalance] = useState(null);

  // --- useEffect para cargar todos los datos al montar ---
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile) return; // No hacer nada si el perfil no está cargado

      clearError();
      startLoading();
      try {
        const data = await fetchDashboardData(profile.id, profile);
        setDashboardData(data);

        // Cargar balance del usuario
        const balance = await fetchUserBalance(profile.id);
        setUserBalance(balance);
      } catch (err) {
        console.error("Fallo al cargar datos del dashboard:", err);
        setError(err); // Setea el error en el store global
      } finally {
        stopLoading();
      }
    };

    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]); // Se ejecuta cuando el perfil del usuario está disponible

  // Función para iniciar el flujo de reagendamiento
  const handleReagendarClick = (reservaPenalizada) => {
    startReagendamientoMode(reservaPenalizada);
    navigate("/calendario_diario");
  };

  // --- 3. Reemplaza tu función handleRenewSeries por esta ---
  const handleRenewSeries = async () => {
    if (!profile || !selectedSerieForAction) return;

    startLoading("Renovando reservas fijas...");
    clearError();
    try {
      // Llama a la función orquestadora que valida y luego crea/extiende
      const result = await renewAndValidateSeries(
        selectedSerieForAction.recurrence_id,
        profile.id,
      );

      showToast({
        type: "success",
        title: "¡Serie Renovada con Éxito!",
        message: `Se crearon ${
          result.newly_created_count || 0
        } nuevas reservas para tu serie.`,
      });

      // --- Recargar Datos para Reflejar los Cambios ---
      // 1. Recargar los datos del dashboard. La serie renovada desaparecerá de esta lista.
      const data = await fetchDashboardData(profile.id, profile);
      setDashboardData(data);
      // 2. Recargar los eventos del calendario para que las nuevas reservas aparezcan allí.
      reloadCalendarEvents();
    } catch (err) {
      // El error ahora contendrá los detalles de los conflictos si los hubo
      setError(err);
      showToast({
        type: "error",
        title: "No se pudo Renovar la Serie",
        message: err.message, // Muestra el mensaje de error detallado del servicio
      });
    } finally {
      stopLoading();
      // Resetea los estados de acción al finalizar
      setSelectedSerieForAction(null);
      setActionToConfirm(null);
    }
  };

  // --- 3. Crea la función que abre el modal ---
  const openConfirmationModal = (serie, actionType) => {
    setSelectedSerieForAction(serie);
    setActionToConfirm(actionType);
    setIsConfirmDialogOpen(true);
  };

  // --- 4. Crea la función que genera el mensaje dinámico ---
  const getConfirmationMessage = () => {
    if (!selectedSerieForAction) return "";

    switch (actionToConfirm) {
      case "renewSeries":
        return {
          action: "renew",
          message: (
            <p className="text-sm">
              ¿Estás seguro de que quieres renovar la reserva FIJA de los{" "}
              <b className="font-semibold">{selectedSerieForAction.title}</b>{" "}
              por 4 meses más?
              <br />
              <span className="text-sm text-muted-foreground">
                Se crearán y validarán nuevas reservas para el próximo período.
              </span>
            </p>
          ),
        };
      default:
        return "";
    }
  };

  // --- 5. Crea la función orquestadora que el modal llamará ---
  const handleConfirmAction = () => {
    if (actionToConfirm === "renewSeries") {
      handleRenewSeries();
    }
    setIsConfirmDialogOpen(false); // Cierra el modal después de decidir qué hacer
  };

  // --- Función para abrir el diálogo de Eventos ---
  const handleViewDetails = (event) => {
    // Como los datos vienen de la tabla 'reservas', hay que formatearlos al formato que espera EventDialog y react-big-calendar
    const formattedEvent = {
      ...event,
      start_time: new Date(event.start_time),
      end_time: new Date(event.end_time),
      consultorio_id: event.consultorio_id,
      tipo_reserva: event.tipo_reserva,
      // 'titulo' ya debería venir de la base de datos
    };
    setSelectedEventForDialog(formattedEvent);
    setIsEventDialogOpen(true);
  };

  // --- Renderizado Condicional del Dashboard ---

  // Estado de Carga Inicial
  if (loading || !dashboardData) {
    // Muestra un esqueleto de la UI mientras carga para una mejor experiencia
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Estado de Error
  if (error) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-xl text-red-600">Ocurrió un Error</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <p className="text-muted-foreground mt-2">
          Por favor, intenta recargar la página.
        </p>
      </div>
    );
  }

  const {
    upcomingBookings,
    reschedulableBookings,
    pendingInvoices,
    currentPeriodPreview,
    expiringSeries,
  } = dashboardData;

  // --- Renderizado del Dashboard con Datos ---
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Sección 1: Saludo */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          Hola{" "}
          <span className="italic font-black">
            {profile.firstName} {profile.lastName}!
          </span>
        </h1>
        <p className="text-muted-foreground py-2">
          Aquí tienes un resumen de tu actividad y próximas reservas.
        </p>
      </div>

      {/* --- Tarjeta de Últimas Notificaciones --- */}
      {!notificationsLoading && storeNotifications.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-4 w-4 flex-shrink-0" />
                Últimas Notificaciones
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/notificaciones")}
                className="w-full sm:w-auto"
              >
                Ver Todas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Separator />
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-6">
            <div className="overflow-hidden space-y-2">
              {[...storeNotifications]
                .sort((a, b) => {
                  if (a.estado === "pendiente" && b.estado !== "pendiente")
                    return -1;
                  if (a.estado !== "pendiente" && b.estado === "pendiente")
                    return 1;
                  return (
                    new Date(b.notificaciones.created_at) -
                    new Date(a.notificaciones.created_at)
                  );
                })
                .slice(0, 5)
                .map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-2 px-2 sm:px-3 py-2 rounded-lg border border-slate-200 transition-colors hover:bg-muted/50 cursor-pointer overflow-hidden ${
                      notification.estado === "pendiente"
                        ? "bg-blue-50/50"
                        : "bg-slate-100"
                    }`}
                    onClick={() => {
                      if (notification.notificaciones.enlace) {
                        const url = notification.notificaciones.enlace;
                        if (
                          url.startsWith("http://") ||
                          url.startsWith("https://")
                        ) {
                          window.open(url, "_blank", "noopener,noreferrer");
                        } else {
                          navigate(url);
                        }
                      }
                    }}
                  >
                    <div className="mt-1.5 flex-shrink-0">
                      {notification.estado === "pendiente" ? (
                        <span className="block h-2 w-2 rounded-full bg-primary" />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-muted-foreground/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        className={`text-sm font-medium ${
                          notification.estado === "pendiente"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notification.notificaciones.titulo}
                      </p>
                      <p
                        className={`text-xs ${
                          notification.estado === "pendiente"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notification.notificaciones.mensaje}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {dayjs(
                          notification.notificaciones.created_at,
                        ).fromNow()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- Sección de Series por Vencer --- */}
      {expiringSeries && expiringSeries.length > 0 && (
        <Card className="border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <BellRing className="mr-2 h-5 w-5" />
              Renovaciones de horas FIJAS por vencerse
            </CardTitle>
            <CardDescription className="text-blue-700">
              Las siguientes series de reservas fijas vencerán en menos de 45
              días.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {expiringSeries.map((serie) => (
                <div
                  key={serie.recurrence_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-md shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold">{serie.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence el{" "}
                      {dayjs(serie.recurrence_end_date).format("DD/MM/YYYY")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => openConfirmationModal(serie, "renewSeries")}
                  >
                    Renovar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección 2: Próximas Reservas  */}
      <Card>
        <CardHeader>
          <CardTitle className="pb-2 text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Tus Próximas Reservas
          </CardTitle>
          <Separator />
          <CardDescription className="py-2">
            {upcomingBookings.length > 0
              ? "Estas son tus siguientes reservas activas."
              : "No tienes próximas reservas agendadas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length > 0 ? (
            <div className="border rounded-md">
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Día</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Consultorio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingBookings.map((reserva) => (
                      <TableRow key={reserva.id}>
                        <TableCell>
                          {dayjs(reserva.start_time)
                            .locale("es")
                            .format("dddd")
                            .replace(/^\w/, (c) => c.toUpperCase())}
                        </TableCell>
                        <TableCell>
                          {dayjs(reserva.start_time).format("DD/MM/YYYY")}
                        </TableCell>
                        <TableCell>
                          {dayjs(reserva.start_time).format("HH:mm")}
                        </TableCell>
                        <TableCell>
                          Consultorio {reserva.consultorio_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant={reserva.tipo_reserva.toLowerCase()}>
                            {reserva.tipo_reserva}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(reserva)}
                          >
                            Ver Detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4 p-4">
                {upcomingBookings.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-slate-900">
                          {dayjs(reserva.start_time)
                            .locale("es")
                            .format("dddd DD [de] MMMM")
                            .replace(/^\w/, (c) => c.toUpperCase())}
                        </h4>
                        <p className="text-slate-600 font-medium">
                          {dayjs(reserva.start_time).format("HH:mm")} hs
                        </p>
                      </div>
                      <Badge
                        variant={reserva.tipo_reserva.toLowerCase()}
                        className="shadow-sm"
                      >
                        {reserva.tipo_reserva}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-700 border-t border-slate-300 pt-2">
                      <p className="font-medium">
                        Consultorio {reserva.consultorio_id}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
                      onClick={() => handleViewDetails(reserva)}
                    >
                      Ver Detalle
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">
                ¡Aprovecha para asegurar tu próxima reserva!
              </p>
              <Button onClick={() => navigate("/calendario_semanal")}>
                Agendar Nueva Reserva
              </Button>
            </div>
          )}
        </CardContent>
        {/* --- CardFooter con los botones de acción --- */}
        {upcomingBookings.length > 0 && (
          <CardFooter className="flex justify-center gap-2 pt-4 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/reservas")}>
              Ver Todas Tus Reservas
            </Button>
            <Button onClick={() => navigate("/calendario_semanal")}>
              Agendar Nueva Reserva
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Sección 3: Acciones Pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Reagendamientos (Paso 7) */}
        <Card>
          <CardHeader>
            <CardTitle className="pb-2 text-xl flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Reservas disponibles para Reagendar
            </CardTitle>
            <Separator />
            <CardDescription className="py-2">
              Estas son tus reservas canceladas con penalización que aún puedes
              reagendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reschedulableBookings.length > 0 ? (
              <div className="border rounded-md">
                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reserva Original</TableHead>
                        <TableHead>Vence el</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reschedulableBookings.map((reserva) => (
                        <TableRow key={reserva.id}>
                          <TableCell>
                            <div className="font-medium">
                              {dayjs(reserva.start_time).format(
                                "ddd DD/MM/YY - HH:mm",
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Consultorio {reserva.consultorio_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-red-600">
                              {dayjs(reserva.permite_reagendar_hasta).format(
                                "DD/MM/YYYY",
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              (Faltan{" "}
                              {dayjs(reserva.permite_reagendar_hasta).diff(
                                dayjs(),
                                "day",
                              )}{" "}
                              días)
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleReagendarClick(reserva)}
                            >
                              Reagendar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden space-y-4 p-4">
                  {reschedulableBookings.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300"
                    >
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                          Reserva Original
                        </p>
                        <p className="font-bold text-slate-900">
                          {dayjs(reserva.start_time).format(
                            "ddd DD/MM/YY - HH:mm",
                          )}{" "}
                          hs
                        </p>
                        <p className="text-sm text-slate-600 font-medium">
                          Consultorio {reserva.consultorio_id}
                        </p>
                      </div>

                      <div className="bg-red-50 p-2 rounded border border-red-200 text-red-700 text-sm shadow-sm">
                        <span className="font-bold">Vence: </span>
                        {dayjs(reserva.permite_reagendar_hasta).format(
                          "DD/MM/YYYY",
                        )}
                        <span className="block text-xs mt-1 font-medium italic">
                          (Faltan{" "}
                          {dayjs(reserva.permite_reagendar_hasta).diff(
                            dayjs(),
                            "day",
                          )}{" "}
                          días)
                        </span>
                      </div>

                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        size="sm"
                        onClick={() => handleReagendarClick(reserva)}
                      >
                        Reagendar Ahora
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  No tienes reservas pendientes de reagendamiento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Facturación */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="pb-2 text-xl flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Resumen de Facturación
            </CardTitle>
            <Separator />
            <CardDescription className="py-2">
              Consulta tus facturas pendientes y tu consumo actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            {/* Saldo de Cuenta */}
            <div>
              <h4 className="text-md font-semibold mb-2">Saldo de Cuenta</h4>
              {userBalance ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-700 font-medium">
                      Saldo a favor:
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      $
                      {(userBalance.saldo_disponible > 0
                        ? userBalance.saldo_disponible
                        : 0
                      ).toLocaleString("es-UY")}
                    </span>
                  </div>
                  {userBalance.saldo_facturas_pendientes > 0 && (
                    <div className="flex justify-between items-baseline p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-orange-700 text-sm">
                        Pendiente de pago:
                      </span>
                      <span className="text-lg font-bold text-orange-600">
                        $
                        {userBalance.saldo_facturas_pendientes.toLocaleString(
                          "es-UY",
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-4">
                  Cargando saldo...
                </p>
              )}
            </div>

            <Separator />

            {/* Sección de Facturas Pendientes */}
            <div>
              <h4 className="text-md font-semibold mb-2">
                Facturas Pendientes
              </h4>
              {pendingInvoices.length > 0 ? (
                <div className="border rounded-md">
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {dayjs(invoice.periodo_inicio).format("DD/MM/YY")}{" "}
                              - {dayjs(invoice.periodo_fin).format("DD/MM/YY")}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              $
                              {invoice.monto_total
                                .toFixed(0)
                                .toLocaleString("es-UY")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile View */}
                  <div className="md:hidden space-y-3 p-3">
                    {pendingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex justify-between items-center p-4 bg-slate-200 text-slate-900 rounded-lg shadow-sm border border-slate-300"
                      >
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
                            Período
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {dayjs(invoice.periodo_inicio).format("DD/MM/YY")} -{" "}
                            {dayjs(invoice.periodo_fin).format("DD/MM/YY")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
                            Monto
                          </p>
                          <p className="text-xl font-black text-slate-900">
                            $
                            {invoice.monto_total
                              .toFixed(0)
                              .toLocaleString("es-UY")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-4">
                  No tienes facturas pendientes de pago.
                </p>
              )}
            </div>

            <Separator />

            {/* Sección de Período Actual */}
            <div>
              <h4 className="text-md font-semibold mb-2">
                Consumo del Período Actual
              </h4>
              {currentPeriodPreview && currentPeriodPreview.totals.final > 0 ? (
                <div className="flex justify-between items-baseline p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Total estimado:</span>
                  <span className="text-2xl font-bold">
                    ${currentPeriodPreview.totals.final.toLocaleString("es-UY")}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-4">
                  Sin consumo registrado en el período actual.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full" onClick={() => navigate("/facturas")}>
              Ir a Facturación Detallada
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate("/pagos")}
            >
              Ver Historial de Pagos
            </Button>
          </CardFooter>
        </Card>
      </div>
      {selectedSerieForAction && (
        <ConfirmCancelDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          message={getConfirmationMessage()}
          onConfirm={handleConfirmAction} // Llama al orquestador
        />
      )}

      {isEventDialogOpen && (
        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          selectedEvent={selectedEventForDialog}
        />
      )}
    </div>
  );
};

export default Dashboard;
