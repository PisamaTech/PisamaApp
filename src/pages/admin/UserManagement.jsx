import { useState, useEffect, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchAllUsers,
  updateUserPaymentMethod,
} from "@/services/adminService";
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
import { Edit } from "lucide-react";
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

const UserManagementPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms de retraso

  // Estados para el modal de edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");

  const totalPages = useMemo(
    () => Math.ceil(totalUsers / itemsPerPage),
    [totalUsers, itemsPerPage]
  );

  useEffect(() => {
    const loadUsers = async () => {
      startLoading();
      try {
        const { data, count } = await fetchAllUsers(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm
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
    startLoading,
    stopLoading,
    showToast,
  ]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Resetea a la página 1 al buscar
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

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Busca, visualiza y modifica los perfiles de los usuarios.
        </p>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por nombre, apellido o email..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full md:max-w-sm"
        />
        <div className="hidden md:block text-sm text-gray-500">
          Total de usuarios:{" "}
          <span className="font-medium text-gray-900">{totalUsers}</span>
        </div>
      </div>

      {/* Vista de Escritorio (Tabla) */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Profesión</TableHead>
              <TableHead>Fecha de Ingreso</TableHead>
              <TableHead>Modalidad de Pago</TableHead>
              <TableHead>Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "N/A"}</TableCell>
                  <TableCell>{user.profession || "N/A"}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
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
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                  className="capitalize shrink-0 ml-2 shadow-sm"
                >
                  {user.role}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-slate-700 border-t border-slate-300 pt-3">
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
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Fecha de Ingreso
                  </p>
                  <p className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
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
    </div>
  );
};

export default UserManagementPage;
