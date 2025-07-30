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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { ReservationStatus } from "@/utils/constants";
import { useNavigate } from "react-router-dom";

const BillingManagementTab = () => {
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
          message: "No se pudieron cargar las facturas.",
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
        prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
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
        message: "No se pudo actualizar la factura.",
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
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-4">
        {/* Filtro de Usuario (Combobox) */}
        <UserCombobox
          users={allUsers}
          selectedUserId={filters.userId}
          onSelect={(id) => handleFilterChange("userId", id)}
        />

        {/* Filtro de Estado */}
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleApplyFilters}>Buscar</Button>
      </div>

      {/* Tabla de Facturas */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Monto Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Emisión</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
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
                    ${invoice.monto_total.toFixed(2)}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/facturas/${invoice.id}`)}
                        >
                          Ver Detalle
                        </DropdownMenuItem>
                        {invoice.estado === "pendiente" && (
                          <DropdownMenuItem
                            onClick={() => openConfirmationDialog(invoice)}
                            className="text-green-600 focus:text-green-600"
                          >
                            Marcar como Pagada
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron facturas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
  );
};

// Componente Combobox para el filtro de usuarios
function UserCombobox({ users, selectedUserId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const selectedUserName = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`
    : "Todos los usuarios";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
        >
          {selectedUserName}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar usuario..." />
          <CommandEmpty>No se encontró el usuario.</CommandEmpty>
          <CommandGroup>
            <CommandItem onSelect={() => onSelect("todos")}>
              Todos los usuarios
            </CommandItem>
            {users.map((user) => (
              <CommandItem
                key={user.id}
                onSelect={() => {
                  onSelect(user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedUserId === user.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {user.firstName} {user.lastName}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default BillingManagementTab;
