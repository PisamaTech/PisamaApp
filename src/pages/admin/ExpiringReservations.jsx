import { useState, useEffect, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import { fetchExpiringFixedSeries } from "@/services/adminService";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui";
import { StatCard } from "@/components/admin/StatCard";
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const ExpiringReservationsPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const [seriesData, setSeriesData] = useState([]);

  // Estados de ordenamiento
  const [sortField, setSortField] = useState("dias_restantes");
  const [sortDirection, setSortDirection] = useState("asc");

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortField) return seriesData;

    return [...seriesData].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "usuario":
          aValue = a.usuario.toLowerCase();
          bValue = b.usuario.toLowerCase();
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        case "dias_restantes":
          aValue = a.dias_restantes;
          bValue = b.dias_restantes;
          break;
        case "recurrence_end_date":
          aValue = new Date(a.recurrence_end_date).getTime();
          bValue = new Date(b.recurrence_end_date).getTime();
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [seriesData, sortField, sortDirection]);

  // Calcular resúmenes
  const stats = useMemo(() => {
    const urgent = seriesData.filter((s) => s.dias_restantes < 15).length;
    const moderate = seriesData.filter(
      (s) => s.dias_restantes >= 15 && s.dias_restantes < 30
    ).length;
    const total = seriesData.length;
    return { total, urgent, moderate };
  }, [seriesData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const getUrgencyVariant = (dias) => {
    if (dias < 15) return "destructive";
    if (dias < 30) return "warning";
    return "secondary";
  };

  useEffect(() => {
    const loadData = async () => {
      startLoading();
      try {
        const data = await fetchExpiringFixedSeries(60);
        setSeriesData(data);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: `No se pudieron cargar las series por vencer: ${
            error.message || "Error Desconocido"
          }.`,
        });
      } finally {
        stopLoading();
      }
    };
    loadData();
  }, [startLoading, stopLoading, showToast]);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Reservas Fijas por Vencer</h1>
        <p className="text-muted-foreground">
          Series de reservas fijas cuyo vencimiento es dentro de los
          próximos 60 días.
        </p>
      </div>
      <Separator />

      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          Icon={CalendarClock}
          title="Total por Vencer"
          value={stats.total}
          footer="Series dentro de los próximos 60 días"
          isLoading={loading}
        />
        <StatCard
          Icon={AlertTriangle}
          title="Urgentes (< 15 días)"
          value={stats.urgent}
          footer="Requieren atención inmediata"
          isLoading={loading}
        />
        <StatCard
          Icon={Clock}
          title="Próximas (15-30 días)"
          value={stats.moderate}
          footer="Vencen en las próximas semanas"
          isLoading={loading}
        />
      </div>

      {/* Tabla Desktop */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center hover:text-foreground transition-colors"
                  onClick={() => handleSort("usuario")}
                >
                  Usuario
                  {getSortIcon("usuario")}
                </button>
              </TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>
                <button
                  className="flex items-center hover:text-foreground transition-colors"
                  onClick={() => handleSort("recurrence_end_date")}
                >
                  Fecha de Vencimiento
                  {getSortIcon("recurrence_end_date")}
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                  onClick={() => handleSort("dias_restantes")}
                >
                  Días Restantes
                  {getSortIcon("dias_restantes")}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : sortedData.length > 0 ? (
              sortedData.map((serie) => (
                <TableRow key={serie.recurrence_id}>
                  <TableCell className="font-medium">
                    {serie.usuario}
                  </TableCell>
                  <TableCell>
                    <div className="capitalize">{serie.serie_desc}</div>
                    <div className="text-sm text-muted-foreground">
                      {serie.consultorio}
                    </div>
                  </TableCell>
                  <TableCell>
                    {dayjs(serie.recurrence_end_date).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={getUrgencyVariant(serie.dias_restantes)}
                      className="font-medium"
                    >
                      {serie.dias_restantes} días
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay series de reservas fijas por vencer en los próximos
                  60 días.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Móvil (Tarjetas) */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando...
          </div>
        ) : sortedData.length > 0 ? (
          sortedData.map((serie) => (
            <div
              key={serie.recurrence_id}
              className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {serie.usuario}
                  </h3>
                  <p className="text-sm text-slate-600 capitalize">
                    {serie.serie_desc}
                  </p>
                  <p className="text-sm text-slate-600">
                    {serie.consultorio}
                  </p>
                </div>
                <Badge
                  variant={getUrgencyVariant(serie.dias_restantes)}
                  className="capitalize shrink-0 shadow-sm font-medium"
                >
                  {serie.dias_restantes} días
                </Badge>
              </div>

              <div className="border-t border-slate-300 pt-3">
                <p className="text-xs text-slate-500 uppercase font-semibold">
                  Vence el
                </p>
                <p className="font-bold text-slate-800">
                  {dayjs(serie.recurrence_end_date).format("DD/MM/YYYY")}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No hay series de reservas fijas por vencer en los próximos 60
            días.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiringReservationsPage;
