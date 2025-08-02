import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { fetchAdminDashboardData } from "@/services/adminService";
import { StatCard } from "./StatCard";
import dayjs from "dayjs";
// --- Importaciones de Componentes Shadcn UI ---
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Users, Wallet, Library, Clock, Terminal } from "lucide-react";
import { DailyBookingsChart } from "./charts/DailyBookingsChart";
import { ConsultorioOccupancyChart } from "./charts/ConsultorioOccupancyChart";

const AdminDashboardTab = () => {
  const { loading, error, startLoading, stopLoading, setError, clearError } =
    useUIStore();
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      clearError();
      startLoading();
      try {
        const data = await fetchAdminDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error("Fallo al cargar datos del dashboard de admin:", err);
        setError(err);
      } finally {
        stopLoading();
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Se ejecuta solo una vez al montar el componente

  // --- Renderizado Condicional ---

  // Estado de Carga Inicial
  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        {/* Skeleton para KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-1/2" />
            </CardContent>
          </Card>
        </div>
        {/* Skeleton para Gráficos y Listas */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Estado de Error
  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error al Cargar el Dashboard</AlertTitle>
        <AlertDescription>
          No se pudieron obtener los datos del panel de administración. Por
          favor, intenta recargar la página.
          <p className="text-xs mt-2">{error.message}</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Si no está cargando y no hay datos, algo raro pasó
  if (!dashboardData) {
    return <p>No se encontraron datos para el dashboard.</p>;
  }

  // --- Renderizado del Dashboard con Datos ---
  // (Llenaremos esto en los siguientes pasos)
  return (
    <div className="space-y-6">
      {/* Fila 1: KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Ingresos */}
        <StatCard
          isLoading={loading || !dashboardData}
          Icon={Wallet}
          title="Ingresos (Mes Actual)"
          value={`$${
            dashboardData?.revenueSummary?.currentMonthRevenue || "0"
          }`}
          footer={`vs. $${
            dashboardData?.revenueSummary?.lastMonthRevenue || "0"
          } el mes anterior`}
        />

        {/* Card 2: Cobranza Pendiente */}
        <StatCard
          isLoading={loading || !dashboardData}
          Icon={Library}
          title="Cobranza Pendiente"
          value={`$${dashboardData?.pendingBillingSummary?.totalAmount || "0"}`}
          footer={`${
            dashboardData?.pendingBillingSummary?.count || 0
          } facturas pendientes`}
        />

        {/* Card 3: Ocupación Hoy */}
        <StatCard
          isLoading={loading || !dashboardData}
          Icon={Clock}
          title="Ocupación Hoy"
          value={`${dashboardData?.todaysOccupancy?.porcentajeOcupacion || 0}%`}
          footer={`${dashboardData?.todaysOccupancy?.horasReservadas || 0} de ${
            dashboardData?.todaysOccupancy?.horasDisponibles || 0
          } horas reservadas`}
        />

        {/* Card 4: Nuevos Usuarios */}
        <StatCard
          isLoading={loading || !dashboardData}
          Icon={Users}
          title="Nuevos Usuarios (30d)"
          value={`+${dashboardData?.newUsersCount || 0}`}
          footer="Nuevos usuarios en los últimos 30 días"
        />
      </div>

      {/* Fila 2: Gráficos (Paso 6) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Horas Reservadas (Últimos 7 Días)</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Renderiza el gráfico de barras */}
            <DailyBookingsChart data={dashboardData.dailyBookingStats} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ocupación por Consultorio (Mes Actual)</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Renderiza el gráfico de torta */}
            <ConsultorioOccupancyChart
              data={dashboardData.occupancyByConsultorio}
            />
          </CardContent>
        </Card>
      </div>

      {/* Fila 3: Listas de Actividad (Paso 7) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Últimas Reservas Creadas */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente: Nuevas Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentBookings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Consultorio</TableHead>
                    <TableHead className="text-right">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {`${booking.usuario_firstname || ""} ${
                          booking.usuario_lastname || ""
                        }`.trim()}
                      </TableCell>
                      <TableCell>{booking.consultorio_nombre}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {dayjs(booking.start_time).format("DD/MM/YY [-] HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">
                No hay nuevas reservas recientes.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Últimas Cancelaciones y Penalizaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente: Cancelaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentCancellations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha Original</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentCancellations.map((cancellation) => (
                    <TableRow key={cancellation.id}>
                      <TableCell className="font-medium">
                        {`${cancellation.usuario_firstname || ""} ${
                          cancellation.usuario_lastname || ""
                        }`.trim()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(cancellation.start_time).format(
                          "DD/MM/YY [-] HH:mm"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={cancellation.estado}
                          className="capitalize"
                        >
                          {cancellation.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">
                No hay cancelaciones recientes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardTab;
