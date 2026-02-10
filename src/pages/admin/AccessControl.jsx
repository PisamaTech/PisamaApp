import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchAccessLogs,
  AccessMatchStatus,
} from "@/services/accessControlService";
import { fetchAllUsers } from "@/services/adminService";
import { UserCombobox } from "@/components/admin/UserCombobox";
import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const TIMEZONE = "America/Montevideo";

// Helper para formatear fecha con día capitalizado
const formatAccessDate = (date) => {
  const formatted = dayjs(date).tz(TIMEZONE).format("ddd D/M/YYYY - HH:mm");
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Componentes UI
import {
  Button,
  Badge,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Calendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Filter,
  CalendarIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Rangos predeterminados
const DATE_PRESETS = [
  { label: "Último día", days: 1 },
  { label: "Últimos 7 días", days: 7 },
  { label: "Últimos 15 días", days: 15 },
  { label: "Últimos 30 días", days: 30 },
];

const AccessControlPage = () => {
  const navigate = useNavigate();
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  // Estados de datos
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [allUsers, setAllUsers] = useState([]);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Estados de filtros
  const [filters, setFilters] = useState({
    userId: "todos",
    status: "todos",
    notified: "todos",
    dateRange: { from: undefined, to: undefined },
    mariOnly: false,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Estados de ordenamiento
  const [sortField, setSortField] = useState("access_time");
  const [sortDirection, setSortDirection] = useState("desc");

  const totalPages = useMemo(
    () => Math.ceil(totalLogs / itemsPerPage),
    [totalLogs, itemsPerPage],
  );

  // Cargar usuarios para el filtro
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await fetchAllUsers(1, 1000);
        setAllUsers(data);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
      }
    };
    loadUsers();
  }, []);

  // Cargar logs
  useEffect(() => {
    const loadLogs = async () => {
      startLoading();
      try {
        const { data, count } = await fetchAccessLogs(
          currentPage,
          itemsPerPage,
          appliedFilters,
        );
        setLogs(data);
        setTotalLogs(count);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: "No se pudieron cargar los registros de acceso.",
        });
      } finally {
        stopLoading();
      }
    };
    loadLogs();
  }, [currentPage, appliedFilters, itemsPerPage]);

  // Handlers de filtros
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
      notified: "todos",
      dateRange: { from: undefined, to: undefined },
      mariOnly: false,
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handlePresetClick = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters((prev) => ({ ...prev, dateRange: { from, to } }));
  };

  const handleMariFilterToggle = () => {
    setFilters((prev) => ({ ...prev, mariOnly: !prev.mariOnly }));
  };

  // Handlers de paginación
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Handler de ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Ordenar logs localmente
  const sortedLogs = useMemo(() => {
    if (!sortField) return logs;
    return [...logs].sort((a, b) => {
      let valueA, valueB;
      switch (sortField) {
        case "access_time":
          valueA = new Date(a.access_time).getTime();
          valueB = new Date(b.access_time).getTime();
          break;
        case "access_name":
          valueA = a.access_name?.toLowerCase() || "";
          valueB = b.access_name?.toLowerCase() || "";
          break;
        case "status":
          valueA = a.status || "";
          valueB = b.status || "";
          break;
        default:
          return 0;
      }
      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [logs, sortField, sortDirection]);

  // Componente SortableTableHead
  const SortableTableHead = ({ label, field }) => {
    const isActive = sortField === field;
    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </div>
      </TableHead>
    );
  };

  // Badge de estado
  const getStatusBadge = (status) => {
    switch (status) {
      case AccessMatchStatus.VALID:
      case "valido":
        return (
          <Badge
            variant="success"
            className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 border-none"
          >
            <CheckCircle2 className="h-3 w-3" /> Válido
          </Badge>
        );
      case AccessMatchStatus.NO_RESERVATION:
      case "sin_reserva":
        return (
          <Badge
            variant="warning"
            className="gap-1 bg-orange-100 text-orange-800 hover:bg-orange-100 border-none"
          >
            <AlertTriangle className="h-3 w-3" /> Sin Reserva
          </Badge>
        );
      case AccessMatchStatus.UNMATCHED:
      case "sin_match":
        return (
          <Badge variant="destructive" className="gap-1">
            <UserX className="h-3 w-3" /> Sin Match
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Componente DateRangePicker
  const DateRangePicker = ({ date, onDateChange }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date?.from && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yy", { locale: es })} -{" "}
                  {format(date.to, "dd/MM/yy", { locale: es })}
                </>
              ) : (
                format(date.from, "dd/MM/yy", { locale: es })
              )
            ) : (
              <span>Rango personalizado</span>
            )}
          </span>
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
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Control de Acceso</h1>
          <p className="text-muted-foreground">
            Historial de accesos registrados en el sistema.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => navigate("/admin/access-control/import")}
          >
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => navigate("/admin/access-notifications")}
          >
            <AlertTriangle className="h-4 w-4" />
            Ver Infracciones
          </Button>
        </div>
      </div>
      <Separator />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rangos predeterminados */}
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
            <Separator orientation="vertical" className="h-8" />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMariFilterToggle}
              className={cn(
                "transition-all",
                filters.mariOnly
                  ? "bg-indigo-500 hover:bg-indigo-700 text-white border-transparent shadow-sm"
                  : "text-indigo-600 border-indigo-200 bg-indigo-100 hover:bg-indigo-200 hover:text-indigo-700 hover:border-indigo-300",
              )}
            >
              Solo Mari
            </Button>
          </div>

          {/* Filtros principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-center">
            <DateRangePicker
              date={filters.dateRange}
              onDateChange={(range) => handleFilterChange("dateRange", range)}
            />
            <UserCombobox
              users={allUsers}
              selectedUserId={filters.userId}
              onSelect={(id) => handleFilterChange("userId", id)}
            />
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="valido">Válido</SelectItem>
                <SelectItem value="sin_reserva">Sin Reserva</SelectItem>
                <SelectItem value="sin_match">Sin Match</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.notified}
              onValueChange={(value) => handleFilterChange("notified", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Notificado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Notificado</SelectItem>
                <SelectItem value="no">No notificado</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                Buscar
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="flex-1"
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de resultados */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Registros ({totalLogs})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Cargando registros...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tabla Desktop */}
              <div className="hidden md:block border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        label="Fecha/Hora"
                        field="access_time"
                      />
                      <SortableTableHead
                        label="Nombre (Sistema)"
                        field="access_name"
                      />
                      <TableHead>Usuario (App)</TableHead>
                      <TableHead>Reserva</TableHead>
                      <SortableTableHead label="Estado" field="status" />
                      <TableHead>Notificado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLogs.length > 0 ? (
                      sortedLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {formatAccessDate(log.access_time)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.access_name}
                          </TableCell>
                          <TableCell>
                            {log.usuario ? (
                              `${log.usuario.firstName} ${log.usuario.lastName}`
                            ) : (
                              <span className="text-muted-foreground italic">
                                No vinculado
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.reservation ? (
                              <span>
                                {dayjs(log.reservation.start_time)
                                  .tz(TIMEZONE)
                                  .format("HH:mm")}{" "}
                                - {log.reservation.consultorio_nombre}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>
                            {log.notified ? (
                              <Badge variant="outline" className="gap-1">
                                <Bell className="h-3 w-3" /> Sí
                              </Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No hay registros con los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Vista Móvil */}
              <div className="md:hidden space-y-4">
                {sortedLogs.length > 0 ? (
                  sortedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg space-y-2 border"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{log.access_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatAccessDate(log.access_time)}
                          </p>
                        </div>
                        {getStatusBadge(log.status)}
                      </div>
                      {log.usuario && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">
                            Usuario:
                          </span>{" "}
                          {log.usuario.firstName} {log.usuario.lastName}
                        </p>
                      )}
                      {log.reservation && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">
                            Reserva:
                          </span>{" "}
                          {dayjs(log.reservation.start_time)
                            .tz(TIMEZONE)
                            .format("HH:mm")}{" "}
                          - {log.reservation.consultorio_nombre}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Notificado:
                        </span>
                        {log.notified ? (
                          <Badge variant="outline" className="gap-1">
                            <Bell className="h-3 w-3" /> Sí
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay registros con los filtros seleccionados.
                  </div>
                )}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={handlePreviousPage}
                          className={cn(
                            "cursor-pointer",
                            currentPage === 1 &&
                              "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink isActive>
                          {currentPage} / {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={handleNextPage}
                          className={cn(
                            "cursor-pointer",
                            currentPage === totalPages &&
                              "pointer-events-none opacity-50",
                          )}
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
  );
};

export default AccessControlPage;
