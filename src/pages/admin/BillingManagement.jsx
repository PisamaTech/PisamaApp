import { useState, useEffect, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  searchAllInvoices,
  markInvoiceAsPaid,
  fetchAllUsers,
} from "@/services/adminService";
import dayjs from "dayjs";

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
import { Eye, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { UserCombobox } from "@/components/admin/UserCombobox";
import { Separator } from "@/components/ui";

const BillingManagementPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [allUsers, setAllUsers] = useState([]); // Para el filtro de usuarios
  const [filters, setFilters] = useState({ userId: "todos", status: "todos" });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Estados para el modal de confirmación
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const totalPages = useMemo(
    () => Math.ceil(totalInvoices / itemsPerPage),
    [totalInvoices, itemsPerPage]
  );

  // Cargar la lista de usuarios para el filtro una sola vez
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Pedimos todos los usuarios sin paginación para el selector
        const { data } = await fetchAllUsers(1, 1000);
        setAllUsers(data);
      } catch (error) {
        console.error("No se pudieron cargar los usuarios para el filtro.");
      }
    };
    loadUsers();
  }, []);

  // Cargar facturas cuando cambian los filtros aplicados o la página
  useEffect(() => {
    const loadInvoices = async () => {
      startLoading();
      try {
        const { data, count } = await searchAllInvoices(
          currentPage,
          itemsPerPage,
          appliedFilters
        );
        setInvoices(data);
        setTotalInvoices(count);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: `No se pudieron cargar las facturas: ${
            error.message || "Error Desconocido"
          }.`,
        });
      } finally {
        stopLoading();
      }
    };
    loadInvoices();
  }, [
    currentPage,
    appliedFilters,
    itemsPerPage,
    startLoading,
    stopLoading,
    showToast,
  ]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters(filters);
  };

  const openConfirmationDialog = (invoice) => {
    setTimeout(() => {
      setSelectedInvoice(invoice);
      setIsConfirmOpen(true);
    }, 150);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    // 1. Cierra el diálogo de confirmación INMEDIATAMENTE.
    // El usuario ya confirmó su intención. La UI puede ahora mostrar un loading global.
    setIsConfirmOpen(false);

    startLoading();
    try {
      const updatedInvoice = await markInvoiceAsPaid(selectedInvoice.id);
      // Actualizar la factura en la lista local
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === updatedInvoice.id
            ? {
                ...updatedInvoice,
                firstName: inv.firstName, // Mantener datos del usuario
                lastName: inv.lastName, // Mantener datos del usuario
              }
            : inv
        )
      );
      showToast({
        type: "success",
        title: "Éxito",
        message: "La factura ha sido marcada como pagada.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: `No se pudo actualizar la factura: ${
          error.message || "Error Desconocido"
        }.`,
      });
    } finally {
      stopLoading();
    }
  };

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
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Gestión de Facturación</h1>
          <p className="text-muted-foreground">
            Visualiza todas las facturas y gestiona los pagos.
          </p>
        </div>
        <Separator />
        {/* Filtros */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Filtro de Usuario (Combobox) */}
          <div className="w-full md:w-auto">
            <UserCombobox
              users={allUsers}
              selectedUserId={filters.userId}
              onSelect={(id) => handleFilterChange("userId", id)}
            />
          </div>

          {/* Filtro de Estado */}
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="pagada">Pagada</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleApplyFilters} className="w-full md:w-auto">
            Buscar
          </Button>
        </div>

        {/* Tabla de Facturas (Desktop) */}
        <div className="hidden md:block border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Factura</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Emisión</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      {dayjs(invoice.periodo_inicio).format("DD/MM/YY")} -{" "}
                      {dayjs(invoice.periodo_fin).format("DD/MM/YY")}
                    </TableCell>
                    <TableCell>
                      {`${invoice.firstName || ""} ${
                        invoice.lastName || ""
                      }`.trim() || "Usuario no encontrado"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${invoice.monto_total.toLocaleString("es-UY")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusVariant(invoice.estado)}
                        className="capitalize"
                      >
                        {invoice.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dayjs(invoice.fecha_emision).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.estado === "pendiente" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openConfirmationDialog(invoice)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle
                                  strokeWidth={3}
                                  className="h-4 w-4"
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marcar como Pagada</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                navigate(`/facturas/${invoice.id}`)
                              }
                            >
                              <Eye strokeWidth={2.5} className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver Detalle</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron facturas.
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
          ) : invoices.length > 0 ? (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border rounded-lg p-4 space-y-3 shadow-sm bg-card text-card-foreground"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">
                      #{invoice.id}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {dayjs(invoice.periodo_inicio).format("DD/MM/YY")} -{" "}
                      {dayjs(invoice.periodo_fin).format("DD/MM/YY")}
                    </p>
                  </div>
                  <Badge
                    variant={getStatusVariant(invoice.estado)}
                    className="capitalize shrink-0"
                  >
                    {invoice.estado}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {`${invoice.firstName || ""} ${
                      invoice.lastName || ""
                    }`.trim() || "Usuario no encontrado"}
                  </p>
                  <p className="text-lg font-bold">
                    ${invoice.monto_total.toLocaleString("es-UY")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Emitida: {dayjs(invoice.fecha_emision).format("DD/MM/YYYY")}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t mt-2">
                   {invoice.estado === "pendiente" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfirmationDialog(invoice)}
                        className="text-green-600 hover:text-green-700 bg-green-50/50 border-green-200"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar Pagada
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/facturas/${invoice.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              No se encontraron facturas.
            </div>
          )}
        </div>

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive className="w-14">
                    {currentPage} de {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    aria-disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Modal de Confirmación */}
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar Pago?</AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de marcar la factura del período{" "}
                <b>
                  {selectedInvoice &&
                    `${dayjs(selectedInvoice.periodo_inicio).format(
                      "DD/MM/YY"
                    )} - ${dayjs(selectedInvoice.periodo_fin).format(
                      "DD/MM/YY"
                    )}`}
                </b>{" "}
                como pagada. Esta acción no se puede deshacer fácilmente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsPaid}>
                Confirmar Pago
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default BillingManagementPage;
