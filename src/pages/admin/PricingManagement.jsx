import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  fetchAllConsultorios,
  updateConsultorioPrice,
} from "@/services/adminService";
import dayjs from "dayjs";

// --- Importaciones de Componentes Shadcn UI ---
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Separator,
} from "@/components/ui";
import { Edit } from "lucide-react";

const PricingManagement = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const [consultorios, setConsultorios] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedConsultorio, setSelectedConsultorio] = useState(null);
  const [newPrice, setNewPrice] = useState("");

  const loadConsultorios = async () => {
    startLoading();
    try {
      const data = await fetchAllConsultorios();
      setConsultorios(data);
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: "No se pudieron cargar los consultorios.",
      });
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    loadConsultorios();
  }, []);

  const openEditModal = (consultorio) => {
    setTimeout(() => {
      setSelectedConsultorio(consultorio);
      setNewPrice(consultorio.precio_hora);
      setIsEditModalOpen(true);
    }, 150);
  };

  const handleUpdatePrice = async () => {
    if (!selectedConsultorio || newPrice === "") return;

    // El usuario ya confirmó su intención.
    // La UI puede ahora mostrar un loading global.
    setIsEditModalOpen(false);

    startLoading();
    try {
      const updatedConsultorio = await updateConsultorioPrice(
        selectedConsultorio.id,
        parseFloat(newPrice)
      );
      // Actualizar la lista localmente para reflejar el cambio al instante
      setConsultorios((prev) =>
        prev.map((c) =>
          c.id === updatedConsultorio.id ? updatedConsultorio : c
        )
      );
      showToast({
        type: "success",
        title: "Éxito",
        message: `Precio del ${updatedConsultorio.nombre} actualizado.`,
      });
    } catch (error) {
      showToast({ type: "error", title: "Error", message: error.message });
    } finally {
      stopLoading();
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Gestión de Precios</h1>
        <p className="text-muted-foreground">
          Define y actualiza los precios por hora de los consultorios.
        </p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Precios de Consultorios</CardTitle>
          <CardDescription>
            Visualiza y edita los precios de los consultorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre del Consultorio</TableHead>
                  <TableHead>Precio por Hora Actual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && consultorios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : (
                  consultorios.map((consultorio) => (
                    <TableRow key={consultorio.id}>
                      <TableCell>{consultorio.id}</TableCell>
                      <TableCell className="font-medium">
                        {consultorio.nombre}
                      </TableCell>
                      <TableCell className="font-bold">
                        ${consultorio.precio_hora}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(consultorio)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Precio
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal para Editar Precio */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar Precio de {selectedConsultorio?.nombre}
            </DialogTitle>
            <DialogDescription>
              Introduce el nuevo precio por hora. Este cambio se aplicará a
              todas las nuevas facturas generadas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-1">
            <Label htmlFor="newPrice">Nuevo Precio por Hora ($)</Label>
            <Input
              id="newPrice"
              type="number"
              step="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Ej: 250"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={handleUpdatePrice} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Nuevo Precio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingManagement;
