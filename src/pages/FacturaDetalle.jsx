import { useParams, Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { markInvoiceAsPaid } from "@/services/adminService";
import { useInvoiceDetails } from "@/hooks/useInvoiceDetails";

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
import { ArrowLeft, CheckCircle } from "lucide-react";

dayjs.locale("es");
dayjs.extend(isoWeek);

export const FacturaDetalle = () => {
  const { id } = useParams();
  const { profile } = useAuthStore();
  const userId = profile?.id;
  const userRole = profile?.role;
  const navigate = useNavigate();
  // El hook gestiona su propio estado de carga/error para los datos iniciales.
  // Usamos el estado de useUIStore para acciones del usuario como "marcar como pagada".
  const {
    loading: isUpdating,
    startLoading,
    stopLoading,
    showToast,
  } = useUIStore();
  const {
    invoiceData,
    customerProfile, // Obtener el perfil del cliente desde el hook
    loading,
    error,
    updateLocalInvoice,
  } = useInvoiceDetails(id, userId, userRole);

  // Determinar qué perfil mostrar. Prioridad al del cliente si existe.
  const displayProfile = customerProfile || profile;

  // --- Lógica para renderizar colores de fondo en la factura ---
  let lastWeekNumber = null; // Variable para rastrear la última semana procesada
  let useFirstColor = true; // Booleano para alternar el color
  const color1 = "bg-emerald-100";
  const color2 = "bg-orange-100";

  const handleGoBack = () => {
    navigate(-1); // Vuelve a la página anterior
  };

  const handleMarkAsPaid = async () => {
    if (!id) return;

    startLoading();
    try {
      const updatedInvoice = await markInvoiceAsPaid(id);
      // Usa la función del hook para actualizar el estado local de la factura
      // y mantener la UI sincronizada sin recargar la página.
      updateLocalInvoice(updatedInvoice);

      showToast({
        type: "success",
        title: "Factura Actualizada",
        message: `La factura #${id} ha sido marcada como pagada.`,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Error al Actualizar",
        message: err.message || "No se pudo actualizar la factura.",
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

  // El estado de carga del hook se usa para mostrar el esqueleto de la página.
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

  // El estado de error del hook se usa para mostrar el mensaje de error.
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
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={handleGoBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Historial
      </Button>

      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl">
                Detalle de Factura #{factura.id}
              </CardTitle>
              <CardDescription>
                Nombre:
                {` ${displayProfile?.firstName || ""} ${
                  displayProfile?.lastName || ""
                }`}
                <br />
                Período: {dayjs(factura.periodo_inicio).format(
                  "DD/MM/YYYY"
                )} - {dayjs(factura.periodo_fin).format("DD/MM/YYYY")}.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant={getStatusVariant(factura.estado)}
                className="text-lg"
              >
                {factura.estado.charAt(0).toUpperCase() +
                  factura.estado.slice(1)}
              </Badge>
              {userRole === "admin" && (
                <Button
                  size="sm"
                  onClick={handleMarkAsPaid}
                  disabled={factura.estado === "pagada" || isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {factura.estado === "pagada"
                    ? "Pagada"
                    : "Marcar como Pagada"}
                </Button>
              )}
            </div>
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
            <div className="border rounded-md">
              {/* Desktop View */}
              <div className="hidden md:block">
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
                      if (index === 0) {
                        lastWeekNumber = currentWeekNumber;
                        useFirstColor = true;
                      } else if (currentWeekNumber !== lastWeekNumber) {
                        useFirstColor = !useFirstColor;
                        lastWeekNumber = currentWeekNumber;
                      }

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

               {/* Mobile View */}
               <div className="md:hidden space-y-2 p-2">
                   {/* Resetear variables para el map del móvil si es necesario, 
                       pero como React re-renderiza, las variables let fuera del map se reinician en cada render del componente. 
                       IMPORTANTE: Las variables let lastWeekNumber y useFirstColor están definidas en el cuerpo del componente, 
                       por lo que se comparten. Al renderizar AMBOS maps (aunque uno esté oculto), las variables se modificarían dos veces.
                       NECESITAMOS reiniciar las variables antes de este segundo map o usar lógica independiente.
                       
                       Lo mejor es usar un bloque IIFE o simplemente resetearlas aquí manualmente ya que sabemos que el componente se ejecuta secuencialmente.
                   */}
                   {(() => {
                      // Reiniciamos las variables de control de color para el renderizado móvil
                      let m_lastWeekNumber = null;
                      let m_useFirstColor = true;

                      return detalles.map((detalle, index) => {
                        const currentWeekNumber = dayjs(detalle.reservas.start_time).isoWeek();

                        if (index === 0) {
                           m_lastWeekNumber = currentWeekNumber;
                           m_useFirstColor = true;
                        } else if (currentWeekNumber !== m_lastWeekNumber) {
                           m_useFirstColor = !m_useFirstColor;
                           m_lastWeekNumber = currentWeekNumber;
                        }
                        
                        const rowClassName = m_useFirstColor ? color1 : color2;

                        return (
                           <div key={detalle.id} className={`p-4 rounded-lg shadow-sm border ${rowClassName}`}>
                              <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <p className="font-bold text-sm">
                                       {dayjs(detalle.reservas.start_time)
                                          .locale("es")
                                          .format("dddd DD/MM")
                                          .replace(/^\w/, (c) => c.toUpperCase())}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                       {dayjs(detalle.reservas.start_time).format("HH:mm")} hs - {detalle.reservas.consultorios.nombre}
                                    </p>
                                 </div>
                                 <Badge variant={detalle.reservas.tipo_reserva.toLowerCase()}>
                                    {detalle.reservas.tipo_reserva}
                                 </Badge>
                              </div>
                              
                              <div className="flex justify-between items-center text-sm border-t pt-2 border-black/10">
                                 <div className="text-muted-foreground text-xs">
                                     {detalle.descuento_aplicado_hora > 0 && (
                                        <span className="text-red-600 block">
                                           Desc: -${detalle.descuento_aplicado_hora.toLocaleString("de-DE")}
                                        </span>
                                     )}
                                 </div>
                                 <div className="font-bold text-base">
                                     ${detalle.costo_calculado.toLocaleString("es-UY")}
                                 </div>
                              </div>
                           </div>
                        );
                      });
                   })()}
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
