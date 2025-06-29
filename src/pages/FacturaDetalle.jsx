import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchInvoiceDetails } from "@/services/billingService";

// --- Importaciones de Componentes Shadcn UI ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

dayjs.locale("es");
dayjs.extend(isoWeek);

export const FacturaDetalle = () => {
  const { id } = useParams();
  const { profile } = useAuthStore();
  const userId = profile?.id;

  const { loading, error, startLoading, stopLoading, setError, clearError } =
    useUIStore();
  const [invoiceData, setInvoiceData] = useState(null);

  // --- Lógica para renderizar colores de fondo en la factura ---
  let lastWeekNumber = null; // Variable para rastrear la última semana procesada
  let useFirstColor = true; // Booleano para alternar el color
  const color1 = "bg-emerald-100";
  const color2 = "bg-orange-100";

  useEffect(() => {
    if (!userId || !id) return;

    const loadDetails = async () => {
      clearError();
      startLoading();
      try {
        const data = await fetchInvoiceDetails(id, userId);
        setInvoiceData(data);
      } catch (err) {
        setError(err);
        console.error("Error al cargar detalles de la factura:", err);
      } finally {
        stopLoading();
      }
    };

    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, id]);

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

  if (loading) {
    return (
      <div className="container mx-auto p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-xl text-red-600">Error al Cargar la Factura</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/facturacion">Volver al Historial</Link>
        </Button>
      </div>
    );
  }

  if (!invoiceData) {
    return null; // O un mensaje de "No se encontraron datos"
  }

  const { factura, detalles } = invoiceData;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <Button asChild variant="outline" size="sm" className="mb-4">
        <Link to="/facturas">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Historial
        </Link>
      </Button>

      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Detalle de Factura #{factura.id}
              </CardTitle>
              <CardDescription>
                Nombre:{` ${profile.firstName} ${profile.lastName}`}
                <br />
                Período: {dayjs(factura.periodo_inicio).format(
                  "DD/MM/YYYY"
                )} - {dayjs(factura.periodo_fin).format("DD/MM/YYYY")}.
              </CardDescription>
            </div>
            <Badge
              variant={getStatusVariant(factura.estado)}
              className="text-lg"
            >
              {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen de Montos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Monto Base</p>
              <p className="text-2xl font-semibold">
                ${factura.monto_base.toLocaleString("es-UY")}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Descuentos</p>
              <p className="text-2xl font-semibold text-green-600">
                -${factura.monto_descuento.toLocaleString("es-UY")}
              </p>
            </div>
            <div className="p-4 bg-primary text-primary-foreground rounded-lg">
              <p className="text-sm">TOTAL A PAGAR</p>
              <p className="text-2xl font-bold">
                ${factura.monto_total.toLocaleString("es-UY")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Tabla de Detalle */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Reservas Incluidas</h3>
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Consultorio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Costo Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles.map((detalle, index) => {
                    // 1. Obtener el número de la semana para la reserva actual
                    const currentWeekNumber = dayjs(
                      detalle.reservas.start_time
                    ).isoWeek();

                    // 2. Comprobar si la semana ha cambiado
                    // Se activa en la primera fila (index === 0) o cuando la semana cambia
                    if (index === 0) {
                      // Iniciamos con el primer elemento usando el primer color
                      lastWeekNumber = currentWeekNumber;
                      useFirstColor = true;
                    } else if (currentWeekNumber !== lastWeekNumber) {
                      // Si la semana es diferente a la anterior, invertimos el color
                      useFirstColor = !useFirstColor;
                      // Y actualizamos la última semana vista
                      lastWeekNumber = currentWeekNumber;
                    }

                    // 3. Determinar la clase de color
                    const rowClassName = useFirstColor ? color1 : color2;
                    return (
                      <TableRow key={detalle.id} className={rowClassName}>
                        <TableCell>
                          {dayjs(detalle.reservas.start_time)
                            .locale("es")
                            .format("dddd")
                            .replace(/^\w/, (c) => c.toUpperCase())}
                        </TableCell>
                        <TableCell>
                          {dayjs(detalle.reservas.start_time).format(
                            "DD/MM/YYYY"
                          )}
                        </TableCell>
                        <TableCell>
                          {`${dayjs(detalle.reservas.start_time).format(
                            "HH:mm"
                          )}`}
                        </TableCell>
                        <TableCell>
                          {detalle.reservas.consultorios.nombre}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={detalle.reservas.tipo_reserva.toLowerCase()}
                          >
                            {detalle.reservas.tipo_reserva}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-red-600">
                          -$
                          {detalle.descuento_aplicado_hora.toLocaleString(
                            "de-DE"
                          )}
                        </TableCell>
                        <TableCell className="text-c font-medium">
                          ${detalle.costo_calculado.toLocaleString("es-UY")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
