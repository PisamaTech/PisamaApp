import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
} from "lucide-react";

dayjs.extend(utc);
import { useUIStore } from "@/stores/uiStore";
import {
  fetchUserInvoices,
  fetchCurrentPeriodPreview,
} from "@/services/billingService";
import {
  fetchUserPayments,
  fetchUserTotalPayments,
  fetchUserTotalInvoiced,
} from "@/services/paymentService";
import { fetchAllUsers } from "@/services/adminService";
import {
  formatPaymentType,
  getPaymentTypeBadgeVariant,
} from "@/utils/paymentHelpers";

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

const UserBillingDetailsPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();

  const { loading, error, startLoading, stopLoading, setError, clearError } =
    useUIStore();

  const [userProfile, setUserProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [currentPeriodData, setCurrentPeriodData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [currentPeriodRange, setCurrentPeriodRange] = useState({
    start: null,
    end: null,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [totalPagosUsuario, setTotalPagosUsuario] = useState(0);
  const [totalFacturadoUsuario, setTotalFacturadoUsuario] = useState(0);

  // Estados de Paginación para el historial de facturas
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Estados de Paginación para el historial de pagos
  const [paymentsCurrentPage, setPaymentsCurrentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  // Estados de Paginación para la VISTA PREVIA
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);

  const totalHistoryPages = useMemo(
    () => Math.ceil(totalInvoices / itemsPerPage),
    [totalInvoices, itemsPerPage]
  );

  const totalPaymentPages = useMemo(
    () => Math.ceil(totalPayments / itemsPerPage),
    [totalPayments, itemsPerPage]
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

  // Cargar perfil del usuario
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) return;
      try {
        const { data } = await fetchAllUsers(1, 1000);
        const user = data.find((u) => u.id === userId);
        if (user) {
          setUserProfile(user);
        }
      } catch (err) {
        console.error("Error al cargar el perfil del usuario:", err);
      }
    };
    loadUserProfile();
  }, [userId]);

  // Efecto para cargar datos
  useEffect(() => {
    const loadData = async () => {
      if (!userId || !userProfile) return;

      // Determinar el rango del período actual para la vista previa
      const today = dayjs();
      let periodStart, periodEnd;
      if (userProfile.modalidad_pago === "semanal") {
        periodStart = today.startOf("isoWeek").toDate();
        periodEnd = today.endOf("isoWeek").toDate();
      } else {
        periodStart = today.startOf("month").toDate();
        periodEnd = today.endOf("month").toDate();
      }
      setCurrentPeriodRange({ start: periodStart, end: periodEnd });

      // Cargar vista previa
      setIsLoadingPreview(true);
      try {
        const previewData = await fetchCurrentPeriodPreview(
          userId,
          userProfile
        );
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

      // Cargar total de pagos del usuario
      try {
        const totalPagos = await fetchUserTotalPayments(userId);
        setTotalPagosUsuario(totalPagos);
      } catch (err) {
        console.error("Error al cargar total de pagos:", err);
      }

      // Cargar total facturado del usuario
      try {
        const totalFacturado = await fetchUserTotalInvoiced(userId);
        setTotalFacturadoUsuario(totalFacturado);
      } catch (err) {
        console.error("Error al cargar total facturado:", err);
      }

      // Cargar pagos paginados
      try {
        const { data: payments, count } = await fetchUserPayments(
          userId,
          paymentsCurrentPage,
          itemsPerPage
        );
        setRecentPayments(payments);
        setTotalPayments(count);
      } catch (err) {
        console.error("Error al cargar pagos:", err);
      }

      // Cargar historial de facturas
      clearError();
      startLoading("Cargando facturas...");
      try {
        const { data, count } = await fetchUserInvoices(
          userId,
          historyCurrentPage,
          itemsPerPage
        );
        data.sort((a, b) => {
          const timeA = a?.periodo_inicio
            ? new Date(a.periodo_inicio)
            : new Date(0);
          const timeB = b?.periodo_inicio
            ? new Date(b.periodo_inicio)
            : new Date(0);
          return timeB - timeA;
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
  }, [userId, historyCurrentPage, paymentsCurrentPage, userProfile]);

  // --- Funciones de paginación ---
  const handleHistoryPrevPage = () =>
    setHistoryCurrentPage((p) => Math.max(p - 1, 1));
  const handleHistoryNextPage = () =>
    setHistoryCurrentPage((p) => Math.min(p + 1, totalHistoryPages));

  const handlePaymentsPrevPage = () =>
    setPaymentsCurrentPage((p) => Math.max(p - 1, 1));
  const handlePaymentsNextPage = () =>
    setPaymentsCurrentPage((p) => Math.min(p + 1, totalPaymentPages));

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

  const userName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() ||
      "Usuario"
    : "Usuario";

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Header con botón de volver */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/admin/balance-summary")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Facturación de {userName}
          </h1>
          {userProfile?.email && (
            <p className="text-muted-foreground">{userProfile.email}</p>
          )}
        </div>
      </div>
      <Separator />

      {/* --- Tarjetas de Resumen: Pagos, Gastos y Balance --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total de Pagos */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pagos
              </CardTitle>
              <div className="p-2 bg-slate-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-green-600">
                ${totalPagosUsuario.toLocaleString("es-UY")}
              </p>
              <p className="text-xs text-muted-foreground">Pagos realizados</p>
            </div>
          </CardContent>
        </Card>

        {/* Total de Gastos */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Gastos
              </CardTitle>
              <div className="p-2 bg-slate-100 rounded-full">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-red-600">
                ${totalFacturadoUsuario.toLocaleString("es-UY")}
              </p>
              <p className="text-xs text-muted-foreground">Monto facturado</p>
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balance
              </CardTitle>
              <div className="p-2 bg-slate-100 rounded-full">
                {totalPagosUsuario - totalFacturadoUsuario >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p
                className={`text-3xl font-bold ${
                  totalPagosUsuario - totalFacturadoUsuario >= 0
                    ? "text-blue-600"
                    : "text-orange-600"
                }`}
              >
                {totalPagosUsuario - totalFacturadoUsuario >= 0 ? "+" : "-"}$
                {Math.abs(
                  totalPagosUsuario - totalFacturadoUsuario
                ).toLocaleString("es-UY")}
              </p>
              <p className="text-xs text-muted-foreground">
                {totalPagosUsuario - totalFacturadoUsuario >= 0
                  ? "Saldo a favor"
                  : "Pendiente de pago"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Sección de Historiales: Facturas y Pagos (2 columnas en desktop) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Historial de Facturas */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Historial de Facturas</CardTitle>
            <Separator />
            <CardDescription className="py-2">
              Facturas anteriores generadas.
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
                No hay facturas generadas.
              </p>
            )}
            {!loading && !error && invoices.length > 0 && (
              <>
                <div className="border rounded-md">
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((factura) => (
                          <TableRow
                            key={factura.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/facturas/${factura.id}`)}
                          >
                            <TableCell className="font-medium">
                              {dayjs(factura.periodo_inicio).format("DD/MM/YY")}{" "}
                              - {dayjs(factura.periodo_fin).format("DD/MM/YY")}
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden space-y-3 p-4">
                    {invoices.map((factura) => (
                      <div
                        key={factura.id}
                        onClick={() => navigate(`/facturas/${factura.id}`)}
                        className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300 cursor-pointer hover:bg-slate-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                              Período
                            </p>
                            <p className="font-bold text-slate-900">
                              {dayjs(factura.periodo_inicio).format("DD/MM/YY")}{" "}
                              - {dayjs(factura.periodo_fin).format("DD/MM/YY")}
                            </p>
                          </div>
                          <Badge
                            variant={getStatusVariant(factura.estado)}
                            className="shadow-sm"
                          >
                            {factura.estado.charAt(0).toUpperCase() +
                              factura.estado.slice(1)}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-300 pt-3">
                          <div>
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                              Monto Total
                            </p>
                            <p className="text-xl font-black text-slate-900">
                              ${factura.monto_total.toLocaleString("es-UY")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paginación de Facturas */}
                {totalHistoryPages > 1 && (
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
                          <PaginationLink
                            isActive
                            className="min-w-[80px] px-4"
                          >
                            {historyCurrentPage} de {totalHistoryPages}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handleHistoryNextPage}
                            aria-disabled={
                              historyCurrentPage === totalHistoryPages
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha: Historial de Pagos */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Historial de Pagos</CardTitle>
            <Separator />
            <CardDescription className="py-2">
              Últimos pagos registrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No hay pagos registrados aún.
              </p>
            ) : (
              <>
                <div className="border rounded-md">
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {dayjs
                                .utc(payment.fecha_pago)
                                .format("DD/MM/YYYY")}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              $
                              {parseFloat(payment.monto).toLocaleString(
                                "es-UY"
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground overflow-hidden">
                              {payment.nota || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getPaymentTypeBadgeVariant(
                                  payment.tipo
                                )}
                              >
                                {formatPaymentType(payment.tipo)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden space-y-3 p-4">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-4 bg-slate-200 text-slate-900 rounded-lg shadow-sm border border-slate-300 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-slate-900">
                              {dayjs
                                .utc(payment.fecha_pago)
                                .format("DD/MM/YYYY")}
                            </p>
                            <Badge
                              variant={getPaymentTypeBadgeVariant(payment.tipo)}
                              className="mt-1 text-[10px] h-5 px-1.5 shadow-sm"
                            >
                              {formatPaymentType(payment.tipo)}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-green-600">
                              $
                              {parseFloat(payment.monto).toLocaleString(
                                "es-UY"
                              )}
                            </p>
                          </div>
                        </div>
                        {payment.nota && (
                          <div className="pt-2 border-t border-slate-300">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                              Cuenta
                            </p>
                            <p className="text-sm text-slate-700 truncate">
                              {payment.nota}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paginación de Pagos */}
                {totalPaymentPages > 1 && (
                  <div className="flex justify-center pt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={handlePaymentsPrevPage}
                            aria-disabled={paymentsCurrentPage === 1}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            isActive
                            className="min-w-[80px] px-4"
                          >
                            {paymentsCurrentPage} de {totalPaymentPages}
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handlePaymentsNextPage}
                            aria-disabled={
                              paymentsCurrentPage === totalPaymentPages
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Sección de Facturación en Curso --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Próxima factura</CardTitle>
          <Separator />
          <CardDescription className="py-2">
            Resumen de actividad que aún no ha sido facturada.
            {currentPeriodRange.start && currentPeriodRange.end && (
              <>
                <br />
                Período de facturación actual: entre el{" "}
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

                  {/* Mobile View */}
                  <div className="md:hidden space-y-3 p-3">
                    {previewPaginatedBookings.map((reserva) => (
                      <div
                        key={reserva.reserva_id}
                        className="flex justify-between items-start p-4 bg-slate-200 text-slate-900 rounded-lg shadow-sm border border-slate-300"
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-900 uppercase">
                            {dayjs(reserva.start_time)
                              .format("ddd DD/MM")
                              .replace(/^\w/, (c) => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-slate-600 font-medium">
                            {dayjs(reserva.start_time).format("HH:mm")} hs -{" "}
                            {reserva.consultorio_nombre}
                          </p>
                          <Badge
                            variant={reserva.estado.toLowerCase()}
                            className="mt-2 text-[10px] h-5 px-1.5 shadow-sm"
                          >
                            {reserva.estado}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            ${reserva.costo_calculado.toLocaleString("es-UY")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                          <PaginationLink
                            isActive
                            className="min-w-[80px] px-4"
                          >
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
    </div>
  );
};

export default UserBillingDetailsPage;
