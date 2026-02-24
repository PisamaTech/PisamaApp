import { useState, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchAdminDashboardData,
  getWeeklyBookingStats,
} from "@/services/adminService";
import { StatCard } from "@/components/admin/StatCard";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");
// --- Importaciones de Componentes Shadcn UI ---
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
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
import {
  Users,
  Wallet,
  Library,
  Clock,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DailyBookingsChart } from "@/components/admin/charts/DailyBookingsChart";
import { ConsultorioOccupancyChart } from "@/components/admin/charts/ConsultorioOccupancyChart";

const AdminDashboardPage = () => {
  const { loading, error, startLoading, stopLoading, setError, clearError } =
    useUIStore();
  const [dashboardData, setDashboardData] = useState(null);

  // Estados para navegación de semanas
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

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

  // Efecto para cargar datos de la semana seleccionada
  const loadWeeklyData = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const result = await getWeeklyBookingStats(weekOffset);
      setWeeklyData(result);
    } catch (err) {
      console.error("Error al cargar datos semanales:", err);
    } finally {
      setWeeklyLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  // Handlers de navegación
  const goToPreviousWeek = () => setWeekOffset((prev) => prev - 1);
  const goToNextWeek = () => setWeekOffset((prev) => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  // Formatear rango de fechas de la semana
  const getWeekRangeLabel = () => {
    if (!weeklyData) return "Cargando...";
    const start = dayjs(weeklyData.weekStart);
    const end = dayjs(weeklyData.weekEnd);

    // Si es la misma semana y mismo mes
    if (start.month() === end.month()) {
      return `${start.format("D")} - ${end.format("D [de] MMMM")}`;
    }
    // Si es diferente mes
    return `${start.format("D [de] MMM")} - ${end.format("D [de] MMM")}`;
  };

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
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Una vista general de las métricas clave del negocio.
        </p>
      </div>
      <Separator />
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
            <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>Horas Reservadas</span>
                {weekOffset !== 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToCurrentWeek}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Ir a esta semana
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToPreviousWeek}
                  disabled={weeklyLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[160px] text-center text-sm font-medium capitalize">
                  {getWeekRangeLabel()}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToNextWeek}
                  disabled={weeklyLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="ml-2 text-2xl font-bold text-green-600">
                  {weeklyData?.data?.reduce(
                    (total, day) => total + day.horas_reservadas,
                    0
                  ) || 0}
                  h
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : weeklyData?.data ? (
              <DailyBookingsChart data={weeklyData.data} />
            ) : (
              <Skeleton className="h-[350px] w-full" />
            )}
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
                    <TableHead>Día</TableHead>
                    <TableHead className="text-right">Fecha Reserva</TableHead>
                    <TableHead className="text-right">Fecha Creación</TableHead>
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
                      <TableCell className="text-sm capitalize">
                        {dayjs(booking.start_time)
                          .format("ddd")
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {dayjs(booking.start_time).format("DD/MM/YY [-] HH:mm")}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {dayjs(booking.created_at).format("DD/MM/YY [-] HH:mm")}
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
                    <TableHead>Día</TableHead>
                    <TableHead>Fecha Original</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Cancelación</TableHead>
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
                      <TableCell className="text-sm capitalize">
                        {dayjs(cancellation.start_time)
                          .format("ddd")
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(cancellation.start_time).format(
                          "DD/MM/YY [-] HH:mm"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cancellation.estado}
                          className="capitalize"
                        >
                          {cancellation.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(cancellation.fecha_cancelacion).format(
                          "DD/MM/YY [-] HH:mm"
                        )}
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

export default AdminDashboardPage;
