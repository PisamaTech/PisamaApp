import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useUIStore } from "@/stores/uiStore";

dayjs.locale("es");
import {
  fetchAllUsers,
  fetchAllProfessions,
  updateUserPaymentMethod,
} from "@/services/adminService";
import { updateUserAccessName } from "@/services/accessControlService";
import useDebounce from "@/hooks/useDebounce";

// --- Importaciones de Componentes Shadcn UI ---
import { Input } from "@/components/ui/input";
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
import { Edit, Copy, Check, X, Filter, ChevronDown } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const UserManagementPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms de retraso

  // Estados para filtros
  const [allProfessions, setAllProfessions] = useState([]);
  const [selectedProfessions, setSelectedProfessions] = useState([]);
  const [reservationFilter, setReservationFilter] = useState("all"); // "all" | "with" | "without"

  // Estados para el modal de edición de modalidad de pago
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");

  // Estados para el modal de edición de access_system_name
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);
  const [newAccessName, setNewAccessName] = useState("");

  const totalPages = useMemo(
    () => Math.ceil(totalUsers / itemsPerPage),
    [totalUsers, itemsPerPage]
  );

  // Cargar profesiones al montar el componente
  useEffect(() => {
    const loadProfessions = async () => {
      try {
        const professions = await fetchAllProfessions();
        setAllProfessions(professions);
      } catch {
        console.error("Error al cargar profesiones");
      }
    };
    loadProfessions();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      startLoading();
      try {
        // Convertir el filtro de reservación a boolean o null
        const hasReservation =
          reservationFilter === "all"
            ? null
            : reservationFilter === "with";

        const { data, count } = await fetchAllUsers(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          selectedProfessions,
          hasReservation
        );
        setUsers(data);
        setTotalUsers(count);
      } catch {
        showToast({
          type: "error",
          title: "Error",
          message: "No se pudieron cargar los usuarios.",
        });
      } finally {
        stopLoading();
      }
    };
    loadUsers();
  }, [
    currentPage,
    debouncedSearchTerm,
    itemsPerPage,
    selectedProfessions,
    reservationFilter,
    startLoading,
    stopLoading,
    showToast,
  ]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Resetea a la página 1 al buscar
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const toggleProfession = (profession) => {
    setSelectedProfessions((prev) =>
      prev.includes(profession)
        ? prev.filter((p) => p !== profession)
        : [...prev, profession]
    );
    setCurrentPage(1);
  };

  const clearProfessionFilter = () => {
    setSelectedProfessions([]);
    setCurrentPage(1);
  };

  const handleReservationFilterChange = (value) => {
    setReservationFilter(value);
    setCurrentPage(1);
  };

  const openEditModal = (user) => {
    setTimeout(() => {
      setSelectedUser(user);
      setNewPaymentMethod(user.modalidad_pago);
      setIsModalOpen(true);
    }, 150);
  };

  const handleUpdatePaymentMethod = async () => {
    if (!selectedUser || !newPaymentMethod) return;
    setIsModalOpen(false);
    startLoading();
    try {
      const updatedUser = await updateUserPaymentMethod(
        selectedUser.id,
        newPaymentMethod
      );
      // Actualizar el usuario en la lista local para reflejar el cambio instantáneamente
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      showToast({
        type: "success",
        title: "Éxito",
        message: "Modalidad de pago actualizada.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo actualizar la modalidad.",
      });
    } finally {
      stopLoading();
    }
  };

  const openAccessModal = (user) => {
    setTimeout(() => {
      setSelectedUserForAccess(user);
      setNewAccessName(user.access_system_name || "");
      setIsAccessModalOpen(true);
    }, 150);
  };

  const handleUpdateAccessName = async () => {
    if (!selectedUserForAccess) return;
    setIsAccessModalOpen(false);
    startLoading();
    try {
      const updatedUser = await updateUserAccessName(
        selectedUserForAccess.id,
        newAccessName.trim() || null
      );
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === updatedUser.id
            ? { ...u, access_system_name: updatedUser.access_system_name }
            : u
        )
      );
      showToast({
        type: "success",
        title: "Éxito",
        message: "Nombre de acceso actualizado.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo actualizar el nombre de acceso.",
      });
    } finally {
      stopLoading();
    }
  };

  const copyUserId = async (userId) => {
    try {
      await navigator.clipboard.writeText(userId);
      showToast({
        type: "success",
        title: "Copiado",
        message: "ID copiado al portapapeles.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudo copiar el ID.",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Busca, visualiza y modifica los perfiles de los usuarios.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <Input
            placeholder="Buscar por nombre, apellido o email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full md:max-w-sm"
          />

          {/* Filtro por Profesión */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                {selectedProfessions.length > 0
                  ? `${selectedProfessions.length} profesión(es)`
                  : "Filtrar profesión"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Profesiones</span>
                  {selectedProfessions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearProfessionFilter}
                      className="h-auto py-1 px-2 text-xs"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {allProfessions.length > 0 ? (
                  allProfessions.map((profession) => (
                    <div
                      key={profession}
                      className="flex items-center space-x-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer"
                      onClick={() => toggleProfession(profession)}
                    >
                      <Checkbox
                        checked={selectedProfessions.includes(profession)}
                        onCheckedChange={() => toggleProfession(profession)}
                      />
                      <span className="text-sm">{profession}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-2">
                    No hay profesiones disponibles
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro por Primera Reserva */}
          <Select
            value={reservationFilter}
            onValueChange={handleReservationFilterChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="1ra Reserva" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with">Con reservas</SelectItem>
              <SelectItem value="without">Sin reservas</SelectItem>
            </SelectContent>
          </Select>

          {/* Selector de items por página */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Mostrar:</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:block text-sm text-gray-500 ml-auto">
            Total de usuarios:{" "}
            <span className="font-medium text-gray-900">{totalUsers}</span>
          </div>
        </div>

        {/* Badges de filtros activos */}
        {selectedProfessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedProfessions.map((profession) => (
              <Badge
                key={profession}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => toggleProfession(profession)}
              >
                {profession}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Vista de Escritorio (Tabla) */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nombre Acceso</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Profesión</TableHead>
              <TableHead>Modalidad de Pago</TableHead>
              <TableHead className="text-center">1ra Reserva</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUserId(user.id)}
                            className="h-8 px-2 font-mono text-xs hover:bg-accent"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {user.id.slice(0, 8)}...
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono text-xs">{user.id}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={user.access_system_name ? "" : "text-muted-foreground italic"}>
                        {user.access_system_name || "Sin asignar"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAccessModal(user)}
                        className="h-8 w-8 p-0 hover:bg-accent"
                        title="Editar nombre de acceso"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{user.phone || "N/A"}</TableCell>
                  <TableCell>{user.profession || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {user.modalidad_pago}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="h-8 w-8 p-0 hover:bg-accent"
                        title="Editar modalidad de pago"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {user.ha_reservado_antes ? (
                      <Check className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {dayjs(user.created_at).format("DD/MM/YYYY")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No se encontraron usuarios.
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
        ) : users.length > 0 ? (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm text-slate-600 font-medium break-all">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {user.ha_reservado_antes ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-medium">Reservó</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-500">
                      <X className="h-4 w-4" />
                      <span className="text-xs">Sin reservas</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-slate-700 border-t border-slate-300 pt-3">
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        ID Usuario
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyUserId(user.id)}
                        className="h-auto px-0 py-1 font-mono text-xs hover:bg-transparent hover:text-slate-600"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {user.id.slice(0, 12)}...
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        Nombre Acceso
                      </p>
                      <p className={`font-medium ${user.access_system_name ? "" : "text-slate-400 italic"}`}>
                        {user.access_system_name || "Sin asignar"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAccessModal(user)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Teléfono
                  </p>
                  <p className="font-medium truncate">{user.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Profesión
                  </p>
                  <p className="font-medium truncate">
                    {user.profession || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-300 mt-2">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    Modalidad Pago
                  </p>
                  <Badge
                    variant="outline"
                    className="capitalize bg-white border-slate-300 text-slate-700"
                  >
                    {user.modalidad_pago}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(user)}
                  className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No se encontraron usuarios.
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

      {/* Modal para Editar Modalidad de Pago */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Modalidad de Pago</DialogTitle>
            <DialogDescription>
              Cambia el ciclo de facturación para {selectedUser?.firstName}{" "}
              {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="paymentMethod">Nueva Modalidad</Label>
            <Select
              value={newPaymentMethod}
              onValueChange={setNewPaymentMethod}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecciona una modalidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensual">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePaymentMethod} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Nombre de Acceso */}
      <Dialog open={isAccessModalOpen} onOpenChange={setIsAccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nombre de Acceso</DialogTitle>
            <DialogDescription>
              Asigna el nombre que usa {selectedUserForAccess?.firstName}{" "}
              {selectedUserForAccess?.lastName} en el sistema de control de acceso del portero.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="accessName">Nombre en Sistema de Acceso</Label>
            <Input
              id="accessName"
              value={newAccessName}
              onChange={(e) => setNewAccessName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
            <p className="text-xs text-muted-foreground">
              Deja vacío para quitar la asignación.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccessModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateAccessName} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
