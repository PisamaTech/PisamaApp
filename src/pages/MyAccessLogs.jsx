import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { fetchUserAccessLogs } from "@/services/accessControlService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.locale("es");

// Helper para formatear fecha con día capitalizado
const formatAccessDate = (date) => {
  const formatted = dayjs.utc(date).format("dddd - DD/MM/YYYY");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const MyAccessLogsPage = () => {
  const { user } = useAuthStore();
  const { startLoading, stopLoading, showToast } = useUIStore();
  const [logs, setLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      if (!user?.id) return;

      try {
        setLoadingData(true);
        const data = await fetchUserAccessLogs(user.id);
        setLogs(data);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: "No se pudo cargar el historial de accesos.",
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadLogs();
  }, [user?.id, showToast]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "valido":
        return (
          <Badge
            variant="success"
            className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 border-none"
          >
            <CheckCircle2 className="h-3 w-3" /> Correcto
          </Badge>
        );
      case "sin_reserva":
        return (
          <Badge
            variant="warning"
            className="gap-1 bg-orange-100 text-orange-800 hover:bg-orange-100 border-none"
          >
            <AlertTriangle className="h-3 w-3" /> Sin Reserva
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History className="h-5 w-5" />
          Mis Accesos
        </h1>
        <p className="text-muted-foreground">
          Historial de tus ingresos registrados al espacio.
        </p>
      </div>

      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Sobre este registro
        </p>
        <p>
          Este historial muestra los momentos en que utilizaste tu código de
          acceso para ingresar a Espacio Pisama. Si ves un registro marcado como
          "Sin Reserva", significa que ingresaste en un horario donde no tenías
          una reserva confirmada en el sistema. Puedes ingresar hasta 50 minutos
          antes del inicio de tu reserva sin que se considere "Sin Reserva".
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registro de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay registros de acceso recientes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora de Ingreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Reserva Asociada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatAccessDate(log.access_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {dayjs.utc(log.access_time).format("HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {log.reservation ? (
                          <span>
                            {dayjs(log.reservation.start_time).format("HH:mm")}{" "}
                            - {log.reservation.consultorio_nombre}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAccessLogsPage;
