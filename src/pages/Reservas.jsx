import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom"; // Para navegar al reagendar
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchUserReservations,
  cancelBooking as cancelBookingService, // Renombrar para evitar conflicto
  cancelRecurringSeries,
} from "@/supabase/reservationService";
import { useEventStore } from "@/stores/calendarStore"; // Para actualizar eventos
import { EventDialog } from "@/components/EventDialog";
import {
  ReservationStatus,
  ReservationType,
  resources,
} from "@/utils/constants";

// --- Importaciones para Date Range Picker ---
import { CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@/components/ui";
import {} from "@/components/ui/button";
import {} from "@/components/ui/label";
import {} from "@/components/ui/card";
import {} from "@/components/ui/table";
import {} from "@/components/ui/badge";
import camillaIcon from "../assets/massage-table-50.png";
import { ConfirmCancelDialog } from "@/components/ConfirmEventDialog";
import { mapReservationToEvent } from "@/utils/calendarUtils";
import ReservaRow from "@/components/ReservaRow";

// --- Componente para cabeceras de tabla ordenables ---
function SortableTableHead({
  label,
  field,
  currentSortField,
  sortDirection,
  onSort,
}) {
  const isActive = currentSortField === field;

  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );
}

export const Reservas = () => {
  const { profile } = useAuthStore();
  const userId = profile?.id;
  const navigate = useNavigate();
  const {
    loading,
    error,
    startLoading,
    stopLoading,
    setError,
    clearError,
    showToast,
    startReagendamientoMode,
    isReagendamientoMode,
  } = useUIStore();
  const { updateEvent } = useEventStore();

  // --- Estados para Modales de Confirmación y Acción ---
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [selectedReservationForAction, setSelectedReservationForAction] =
    useState(null);
  const [cancelActionTypeForModal, setCancelActionTypeForModal] =
    useState(null); // 'single' o 'series'

  // --- Estados para manejar el EventDialog ---
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEventForDialog, setSelectedEventForDialog] = useState(null);
  // --- Función para abrir el diálogo de detalles ---
  const handleViewDetails = (reserva) => {
    // La 'reserva' de la tabla ya tiene el formato de la BD.
    // Necesitamos formatearla al formato que espera EventDialog (y react-big-calendar).
    // Esta lógica debe ser consistente con la que usas en el Dashboard.
    setTimeout(() => {
      const formattedEvent = {
        ...reserva,
        start_time: new Date(reserva.start_time),
        end_time: new Date(reserva.end_time),
        consultorio_id: reserva.consultorio_id,
        tipo_reserva: reserva.tipo_reserva,
      };
      setSelectedEventForDialog(formattedEvent);
      setIsEventDialogOpen(true);
    }, 150);
  };

  // --- Funciones Handler para Acciones ---
  const openCancelModal = (reserva, actionType) => {
    setTimeout(() => {
      setSelectedReservationForAction(reserva);
      setCancelActionTypeForModal(actionType);
      setIsConfirmCancelOpen(true);
    }, 150);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReservationForAction || !cancelActionTypeForModal || !userId)
      return;

    clearError();
    startLoading("Cancelando...");
    setIsConfirmCancelOpen(false);

    try {
      let result; // Puede ser una o varias reservas actualizadas
      if (cancelActionTypeForModal === "single") {
        result = await cancelBookingService(
          selectedReservationForAction.id,
          userId,
          profile?.role
        );
      } else if (cancelActionTypeForModal === "series") {
        // const currentDateForCancellation = dayjs().toDate(); // Fecha actual para la solicitud
        result = await cancelRecurringSeries(
          selectedReservationForAction.recurrence_id,
          selectedReservationForAction.usuario_id, // seriesOwnerId
          userId, // requestingUserId
          profile?.role, // requestingUserRole
          selectedReservationForAction.start_time
        );
      }

      if (result && result.updatedBookings) {
        // 1. Actualiza el store
        result.updatedBookings.forEach((booking) => {
          const formattedEvent = mapReservationToEvent(booking);
          updateEvent(formattedEvent);
        });

        // 2. Muestra el toast específico
        let toastTitle = "Acción Completada";
        let toastMessage = "La operación se realizó con éxito.";

        switch (result.actionType) {
          case "PENALIZED":
            toastTitle = "Reserva Penalizada";
            toastMessage =
              "Cancelaste con menos de 24hs. La reserva fue PENALIZADA, por lo que deberás pagarla. Pero puedes reagendarla por un plazo de 6 días a partir de la fecha de la reserva original, sin costo adicional.";
            break;
          case "CANCELLED":
            toastTitle = "Reserva Cancelada";
            toastMessage =
              "La reserva ha sido cancelada correctamente sin penalización.";
            break;
          case "RESCHEDULE_REVERTED":
            toastTitle = "Reagendamiento Cancelado";
            toastMessage =
              "Se canceló la reserva reagendada. La reserva original que fue PENALIZADA ha sido reactivada, por lo que puedes volver a reagendarla por un plazo de 6 días a partir de la fecha de la reserva original, sin costo adicional.";
            break;
          case "SERIES_CANCELLED_WITH_PENALTY":
            toastTitle = "Serie Cancelada con Penalización";
            toastMessage =
              "La serie fue cancelada. La primera reserva fue PENALIZADA, por haberla cancelado con menos de 24 horas de anticipación. El resto de las reservas fueron CANCELADAS sin costo.";
            break;
          case "SERIES_CANCELLED":
            toastTitle = "Serie Cancelada";
            toastMessage =
              "Toda la serie de reservas ha sido cancelada correctamente.";
            break;
          case "NO_FUTURE_BOOKINGS":
            toastTitle = "Información";
            toastMessage =
              "No se encontraron reservas futuras activas en esta serie para cancelar.";
            break;
        }
        showToast({
          type: "success",
          title: toastTitle,
          message: toastMessage,
        });
      }
      const { data, count } = await fetchUserReservations(
        userId,
        appliedFilters,
        currentPage,
        itemsPerPage
      );
      setReservas(data);
      setTotalReservations(count);
    } catch (error) {
      setError(error); // Usa el setError global
      showToast({
        type: "error",
        title: "Error en la Cancelación",
        message: error.message || "Ocurrió un error al intentar cancelar.",
      });
    } finally {
      stopLoading();
      setSelectedReservationForAction(null);
      setCancelActionTypeForModal(null);
      // Signal dialog to close. Cleanup will be handled by handleModalOpenChange.
    }
  };

  const handleReagendarClick = (reservaPenalizada) => {
    // 1. Activa el modo reagendamiento en el store global y guarda la reserva
    startReagendamientoMode(reservaPenalizada);

    // 2. Navega a la vista del calendario principal
    navigate("/calendario_diario");
  };

  // Mensaje para el modal de confirmación de cancelación
  const getCancelConfirmationMessage = () => {
    if (!selectedReservationForAction) return "";

    if (cancelActionTypeForModal === "single") {
      return {
        action: "single",
        message: (
          <p className="text-sm">
            ¿Estás seguro de cancelar la reserva del <br />
            <span className="font-bold">
              {dayjs(selectedReservationForAction.start_time)
                .format("dddd[ - ]")
                .toLocaleUpperCase()}
              {dayjs(selectedReservationForAction.start_time).format(
                "DD/MM/YYYY[ - ]"
              )}
              {dayjs(selectedReservationForAction.start_time).format(
                "HH:mm[hs - ]"
              )}
              {"Consultorio " + selectedReservationForAction.consultorio_id}?
            </span>
            <br />
            <span className="text-xs text-gray-500">
              (Si cancelas con menos de 24hs de antelación, deberás pagar por la
              reserva, pero podrás reagendarla por un plazo de 6 días, a partir
              de la reserva original)
            </span>
          </p>
        ),
      };
    }
    if (cancelActionTypeForModal === "series") {
      // Aquí podrías querer mostrar el conteo de futuras reservas si lo obtienes
      return {
        action: "series",
        message: (
          <p className="text-sm">
            ¿Estás seguro de cancelar TODAS las reservas futuras de esta reserva
            FIJA, comenzando desde la reserva del{" "}
            <span className="font-bold">
              {dayjs(selectedReservationForAction.start_time)
                .locale("es")
                .format("dddd DD/MM/YYYY HH:mm")}
            </span>
            ?
            <br />
            <span className="text-xs text-gray-500 mt-1 block">
              (La primera reserva de la serie podría ser penalizada si su
              cancelación es con menos de 24hs de antelación.)
            </span>
          </p>
        ),
      };
    }
    return "";
  };
  // --- Funciones Handler para manejo de filtros y paginación ---

  // Calcula el inicio y fin de la semana actual para los filtros iniciales
  const startOfWeek = dayjs().startOf("week").toDate();
  const endOfWeek = dayjs().endOf("week").toDate();

  const defaultFiltersState = {
    dateRange: { from: startOfWeek, to: endOfWeek },
    status: "Todos",
    consultorioId: "Todos",
    reservationType: "Todos",
  };

  // Estado para los filtros seleccionados en la UI
  const [filters, setFilters] = useState(defaultFiltersState);
  // Estado para los filtros que se usaron en la última búsqueda
  const [appliedFilters, setAppliedFilters] = useState(defaultFiltersState);

  const [reservas, setReservas] = useState([]);
  // --- Estados de Paginación ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Puedes ajustar esto
  const [totalReservations, setTotalReservations] = useState(0);
  // --- Fin Estados de Paginación ---

  // --- Estados para el ordenamiento ---
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" o "desc"

  // Calcula el número total de páginas
  const totalPages = useMemo(
    () => Math.ceil(totalReservations / itemsPerPage),
    [totalReservations, itemsPerPage]
  );

  // --- Lógica para manejar cambios en los filtros ---
  const handleDateRangeChange = (range) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  };
  const handleStatusChange = (value) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };
  const handleConsultorioChange = (value) => {
    setFilters((prev) => ({ ...prev, consultorioId: value }));
  };
  const handleTypeChange = (value) => {
    setFilters((prev) => ({ ...prev, reservationType: value }));
  };

  // --- Función para manejar el clic en el botón "Buscar" ---
  const handleSearch = () => {
    setCurrentPage(1); // Resetea a la página 1 al buscar
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setCurrentPage(1); // Resetea a la página 1 al limpiar filtros
    setFilters(defaultFiltersState);
    setAppliedFilters(defaultFiltersState);
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
    if (!sortField) return reservas;

    const sorted = [...reservas].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "fecha":
        case "hora":
          // Ambos ordenan por start_time
          aValue = new Date(a.start_time);
          bValue = new Date(b.start_time);
          break;
        case "consultorio":
          aValue = (a.consultorio_nombre || a.consultorio_id || "").toString().toLowerCase();
          bValue = (b.consultorio_nombre || b.consultorio_id || "").toString().toLowerCase();
          break;
        case "tipo":
          aValue = (a.tipo_reserva || "").toLowerCase();
          bValue = (b.tipo_reserva || "").toLowerCase();
          break;
        case "estado":
          aValue = (a.estado || "").toLowerCase();
          bValue = (b.estado || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [reservas, sortField, sortDirection]);

  // --- Efecto para cargar reservas ---
  useEffect(() => {
    const loadReservations = async () => {
      if (!userId) return;

      clearError();
      startLoading("Cargando reservas...");

      try {
        // Pasa currentPage e itemsPerPage al servicio
        const { data, count } = await fetchUserReservations(
          userId,
          appliedFilters,
          currentPage,
          itemsPerPage
        );
        setReservas(data);
        setTotalReservations(count); // Guarda el conteo total
      } catch (err) {
        setError(err);
        setReservas([]);
        setTotalReservations(0); // Resetea el conteo en caso de error
      } finally {
        stopLoading();
      }
    };

    loadReservations();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, appliedFilters, currentPage, itemsPerPage]); // Dependencias: userId, appliedFilters, currentPage, itemsPerPage

  // --- Funciones para manejar cambio de página ---
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1)); // No ir por debajo de 1
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages)); // No ir más allá de totalPages
  };

  // --- Lógica para renderizar la tabla y los filtros ---
  return (
    <>
      <div className="container mx-auto p-4 space-y-4 w-full">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Mis Reservas
        </h1>
        <Separator />

        {/* Sección de Filtros (sin cambios) */}
        <Card>
          <CardHeader>
            <CardTitle className="pb-2 text-xl">Filtrar Reservas</CardTitle>
            <Separator />
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ... Controles de Filtro ... */}
              <div className="flex flex-col space-y-2">
                <Label>Rango de Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal whitespace-break-spaces",
                        !filters.dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "dd/MM/yyyy", {
                              locale: es,
                            })}{" "}
                            -{" "}
                            {format(filters.dateRange.to, "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </>
                        ) : (
                          format(filters.dateRange.from, "dd/MM/yyyy", {
                            locale: es,
                          })
                        )
                      ) : (
                        <span>Selecciona un rango</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange?.from || new Date()}
                      selected={filters.dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por Estado */}
              <div className="flex flex-col space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {Object.values(ReservationStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Consultorio */}
              <div className="flex flex-col space-y-2">
                <Label htmlFor="consultorio">Consultorio</Label>
                <Select
                  value={filters.consultorioId}
                  onValueChange={handleConsultorioChange}
                >
                  <SelectTrigger id="consultorio">
                    <SelectValue placeholder="Selecciona consultorio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={String(resource.id)}>
                        {resource.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Tipo de Reserva */}
              <div className="flex flex-col space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={filters.reservationType}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {Object.values(ReservationType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Botones de Acción de Filtros */}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleResetFilters}>
                Limpiar Filtros
              </Button>
              <Button onClick={handleSearch}>Buscar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Tabla de Reservas */}
        <Card>
          <CardHeader>
            <CardTitle className="pb-2 text-xl">Lista de Reservas</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="py-4">
            {loading && <p className="text-center">Cargando reservas...</p>}
            {error && (
              <p className="text-center text-red-500">
                Error al cargar reservas: {error?.message}
              </p>
            )}
            {!loading && !error && reservas.length === 0 && (
              <p className="text-center text-gray-500">
                No se encontraron reservas con los filtros aplicados.
              </p>
            )}
            {!loading && !error && reservas.length > 0 && (
              <div className="border rounded-md">
                 {/* Desktop View */}
                 <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Día</TableHead>
                          <SortableTableHead
                            label="Fecha"
                            field="fecha"
                            currentSortField={sortField}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                          <SortableTableHead
                            label="Hora"
                            field="hora"
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
                          />
                          <SortableTableHead
                            label="Tipo"
                            field="tipo"
                            currentSortField={sortField}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                          <SortableTableHead
                            label="Estado"
                            field="estado"
                            currentSortField={sortField}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                          <TableHead>Camilla</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedReservations.map((reserva) => (
                          <ReservaRow
                            key={reserva.id}
                            reserva={reserva}
                            camillaIcon={camillaIcon}
                            handleViewDetails={handleViewDetails}
                            openCancelModal={openCancelModal}
                            handleReagendarClick={handleReagendarClick}
                            ReservationStatus={ReservationStatus}
                            ReservationType={ReservationType}
                          />
                        ))}
                      </TableBody>
                    </Table>
                 </div>

                 {/* Mobile View */}
                 <div className="md:hidden space-y-4 p-4">
                    {sortedReservations.map((reserva) => {
                       // Logic to determine if cancellable/reschedulable (similar to ReservaRow/constants)
                       const isCancellable =
                          reserva.estado === ReservationStatus.CONFIRMED ||
                          reserva.estado === ReservationStatus.PENDING;
                       // "Reagendar" usually for penalized bookings.
                       
                       return (
                          <div key={reserva.id} className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300">
                             {/* Header Line */}
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="font-bold text-lg text-slate-900">
                                      {dayjs(reserva.start_time)
                                         .locale("es")
                                         .format("dddd DD/MM")
                                         .replace(/^\w/, (c) => c.toUpperCase())}
                                   </p>
                                   <p className="text-slate-600 font-medium">
                                      {dayjs(reserva.start_time).format("HH:mm")} hs
                                   </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant={reserva.tipo_reserva.toLowerCase()}>
              {reserva.tipo_reserva}
            </Badge>
                                    {/* Status Badge */}
                                    <Badge variant={reserva.estado.toLowerCase()}>
              {reserva.estado}
            </Badge>
                                </div>
                             </div>

                             {/* Location & Extra Info */}
                             <div className="flex justify-between items-center text-sm text-slate-700 border-t border-slate-300 pt-2">
                                <span className="font-medium">{reserva.consultorio_nombre || `Consultorio ${reserva.consultorio_id}`}</span>
                                {reserva.requiere_camilla && (
                                   <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                      <img src={camillaIcon} alt="Camilla" className="w-4 h-4 opacity-70" />
                                      <span className="text-xs">Camilla</span>
                                   </div>
                                )}
                             </div>

                             {/* Actions */}
                             <div className="grid grid-cols-1 gap-2 pt-2">
                                <Button
                                   variant="outline"
                                   size="sm"
                                   className="w-full bg-white hover:bg-slate-50 border-slate-300 text-slate-700"
                                   onClick={() => handleViewDetails(reserva)}
                                >
                                   Ver Detalle
                                </Button>
                                
                                {reserva.estado === ReservationStatus.PENALIZED ? (
                                    <Button
                                       size="sm"
                                       className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none"
                                       onClick={() => handleReagendarClick(reserva)}
                                    >
                                       Reagendar
                                    </Button>
                                ) : isCancellable ? (
                                    <Button
                                       size="sm"
                                       variant="destructive"
                                       className="w-full"
                                       onClick={() => openCancelModal(reserva, "single")}
                                    >
                                       Cancelar
                                    </Button>
                                ) : null}
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Controles de Paginación --- */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePreviousPage();
                    }}
                    aria-disabled={currentPage === 1}
                    tabIndex={currentPage === 1 ? -1 : undefined}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>

                {/* Mostrar números de página */}
                <PaginationItem>
                  <PaginationLink href="#" isActive className="w-14">
                    {currentPage} de {totalPages}
                  </PaginationLink>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNextPage();
                    }}
                    aria-disabled={currentPage === totalPages}
                    tabIndex={currentPage === totalPages ? -1 : undefined}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        {/* --- Fin Controles de Paginación --- */}
        {isEventDialogOpen && (
          <EventDialog
            open={isEventDialogOpen}
            onOpenChange={setIsEventDialogOpen}
            selectedEvent={selectedEventForDialog}
          />
        )}
        {/* Implementación de Modales para Cancelación  */}
      </div>

      {selectedReservationForAction && (
        <ConfirmCancelDialog
          open={isConfirmCancelOpen}
          onOpenChange={setIsConfirmCancelOpen}
          message={getCancelConfirmationMessage()}
          onConfirm={handleConfirmCancel}
          // onCancel={() => {
          //   setIsConfirmCancelOpen(false);
          //   setSelectedReservationForAction(null);
          // }}
        />
      )}
    </>
  );
};
