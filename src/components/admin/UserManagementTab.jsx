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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const UserManagementTab = () => {
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
      } catch (error) {
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
    } catch (error) {
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
    <div className="space-y-4">
      <div className="flex items-center">
        <Input
          placeholder="Buscar por nombre, apellido o email..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Modalidad de Pago</TableHead>
              <TableHead>Rol</TableHead>
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
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.modalidad_pago}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(user)}>
                          Editar Modalidad de Pago
                        </DropdownMenuItem>
                        {/* Aquí podrías añadir más acciones futuras */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron usuarios.
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

export default UserManagementTab;
