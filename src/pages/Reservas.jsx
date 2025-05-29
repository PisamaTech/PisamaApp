// src/pages/Reservas.jsx (Ejemplo)
import React, { useState, useEffect, useMemo } from "react"; // Importa useMemo
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchUserReservations } from "@/supabase/reservationService";
import {
  ReservationStatus,
  ReservationType,
  resources,
} from "@/utils/constants";

// --- Importaciones para Date Range Picker ---
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// --- Fin de importaciones para Date Range Picker ---

// --- Importaciones para Paginación ---
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
// --- Fin de importaciones para Paginación ---

import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import camillaIcon from "../assets/massage-table-50.png";

export const Reservas = () => {
  const { profile } = useAuthStore();
  const userId = profile?.id;

  const { loading, error, startLoading, stopLoading, setError, clearError } =
    useUIStore();

  // Calcula el inicio y fin del mes actual para los filtros iniciales
  const startOfMonth = dayjs().startOf("month").toDate();
  const endOfMonth = dayjs().endOf("month").toDate();

  const defaultFiltersState = {
    dateRange: { from: startOfMonth, to: endOfMonth },
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
  const [itemsPerPage, setItemsPerPage] = useState(10); // Puedes ajustar esto
  const [totalReservations, setTotalReservations] = useState(0);
  // --- Fin Estados de Paginación ---

  // Calcula el número total de páginas
  const totalPages = useMemo(
    () => Math.ceil(totalReservations / itemsPerPage),
    [totalReservations, itemsPerPage]
  );

  // --- Lógica para manejar cambios en los filtros (sin cambios) ---
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

  // --- Efecto para cargar reservas ---
  useEffect(() => {
    const loadReservations = async () => {
      if (!userId) return;

      clearError();
      startLoading();

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
    <div className="container mx-auto p-4 space-y-4 w-full">
      <h1 className="text-2xl font-bold text-gray-800 text-center">
        Mis Reservas
      </h1>
      <Separator />

      {/* Sección de Filtros (sin cambios) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrar Reservas</CardTitle>
        </CardHeader>
        <CardContent>
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
                      "w-full justify-start text-left font-normal",
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
              <Select value={filters.status} onValueChange={handleStatusChange}>
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
          <CardTitle className="text-lg">Lista de Reservas</CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Consultorio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Camilla</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservas.map((reserva) => (
                    <TableRow key={reserva.id}>
                      <TableCell>
                        {dayjs(reserva.start_time)
                          .locale("es")
                          .format("dddd")
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </TableCell>
                      <TableCell>
                        {dayjs(reserva.start_time).format("DD/MM/YYYY")}
                      </TableCell>
                      <TableCell>{`${dayjs(reserva.start_time).format(
                        "HH:mm"
                      )} - ${dayjs(reserva.end_time).format(
                        "HH:mm"
                      )}`}</TableCell>
                      <TableCell>
                        Consultorio {reserva.consultorio_id}
                      </TableCell>
                      <TableCell>{reserva.tipo_reserva}</TableCell>
                      <TableCell>
                        <Badge variant={reserva.estado.toLowerCase()}>
                          {reserva.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reserva.usaCamilla && (
                          <img
                            src={camillaIcon}
                            alt="Icono de Camilla"
                            className="w-5 h-6"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <span>Acciones...</span> {/* Placeholder */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {/* Implementar Modales/Sheets para Cancelación o Ver Detalles aquí */}
    </div>
  );
};
