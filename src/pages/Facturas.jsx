import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchUserInvoices,
  fetchCurrentPeriodPreview,
} from "@/services/billingService"; // Importa tus nuevas funciones de servicio
// --- Importaciones de Componentes Shadcn UI ---
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

dayjs.locale("es");

// --- Helper para formatear fechas con mayúscula inicial ---
const formatBillingDate = (date) => {
  if (!date) return "";
  const d = dayjs(date);
  return d.format("dddd, DD/MM/YYYY");
};

export const Facturas = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const userId = profile?.id;

  const { loading, error, startLoading, stopLoading, setError, clearError } =
    useUIStore();

  const [invoices, setInvoices] = useState([]);
  const [currentPeriodData, setCurrentPeriodData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [currentPeriodRange, setCurrentPeriodRange] = useState({
    start: null,
    end: null,
  });

  // Estados de Paginación para el historial
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Fijo por ahora
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Estados de Paginación para la VISTA PREVIA
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);

  const totalHistoryPages = useMemo(
    () => Math.ceil(totalInvoices / itemsPerPage),
    [totalInvoices, itemsPerPage]
  );

  // --- Lógica de Paginación para la VISTA PREVIA ---
  const previewPaginatedBookings = useMemo(() => {
    if (!currentPeriodData?.calculatedBookings) return [];
    const startIndex = (previewCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return currentPeriodData.calculatedBookings.slice(startIndex, endIndex);
  }, [currentPeriodData, previewCurrentPage, itemsPerPage]);

  const totalPreviewPages = useMemo(() => {
    if (!currentPeriodData?.calculatedBookings) return 0;
    return Math.ceil(
      currentPeriodData.calculatedBookings.length / itemsPerPage
    );
  }, [currentPeriodData, itemsPerPage]);

  // Efecto para cargar datos
  useEffect(() => {
    const loadData = async () => {
      if (!userId || !profile) return;

      // Determinar el rango del período actual para la vista previa
      const today = dayjs();
      let periodStart, periodEnd;
      if (profile.modalidad_pago === "semanal") {
        periodStart = today.startOf("isoWeek").toDate();
        periodEnd = today.endOf("isoWeek").toDate();
      } else {
        periodStart = today.startOf("month").toDate();
        periodEnd = today.endOf("month").toDate();
      }
      setCurrentPeriodRange({ start: periodStart, end: periodEnd }); // Guardar el rango

      // Cargar vista previa
      setIsLoadingPreview(true);
      try {
        const previewData = await fetchCurrentPeriodPreview(userId, profile);
        // 3. Ordenar las reservas por start_time
        previewData.calculatedBookings.sort((a, b) => {
          const timeA = a?.start_time ? new Date(a.start_time) : new Date(0);
          const timeB = b?.start_time ? new Date(b.start_time) : new Date(0);
          return timeA - timeB;
        });
        setCurrentPeriodData(previewData);
      } catch (err) {
        console.error("Error al cargar la vista previa:", err);
      } finally {
        setIsLoadingPreview(false);
      }

      // Cargar historial de facturas
      clearError();
      startLoading();
      try {
        const { data, count } = await fetchUserInvoices(
          userId,
          historyCurrentPage,
          itemsPerPage
        );
        // 3. Ordenar las reservas por start_time
        data.sort((a, b) => {
          const timeA = a?.periodo_inicio
            ? new Date(a.periodo_inicio)
            : new Date(0);
          const timeB = b?.periodo_inicio
            ? new Date(b.periodo_inicio)
            : new Date(0);
          return timeA - timeB;
        });
        setInvoices(data);
        setTotalInvoices(count);
      } catch (err) {
        setError(err);
      } finally {
        stopLoading();
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, historyCurrentPage, profile]); // Se vuelve a cargar si cambia el usuario o la página del historial

  // --- Funciones de paginación (ahora específicas) ---
  const handleHistoryPrevPage = () =>
    setHistoryCurrentPage((p) => Math.max(p - 1, 1));
  const handleHistoryNextPage = () =>
    setHistoryCurrentPage((p) => Math.min(p + 1, totalHistoryPages));

  const handlePreviewPrevPage = () =>
    setPreviewCurrentPage((p) => Math.max(p - 1, 1));
  const handlePreviewNextPage = () =>
    setPreviewCurrentPage((p) => Math.min(p + 1, totalPreviewPages));

  const getStatusVariant = (status) => {
    switch (status) {
      case "pagada":
        return "success";
      case "pendiente":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 text-center">
        Facturación
      </h1>
      <Separator />

      {/* --- Sección de Historial de Facturas--- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Historial de Facturas</CardTitle>
          <Separator />
          <CardDescription className="py-2">
            Aquí puedes ver y descargar tus facturas anteriores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-center">Cargando historial...</p>}
          {error && (
            <p className="text-center text-red-500">
              Error al cargar el historial: {error?.message}
            </p>
          )}
          {!loading && !error && invoices.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No tienes facturas generadas.
            </p>
          )}
          {!loading && !error && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Fecha de Emisión</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-medium">
                        {dayjs(factura.periodo_inicio).format("DD/MM/YY")} -{" "}
                        {dayjs(factura.periodo_fin).format("DD/MM/YY")}
                      </TableCell>
                      <TableCell>
                        {dayjs(factura.fecha_emision).format("DD/MM/YYYY")}
                      </TableCell>
                      <TableCell>
                        ${factura.monto_total.toLocaleString("es-UY")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(factura.estado)}>
                          {factura.estado.charAt(0).toUpperCase() +
                            factura.estado.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/facturas/${factura.id}`)}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Sección de Facturación en Curso --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Facturación en Curso</CardTitle>
          <Separator />
          <CardDescription className="py-2">
            Este es un resumen de tu actividad que aún no ha sido facturada.
            {currentPeriodRange.start && currentPeriodRange.end && (
              <>
                <br />
                Tu período de facturación actual es entre el{" "}
                <b className="text-foreground">
                  {formatBillingDate(currentPeriodRange.start)}
                </b>{" "}
                y el{" "}
                <b className="text-foreground">
                  {formatBillingDate(currentPeriodRange.end)}
                </b>
                .
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPreview ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : currentPeriodData &&
            currentPeriodData.calculatedBookings.length > 0 ? (
            <div className="space-y-6">
              {/* Resumen de Totales */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-base">
                  <span className="text-muted-foreground">Reservas:</span>
                  <span className="font-semibold">
                    {currentPeriodData.calculatedBookings.length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="text-muted-foreground">
                    Monto Acumulado (sin descuentos):
                  </span>
                  <span className="font-semibold">
                    ${currentPeriodData.totals.base.toLocaleString("es-UY")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="text-muted-foreground">
                    Descuentos Aplicados:
                  </span>
                  <span className="font-semibold text-green-600">
                    -$
                    {currentPeriodData.totals.discount.toLocaleString("es-UY")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base font-bold">
                  <span>Total Estimado Actual:</span>
                  <span>
                    ${currentPeriodData.totals.final.toLocaleString("es-UY")}
                  </span>
                </div>
              </div>

              <Separator />
              {/* Nueva Tabla de Detalle para Vista Previa */}
              <div className="space-y-2">
                <h4 className="font-semibold">Detalle de Actividad en Curso</h4>
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Día</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Consultorio</TableHead>
                        <TableHead>Costo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewPaginatedBookings.map((reserva) => (
                        <TableRow key={reserva.reserva_id}>
                          <TableCell>
                            {dayjs(reserva.start_time)
                              .format("dddd")
                              .replace(/^\w/, (c) => c.toUpperCase())}
                          </TableCell>
                          <TableCell>
                            {dayjs(reserva.start_time).format("DD/MM/YYYY")}
                          </TableCell>
                          <TableCell>
                            {dayjs(reserva.start_time).format("HH:mm")}
                          </TableCell>
                          <TableCell>{reserva.consultorio_nombre}</TableCell>
                          <TableCell>
                            ${reserva.costo_calculado.toLocaleString("es-UY")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reserva.estado.toLowerCase()}>
                              {reserva.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación para la Tabla de Vista Previa */}
                {totalPreviewPages > 1 && (
                  <div className="flex justify-center pt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={handlePreviewPrevPage}
                            aria-disabled={previewCurrentPage === 1}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink isActive>
                            {previewCurrentPage} de {totalPreviewPages}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handlePreviewNextPage}
                            aria-disabled={
                              previewCurrentPage === totalPreviewPages
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No hay actividad en el período actual.
            </p>
          )}
        </CardContent>
      </Card>

      {/* --- Controles de Paginación para el Historial --- */}
      {!loading && !error && totalHistoryPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={handleHistoryPrevPage}
                  aria-disabled={historyCurrentPage === 1}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>
                  Página {historyCurrentPage} de {totalHistoryPages}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={handleHistoryNextPage}
                  aria-disabled={historyCurrentPage === totalHistoryPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
