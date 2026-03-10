import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchUnresolvedAccessLogs,
  resolveAccessLog,
  AccessResolutionType,
  fetchInfractionStats,
} from "@/services/accessControlService";
import { createNotification } from "@/services/notificationService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CalendarSearch,
  CheckCircle2,
  Clock,
  User,
  XCircle,
  BarChart3,
  Bell,
  BellOff,
} from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const TIMEZONE = "America/Montevideo";

const AccessNotificationsPage = () => {
  const navigate = useNavigate();
  const { startLoading, stopLoading, showToast } = useUIStore();
  const [logs, setLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userStats, setUserStats] = useState([]);

  // Cargar datos
  const loadData = async () => {
    try {
      setLoadingData(true);
      const [logsData, statsData] = await Promise.all([
        fetchUnresolvedAccessLogs(),
        fetchInfractionStats(),
      ]);
      setLogs(logsData);
      setUserStats(statsData);
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudieron cargar los registros.",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler para notificar usuario
  const handleNotify = async (log) => {
    if (!log.user_id) return;

    try {
      startLoading("Enviando notificación...");

      // 1. Crear notificación
      await createNotification({
        usuario_id: log.user_id,
        tipo: "ACCESO_SIN_RESERVA",
        titulo: "⚠ Acceso registrado sin reserva",
        mensaje: `Hola ${log.usuario?.firstName}, nuestro sistema registró tu ingreso el día ${dayjs(
          log.access_time,
        )
          .tz(TIMEZONE)
          .format(
            "dddd, DD/MM [a las] HH:mm",
          )} pero no encontramos una reserva asociada. Por favor, recuerda agendar tus consultas para evitar inconvenientes.`,
        enlace: "/mis-accesos",
        metadata: { access_log_id: log.id },
      });

      // 2. Marcar como notificado
      await resolveAccessLog(log.id, AccessResolutionType.NOTIFIED);

      // 3. Actualizar UI y estadísticas
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      // Actualizar estadísticas del usuario
      setUserStats((prev) =>
        prev.map((u) =>
          u.id === log.user_id
            ? {
                ...u,
                stats: {
                  ...u.stats,
                  notified: u.stats.notified + 1,
                  pending: u.stats.pending - 1,
                },
              }
            : u,
        ),
      );

      showToast({
        type: "success",
        title: "Notificación enviada",
        message: `Se ha notificado a ${log.usuario?.firstName}.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo enviar la notificación.",
      });
    } finally {
      stopLoading();
    }
  };

  // Handler para omitir/ignorar (marcar como visto sin notificar)
  const handleIgnore = async (log) => {
    try {
      startLoading("Actualizando...");
      await resolveAccessLog(log.id, AccessResolutionType.IGNORED);
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      // Actualizar estadísticas del usuario
      setUserStats((prev) =>
        prev.map((u) =>
          u.id === log.user_id
            ? {
                ...u,
                stats: {
                  ...u.stats,
                  ignored: u.stats.ignored + 1,
                  pending: u.stats.pending - 1,
                },
              }
            : u,
        ),
      );
      showToast({
        type: "success",
        title: "Registro omitido",
        message: "Se marcó como visto sin enviar notificación.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      stopLoading();
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando infracciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle />
            Infracciones de Acceso
          </h1>
          <p className="text-muted-foreground">
            Gestione los accesos sin reserva. Decida si notificar al usuario o
            ignorar la infracción (ej. pruebas, excepciones).
          </p>
        </div>
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate("/admin/access-control")}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
      <Separator />

      {logs.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 bg-green-100 rounded-full dark:bg-green-900/20">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">¡Todo en orden!</h3>
              <p className="text-muted-foreground">
                No hay accesos sin reserva pendientes de revisión.
              </p>
            </div>
            <Button variant="outline" onClick={() => loadData()}>
              Actualizar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Pendientes de revisión ({logs.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {logs.map((log) => (
            <Card key={log.id} className="overflow-hidden flex flex-col">
              <div className="h-2 bg-orange-500 w-full" />
              <CardHeader className="pb-2 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={"capitalize "}>
                    {dayjs(log.access_time).tz(TIMEZONE).format("dddd")}
                  </Badge>
                  <Badge variant="outline">
                    {dayjs(log.access_time).tz(TIMEZONE).format("DD/MM/YYYY")}
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-none">
                    Sin Reserva
                  </Badge>
                </div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {log.usuario ? (
                      `${log.usuario.firstName} ${log.usuario.lastName}`
                    ) : (
                      <span className="italic text-muted-foreground">
                        {log.access_name} (No vinculado)
                      </span>
                    )}
                  </span>
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Hora de ingreso:{" "}
                  <span className="font-medium text-foreground">
                    {dayjs(log.access_time).tz(TIMEZONE).format("HH:mm")}
                  </span>
                </CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const dateParam = dayjs(log.access_time)
                      .tz(TIMEZONE)
                      .format("YYYY-MM-DD");
                    navigate(`/calendario_diario?date=${dateParam}`);
                  }}
                >
                  <CalendarSearch className="h-3 w-3 mr-1" />
                  Ver en calendario
                </Button>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t bg-muted/10">
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => handleNotify(log)}
                    disabled={!log.user_id}
                  >
                    <BellRing className="h-4 w-4 mr-2" />
                    Notificar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => handleIgnore(log)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Omitir
                  </Button>
                </div>
                {!log.user_id && (
                  <p className="text-xs text-red-500 mt-2 text-center">
                    * Vincule el usuario para notificar.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}

      {/* Estadísticas por usuario */}
      {userStats.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Historial de infracciones por usuario
            </h2>

            {/* Vista Desktop - Tabla */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Notificadas</TableHead>
                        <TableHead className="text-center">Omitidas</TableHead>
                        <TableHead className="text-center">Pendientes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStats.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {user.firstName} {user.lastName}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {user.stats.total}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="gap-1 bg-orange-50 text-orange-700 border-orange-200"
                            >
                              <Bell className="h-3 w-3" />
                              {user.stats.notified}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="gap-1 bg-slate-50 text-slate-600 border-slate-200"
                            >
                              <BellOff className="h-3 w-3" />
                              {user.stats.ignored}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {user.stats.pending > 0 ? (
                              <Badge
                                variant="outline"
                                className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                <Clock className="h-3 w-3" />
                                {user.stats.pending}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Vista Móvil - Cards */}
            <div className="md:hidden space-y-3">
              {userStats.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user.firstName} {user.lastName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Total: {user.stats.total} infracción
                      {user.stats.total !== 1 ? "es" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="gap-1 bg-orange-50 text-orange-700 border-orange-200"
                      >
                        <Bell className="h-3 w-3" />
                        {user.stats.notified} notificada
                        {user.stats.notified !== 1 ? "s" : ""}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="gap-1 bg-slate-50 text-slate-600 border-slate-200"
                      >
                        <BellOff className="h-3 w-3" />
                        {user.stats.ignored} omitida
                        {user.stats.ignored !== 1 ? "s" : ""}
                      </Badge>
                      {user.stats.pending > 0 && (
                        <Badge
                          variant="outline"
                          className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          <Clock className="h-3 w-3" />
                          {user.stats.pending} pendiente
                          {user.stats.pending !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccessNotificationsPage;
