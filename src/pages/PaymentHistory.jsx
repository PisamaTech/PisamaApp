import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchUserPayments, fetchUserBalance } from "@/services/paymentService";
import {
  formatPaymentType,
  getPaymentTypeBadgeVariant,
} from "@/utils/paymentHelpers";
import {
  Badge,
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

export const PaymentHistory = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const userId = profile?.id;

  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPayments, setTotalPayments] = useState(0);

  const totalPages = useMemo(
    () => Math.ceil(totalPayments / itemsPerPage),
    [totalPayments, itemsPerPage]
  );

  // Cargar datos al montar y cuando cambie la página
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;

      startLoading();
      try {
        // Cargar pagos con paginación
        const { data, count } = await fetchUserPayments(
          userId,
          currentPage,
          itemsPerPage
        );
        setPayments(data);
        setTotalPayments(count);

        // Cargar balance (solo en primera carga)
        if (currentPage === 1) {
          const balanceData = await fetchUserBalance(userId);
          setBalance(balanceData);
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: `No se pudo cargar el historial: ${error.message}`,
        });
      } finally {
        stopLoading();
      }
    };

    loadData();
  }, [userId, currentPage]);

  // Función para ir a la página anterior
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Función para ir a la página siguiente
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Historial de Pagos</h1>
        <p className="text-muted-foreground">
          Consulta todos tus pagos y el estado de tu cuenta.
        </p>
      </div>
      <Separator />

      {/* Balance Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuenta</CardTitle>
          <Separator />
          <CardDescription className="py-2">
            Estado actual de tus pagos y facturación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !balance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : balance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Pagado
                </p>
                <p className="text-2xl font-bold">
                  ${balance.total_pagos?.toLocaleString("es-UY") || 0}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Facturado
                </p>
                <p className="text-2xl font-bold">
                  ${balance.total_facturado?.toLocaleString("es-UY") || 0}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 mb-1">Saldo a Favor</p>
                <p className="text-2xl font-bold text-green-600">
                  $
                  {(balance.saldo_disponible > 0
                    ? balance.saldo_disponible
                    : 0
                  ).toLocaleString("es-UY")}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-700 mb-1">
                  Pendiente de Pago
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  $
                  {balance.saldo_facturas_pendientes?.toLocaleString("es-UY") ||
                    0}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No se pudo cargar el balance
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tus Pagos</CardTitle>
          <Separator />
          <CardDescription className="py-2">
            {payments.length > 0
              ? `Mostrando ${payments.length} pagos de la página ${currentPage} de ${totalPages}`
              : "No tienes pagos registrados."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : payments.length > 0 ? (
            <div className="border rounded-md">
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {dayjs(payment.fecha_pago).format("DD/MM/YYYY HH:mm")}
                        </TableCell>
                        <TableCell className="font-bold">
                          ${payment.monto.toLocaleString("es-UY")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPaymentTypeBadgeVariant(payment.tipo)}
                          >
                            {formatPaymentType(payment.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {payment.nota || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4 p-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                          {dayjs(payment.fecha_pago).format("DD/MM/YYYY HH:mm")}
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                          ${payment.monto.toLocaleString("es-UY")}
                        </p>
                      </div>
                      <Badge
                        variant={getPaymentTypeBadgeVariant(payment.tipo)}
                        className="shadow-sm"
                      >
                        {formatPaymentType(payment.tipo)}
                      </Badge>
                    </div>
                    {payment.nota && (
                      <p className="text-sm text-slate-600 border-t border-slate-300 pt-2">
                        {payment.nota}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No tienes pagos registrados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={handlePreviousPage}
                  aria-disabled={currentPage === 1}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive className="w-14">
                  {currentPage} de {totalPages}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={handleNextPage}
                  aria-disabled={currentPage === totalPages}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
