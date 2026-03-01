import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { fetchPerformanceData } from "@/services/adminService";
import { MonthlyHoursChart } from "@/components/admin/charts/MonthlyHoursChart";
import { MonthlyInvoiceChart } from "@/components/admin/charts/MonthlyInvoiceChart";
import { MonthlyPaymentsChart } from "@/components/admin/charts/MonthlyPaymentsChart";
import { ReservationTypeTrendChart } from "@/components/admin/charts/ReservationTypeTrendChart";
import { PeakHoursHeatmap } from "@/components/admin/charts/PeakHoursHeatmap";
import { TopUsersTable } from "@/components/admin/stats/TopUsersTable";
import { MonthlyHoursTable } from "@/components/admin/stats/MonthlyHoursTable";
import { StatCard } from "@/components/admin/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Banknote,
  UserMinus,
  CalendarClock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";

const PerformancePage = () => {
  const { loading, startLoading, stopLoading } = useUIStore();
  const [year, setYear] = useState(dayjs().year());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      startLoading();
      setError(null);
      try {
        const result = await fetchPerformanceData(year);
        setData(result);
      } catch (err) {
        console.error("Error cargando datos de rendimiento:", err);
        setError(err.message);
      } finally {
        stopLoading();
      }
    };

    loadData();
  }, [year, startLoading, stopLoading]);

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudieron cargar los datos de rendimiento. Asegúrate de haber
            ejecutado las funciones RPC en Supabase.
            <br />
            Detalle: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="p-8 text-center">Cargando métricas...</div>;
  }

  if (!data) return null;

  // Calcular métricas basadas en facturación mensual (excluyendo dueños)
  const calcularMetricasFacturacion = () => {
    if (!data.monthlyInvoices) return { ticketPromedio: 0, ingresosReales: 0 };
    const totalMonto = data.monthlyInvoices.reduce(
      (sum, m) => sum + (m.monto_total || 0),
      0,
    );
    const totalReservas = data.monthlyInvoices.reduce(
      (sum, m) => sum + (m.cantidad_reservas || 0),
      0,
    );
    return {
      ticketPromedio:
        totalReservas > 0 ? Math.round(totalMonto / totalReservas) : 0,
      ingresosReales: totalMonto,
    };
  };
  const { ticketPromedio, ingresosReales } = calcularMetricasFacturacion();

  const calcularTotalPagos = () => {
    if (!data.monthlyPayments) return 0;
    return data.monthlyPayments.reduce(
      (sum, m) => sum + (m.monto_total || 0),
      0,
    );
  };
  const totalPagos = calcularTotalPagos();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header y Selector de Año */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rendimiento</h1>
          <p className="text-muted-foreground">
            Análisis detallado de métricas de negocio y comportamiento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Año:</span>
          <Select
            value={year.toString()}
            onValueChange={(val) => setYear(parseInt(val))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* KPIs Principales */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ticket Promedio"
          value={`$${ticketPromedio.toLocaleString()}`}
          Icon={Banknote}
          footer="Ingreso promedio por reserva"
        />
        <StatCard
          title="Tasa de Cancelación"
          value={`${data.kpiStats.tasa_cancelacion}%`}
          Icon={UserMinus}
          footer="Reservas canceladas sobre total"
        />
        <StatCard
          title="Tasa de Reagendamiento"
          value={`${data.kpiStats.tasa_reagendamiento}%`}
          Icon={CalendarClock}
          footer="Reservas reagendadas"
        />
        <StatCard
          title="Ingresos Totales"
          value={`$${ingresosReales.toLocaleString()}`}
          Icon={TrendingUp}
          footer={`Acumulado en ${year} (sin dueños)`}
        />
      </div>

      {/* Gráficos Principales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Horas Mensuales */}
        <Card>
          <CardHeader>
            <CardTitle>Horas Mensuales</CardTitle>
            <CardDescription>
              Comparativa de horas activas, utilizadas, penalizadas y
              reagendadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyHoursChart data={data.monthlyHours} />
            <MonthlyHoursTable data={data.monthlyHours} />
          </CardContent>
        </Card>

        {/* Columna Derecha: Tipos de Reserva y Top Clientes */}
        <div className="flex flex-col gap-6">
          {/* Tipos de Reserva */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Reserva</CardTitle>
              <CardDescription>
                Distribución mensual de reservas eventuales vs. fijas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReservationTypeTrendChart data={data.reservationTypes} />
            </CardContent>
          </Card>

          {/* Top Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clientes</CardTitle>
              <CardDescription>
                Top 10 usuarios por facturación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopUsersTable data={data.topUsers} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Facturación y Pagos Mensuales */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Facturación Mensual</CardTitle>
                <CardDescription>
                  Montos totales facturados por mes durante {year}.
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${ingresosReales.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total {year}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyInvoiceChart data={data.monthlyInvoices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Pagos Recibidos</CardTitle>
                <CardDescription>
                  Transferencias bancarias recibidas por mes durante {year}.
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${totalPagos.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total {year}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyPaymentsChart data={data.monthlyPayments} />
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Calor */}
      <div className="grid gap-6 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor de Horarios</CardTitle>
            <CardDescription>
              Intensidad de reservas por día y hora (Peak Hours).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PeakHoursHeatmap data={data.heatmap} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformancePage;
