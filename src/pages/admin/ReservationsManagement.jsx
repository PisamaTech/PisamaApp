import { useState, useEffect, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import { searchAllReservations, fetchAllUsers } from "@/services/adminService";
import dayjs from "dayjs";
import { ReservationStatus, resources } from "@/utils/constants";

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

import { CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserCombobox } from "@/components/admin/UserCombobox";
import { EventDialog } from "@/components/EventDialog";
import camillaIcon from "@/assets/massage-table-50.png";
import { Separator } from "@/components/ui";

const ReservationsManagementPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const [reservations, setReservations] = useState([]);
  const [totalReservations, setTotalReservations] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // --- Estados para manejar el EventDialog ---
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEventForDialog, setSelectedEventForDialog] = useState(null);

  const [allUsers, setAllUsers] = useState([]); // Para el filtro de usuarios
  const [filters, setFilters] = useState({
    userId: "todos",
    status: "todos",
    consultorioId: "todos",
    dateRange: { from: undefined, to: undefined },
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // --- Estados para el ordenamiento ---
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" o "desc"

  const totalPages = useMemo(
    () => Math.ceil(totalReservations / itemsPerPage),
    [totalReservations, itemsPerPage]
  );

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await fetchAllUsers(1, 1000);
        setAllUsers(data);
      } catch (error) {
        console.error(
          "No se pudieron cargar los usuarios para el filtro:",
          error
        );
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const loadReservations = async () => {
      startLoading();
      try {
        const { data, count } = await searchAllReservations(
          currentPage,
          itemsPerPage,
          appliedFilters
        );
        setReservations(data);
        setTotalReservations(count);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: "No se pudieron cargar las reservas.",
        });
      } finally {
        stopLoading();
      }
    };
    loadReservations();
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

  const handleResetFilters = () => {
    const defaultFilters = {
      userId: "todos",
      status: "todos",
      consultorioId: "todos",
      dateRange: { from: undefined, to: undefined },
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  // ---- Funciones para manejar el cambio de página ---
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleViewDetails = (reserva) => {
    // EventDialog espera un campo 'titulo' para el nombre del usuario.
    // También espera objetos Date para las horas de inicio y fin.
    const formattedEvent = {
      ...reserva,
      titulo: `${reserva.usuario_firstname || ""} ${
        reserva.usuario_lastname || ""
      }`.trim(),
      start_time: new Date(reserva.start_time),
      end_time: new Date(reserva.end_time),
    };
    setSelectedEventForDialog(formattedEvent);
    setIsEventDialogOpen(true);
  };

  // --- Función para manejar el ordenamiento ---
  const handleSort = (field) => {
    if (sortField === field) {
      // Si ya estamos ordenando por este campo, cambiar dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Nuevo campo, ordenar ascendente por defecto
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // --- Aplicar ordenamiento a las reservas ---
  const sortedReservations = useMemo(() => {
    if (!sortField) return reservations;

    const sorted = [...reservations].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "start_time":
        case "created_at":
          aValue = new Date(a[sortField]);
          bValue = new Date(b[sortField]);
          break;
        case "usuario":
          aValue = `${a.usuario_firstname || ""} ${a.usuario_lastname || ""}`.trim().toLowerCase();
          bValue = `${b.usuario_firstname || ""} ${b.usuario_lastname || ""}`.trim().toLowerCase();
          break;
        case "consultorio":
          aValue = (a.consultorio_nombre || "").toLowerCase();
          bValue = (b.consultorio_nombre || "").toLowerCase();
          break;
        case "estado":
        case "tipo_reserva":
          aValue = (a[sortField] || "").toLowerCase();
          bValue = (b[sortField] || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [reservations, sortField, sortDirection]);

  console.log(reservations);

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full lg:max-w-7xl">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Búsqueda de Reservas</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Encuentra cualquier reserva en el sistema con filtros avanzados.
        </p>
      </div>
      <Separator />
      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 items-center">
        <UserCombobox
          users={allUsers}
          selectedUserId={filters.userId}
          onSelect={(id) => handleFilterChange("userId", id)}
        />
        <DateRangePicker
          date={filters.dateRange}
          onDateChange={(range) => handleFilterChange("dateRange", range)}
        />
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.values(ReservationStatus).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.consultorioId}
          onValueChange={(value) => handleFilterChange("consultorioId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por consultorio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los consultorios</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button onClick={handleApplyFilters} className="w-full text-xs sm:text-sm h-9 sm:h-10">
            Buscar
          </Button>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            className="w-full text-xs sm:text-sm h-9 sm:h-10"
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* Tabla de Reservas */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm hidden md:table-cell">Día</TableHead>
              <SortableTableHead
                label="Fecha y Hora"
                field="start_time"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Usuario"
                field="usuario"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Consultorio"
                field="consultorio"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="hidden lg:table-cell"
              />
              <SortableTableHead
                label="Estado"
                field="estado"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Tipo"
                field="tipo_reserva"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="text-xs sm:text-sm hidden xl:table-cell">Camilla</TableHead>
              <SortableTableHead
                label="Fecha de Creación"
                field="created_at"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="hidden xl:table-cell"
              />
              <TableHead className="text-right text-xs sm:text-sm">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-xs sm:text-sm">
                  Cargando reservas...
                </TableCell>
              </TableRow>
            ) : sortedReservations.length > 0 ? (
              sortedReservations.map((reserva) => (
                <TableRow key={reserva.id}>
                  <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                    {dayjs(reserva.start_time)
                      .locale("es")
                      .format("dddd")
                      .replace(/^\w/, (c) => c.toUpperCase())}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {dayjs(reserva.start_time).format("DD/MM/YY [-] HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {`${reserva.usuario_firstname || ""} ${
                      reserva.usuario_lastname || ""
                    }`.trim() || "N/A"}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                    {reserva.consultorio_nombre ||
                      `ID: ${reserva.consultorio_id}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reserva.estado} className="capitalize text-xs">
                      {reserva.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={reserva.tipo_reserva.toLowerCase()} className="text-xs">
                      {reserva.tipo_reserva}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {reserva.usaCamilla && camillaIcon && (
                      <img
                        src={camillaIcon}
                        alt="Icono de Camilla"
                        className="w-4 h-5 sm:w-5 sm:h-6"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden xl:table-cell">
                    {dayjs(reserva.created_at).format("DD/MM/YY [-] HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(reserva)}
                      className="text-xs h-8"
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-xs sm:text-sm">
                  No se encontraron reservas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center pt-2 sm:pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={handlePreviousPage}
                  aria-disabled={currentPage === 1}
                  className={cn(
                    "text-xs sm:text-sm h-8 sm:h-9",
                    currentPage === 1
                      ? "pointer-events-none opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  )}
                />
              </PaginationItem>

              {/* Indicador de página actual */}
              <PaginationItem>
                <PaginationLink
                  isActive
                  className="w-auto min-w-0 px-2 py-1 text-xs sm:text-sm"
                >
                  {currentPage} de {totalPages}
                </PaginationLink>
              </PaginationItem>
              {/* Podrías añadir lógica aquí para mostrar más números si lo deseas */}

              <PaginationItem>
                <PaginationNext
                  onClick={handleNextPage}
                  aria-disabled={currentPage === totalPages}
                  className={cn(
                    "text-xs sm:text-sm h-8 sm:h-9",
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {isEventDialogOpen && (
        <EventDialog
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          selectedEvent={selectedEventForDialog}
        />
      )}

    </div>
  );
};

// --- Componente para cabeceras de tabla ordenables ---
function SortableTableHead({
  label,
  field,
  currentSortField,
  sortDirection,
  onSort,
  className = "",
}) {
  const isActive = currentSortField === field;

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors text-xs sm:text-sm",
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );
}

function DateRangePicker({ date, onDateChange }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal whitespace-normal text-xs sm:text-sm h-9 sm:h-10",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          {date?.from ? (
            date.to ? (
              <span className="truncate">
                {format(date.from, "dd/MM/yyyy", { locale: es })} -{" "}
                {format(date.to, "dd/MM/yyyy", { locale: es })}
              </span>
            ) : (
              format(date.from, "dd/MM/yyyy")
            )
          ) : (
            <span>Elige un rango</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={onDateChange}
          numberOfMonths={1}
          locale={es}
          className="sm:block"
        />
      </PopoverContent>
    </Popover>
  );
}

export default ReservationsManagementPage;
