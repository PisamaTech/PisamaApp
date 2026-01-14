import { useState, useEffect, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  searchAllPayments,
  createManualPayment,
  createManualInvoice,
} from "@/services/paymentService";
import { fetchAllUsers } from "@/services/adminService";
import { createNotification } from "@/services/notificationService";
import dayjs from "dayjs";
import {
  formatPaymentType,
  getPaymentTypeBadgeVariant,
  PAYMENT_TYPES,
} from "@/utils/paymentHelpers";

// --- Importaciones de Componentes Shadcn UI ---
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, FileText } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/admin/UserCombobox";
import { Separator } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const PaymentManagementPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const [payments, setPayments] = useState([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [allUsers, setAllUsers] = useState([]); // Para el filtro de usuarios
  const [filters, setFilters] = useState({ userId: "todos", tipo: "todos" });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Estados para modal de pago manual
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    userId: "",
    amount: "",
    type: "transferencia",
    note: "",
  });

  // Estados para modal de factura histórica
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    userId: "",
    periodoInicio: "",
    periodoFin: "",
    montoTotal: "",
    estado: "pendiente",
    note: "",
  });

  const totalPages = useMemo(
    () => Math.ceil(totalPayments / itemsPerPage),
    [totalPayments, itemsPerPage]
  );

  // Cargar usuarios para filtros
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await fetchAllUsers(1, 1000);
        setAllUsers(data);
      } catch (error) {
        console.error("No se pudieron cargar los usuarios para el filtro.");
      }
    };
    loadUsers();
  }, []);

  // Cargar pagos cuando cambian los filtros o la página
  useEffect(() => {
    const loadPayments = async () => {
      startLoading();
      try {
        const { data, count } = await searchAllPayments(
          currentPage,
          itemsPerPage,
          appliedFilters
        );
        setPayments(data);
        setTotalPayments(count);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: `No se pudieron cargar los pagos: ${error.message}`,
        });
      } finally {
        stopLoading();
      }
    };
    loadPayments();
  }, [appliedFilters, currentPage]);

  // Aplicar filtros
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1); // Resetear a página 1 al filtrar
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    const defaultFilters = { userId: "todos", tipo: "todos" };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  // Crear pago manual
  const handleCreatePayment = async () => {
    if (!paymentForm.userId || !paymentForm.amount) {
      showToast({
        type: "error",
        title: "Error",
        message: "Usuario y monto son requeridos",
      });
      return;
    }

    try {
      startLoading();
      await createManualPayment({
        userId: paymentForm.userId,
        amount: parseFloat(paymentForm.amount),
        type: paymentForm.type,
        note: paymentForm.note,
      });

      // Crear notificación para el usuario
      await createNotification({
        usuarioId: paymentForm.userId,
        tipo: "PAGO_REGISTRADO",
        titulo: "Pago Registrado",
        mensaje: `Se ha registrado un pago de $${parseFloat(
          paymentForm.amount
        ).toLocaleString("es-UY")} en tu cuenta.`,
        enlace: "/pagos",
      });

      showToast({
        type: "success",
        title: "Éxito",
        message: "Pago manual creado correctamente",
      });

      setIsPaymentDialogOpen(false);
      setPaymentForm({
        userId: "",
        amount: "",
        type: "transferencia",
        note: "",
      });

      // Recargar pagos
      const { data, count } = await searchAllPayments(
        currentPage,
        itemsPerPage,
        appliedFilters
      );
      setPayments(data);
      setTotalPayments(count);
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: `No se pudo crear el pago: ${error.message}`,
      });
    } finally {
      stopLoading();
    }
  };

  // Crear factura histórica
  const handleCreateInvoice = async () => {
    if (
      !invoiceForm.userId ||
      !invoiceForm.periodoInicio ||
      !invoiceForm.periodoFin ||
      !invoiceForm.montoTotal
    ) {
      showToast({
        type: "error",
        title: "Error",
        message: "Todos los campos excepto nota son requeridos",
      });
      return;
    }

    try {
      startLoading();
      await createManualInvoice({
        userId: invoiceForm.userId,
        periodoInicio: invoiceForm.periodoInicio,
        periodoFin: invoiceForm.periodoFin,
        montoTotal: parseFloat(invoiceForm.montoTotal),
        estado: invoiceForm.estado,
        note: invoiceForm.note,
      });

      // Crear notificación para el usuario
      await createNotification({
        usuarioId: invoiceForm.userId,
        tipo: "FACTURA_GENERADA",
        titulo: "Factura Histórica Registrada",
        mensaje: `Se ha registrado una factura histórica de $${parseFloat(
          invoiceForm.montoTotal
        ).toLocaleString("es-UY")}.`,
        enlace: "/facturas",
      });

      showToast({
        type: "success",
        title: "Éxito",
        message: "Factura histórica creada correctamente",
      });

      setIsInvoiceDialogOpen(false);
      setInvoiceForm({
        userId: "",
        periodoInicio: "",
        periodoFin: "",
        montoTotal: "",
        estado: "pendiente",
        note: "",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: `No se pudo crear la factura: ${error.message}`,
      });
    } finally {
      stopLoading();
    }
  };

  // Paginación
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pagos</h1>
          <p className="text-muted-foreground">
            Administra pagos manuales y facturas históricas
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Pago Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Pago Manual</DialogTitle>
                <DialogDescription>
                  Registra un pago manual (efectivo, descuento especial, ajuste de saldo)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-user">Usuario *</Label>
                  <UserCombobox
                    users={allUsers}
                    value={paymentForm.userId}
                    onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, userId: value })
                    }
                    placeholder="Selecciona un usuario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Monto *</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="1500"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-type">Tipo de Pago *</Label>
                  <Select
                    value={paymentForm.type}
                    onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-note">Nota (opcional)</Label>
                  <Textarea
                    id="payment-note"
                    placeholder="Ej: Descuento acordado - diferencia mensual"
                    value={paymentForm.note}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, note: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreatePayment} disabled={loading}>
                  {loading ? "Creando..." : "Crear Pago"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Factura Histórica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Factura Histórica</DialogTitle>
                <DialogDescription>
                  Registra una factura de deuda previa a la implementación de la app
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-user">Usuario *</Label>
                  <UserCombobox
                    users={allUsers}
                    value={invoiceForm.userId}
                    onValueChange={(value) =>
                      setInvoiceForm({ ...invoiceForm, userId: value })
                    }
                    placeholder="Selecciona un usuario"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-start">Período Inicio *</Label>
                    <Input
                      id="invoice-start"
                      type="date"
                      value={invoiceForm.periodoInicio}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          periodoInicio: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice-end">Período Fin *</Label>
                    <Input
                      id="invoice-end"
                      type="date"
                      value={invoiceForm.periodoFin}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          periodoFin: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-amount">Monto Total *</Label>
                  <Input
                    id="invoice-amount"
                    type="number"
                    placeholder="3500"
                    value={invoiceForm.montoTotal}
                    onChange={(e) =>
                      setInvoiceForm({ ...invoiceForm, montoTotal: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-status">Estado *</Label>
                  <Select
                    value={invoiceForm.estado}
                    onValueChange={(value) =>
                      setInvoiceForm({ ...invoiceForm, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-note">Nota (opcional)</Label>
                  <Textarea
                    id="invoice-note"
                    placeholder="Ej: Deuda acumulada pre-app"
                    value={invoiceForm.note}
                    onChange={(e) =>
                      setInvoiceForm({ ...invoiceForm, note: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInvoiceDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateInvoice} disabled={loading}>
                  {loading ? "Creando..." : "Crear Factura"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <UserCombobox
                users={allUsers}
                value={filters.userId}
                onValueChange={(value) =>
                  setFilters({ ...filters, userId: value })
                }
                placeholder="Todos los usuarios"
                allowAll
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <Select
                value={filters.tipo}
                onValueChange={(value) => setFilters({ ...filters, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {PAYMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                Aplicar
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="flex-1"
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Pagos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pagos Registrados ({totalPayments})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {payments.length > 0
              ? `Mostrando ${payments.length} pagos de la página ${currentPage} de ${totalPages}`
              : "No se encontraron pagos"}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">Cargando pagos...</p>
          ) : payments.length > 0 ? (
            <>
              {/* Desktop View */}
              <div className="hidden md:block border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
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
                        <TableCell>
                          <div className="font-medium">
                            {payment.firstName} {payment.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.email}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">
                          ${payment.monto.toLocaleString("es-UY")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentTypeBadgeVariant(payment.tipo)}>
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
              <div className="md:hidden space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-slate-200 text-slate-900 p-4 rounded-lg space-y-3 border border-slate-300"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">
                          {payment.firstName} {payment.lastName}
                        </p>
                        <p className="text-sm text-slate-600">{payment.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {dayjs(payment.fecha_pago).format("DD/MM/YYYY HH:mm")}
                        </p>
                      </div>
                      <Badge variant={getPaymentTypeBadgeVariant(payment.tipo)}>
                        {formatPaymentType(payment.tipo)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-300 pt-2">
                      <span className="text-sm font-medium">Monto:</span>
                      <span className="text-xl font-black">
                        ${payment.monto.toLocaleString("es-UY")}
                      </span>
                    </div>
                    {payment.nota && (
                      <p className="text-sm text-slate-600 border-t border-slate-300 pt-2">
                        {payment.nota}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No hay pagos registrados
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

export default PaymentManagementPage;
