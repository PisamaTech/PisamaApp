import {
  Badge,
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";

import { TableRow, TableCell } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

const ReservaRow = ({
  reserva,
  camillaIcon,
  handleViewDetails,
  openCancelModal,
  handleReagendarClick,
  ReservationStatus,
  ReservationType,
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <TableCell>
            {dayjs(reserva.start_time)
              .locale("es")
              .format("dddd")
              .replace(/^\w/, (c) => c.toUpperCase())}
          </TableCell>
          <TableCell>
            {dayjs(reserva.start_time).format("DD/MM/YYYY")}
          </TableCell>
          <TableCell>{dayjs(reserva.start_time).format("HH:mm")}</TableCell>
          <TableCell>Consultorio {reserva.consultorio_id}</TableCell>
          <TableCell>
            <Badge variant={reserva.tipo_reserva.toLowerCase()}>
              {reserva.tipo_reserva}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={reserva.estado.toLowerCase()}>
              {reserva.estado}
            </Badge>
          </TableCell>
          <TableCell>
            {reserva.usaCamilla && camillaIcon && (
              <img
                src={camillaIcon}
                alt="Icono de Camilla"
                className="w-5 h-6"
              />
            )}
          </TableCell>
          <TableCell className="text-left">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewDetails(reserva)}>
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={reserva.estado !== ReservationStatus.ACTIVA}
                  onClick={() => openCancelModal(reserva, "single")}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Cancelar Esta Reserva
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    !(
                      reserva.tipo_reserva === ReservationType.FIJA &&
                      reserva.estado === ReservationStatus.ACTIVA
                    )
                  }
                  onClick={() => openCancelModal(reserva, "series")}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Cancelar Serie Completa
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    !(
                      reserva.estado === ReservationStatus.PENALIZADA &&
                      !reserva.fue_reagendada &&
                      dayjs().isBefore(dayjs(reserva.permite_reagendar_hasta))
                    )
                  }
                  onClick={() => handleReagendarClick(reserva)}
                  className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                >
                  Reagendar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={() => handleViewDetails(reserva)}>
          Ver Detalles
        </ContextMenuItem>
        <ContextMenuItem
          disabled={reserva.estado !== ReservationStatus.ACTIVA}
          onClick={() => openCancelModal(reserva, "single")}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          Cancelar Esta Reserva
        </ContextMenuItem>
        <ContextMenuItem
          disabled={
            !(
              reserva.tipo_reserva === ReservationType.FIJA &&
              reserva.estado === ReservationStatus.ACTIVA
            )
          }
          onClick={() => openCancelModal(reserva, "series")}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          Cancelar Serie Completa
        </ContextMenuItem>
        <ContextMenuItem
          disabled={
            !(
              reserva.estado === ReservationStatus.PENALIZADA &&
              !reserva.fue_reagendada &&
              dayjs().isBefore(dayjs(reserva.permite_reagendar_hasta))
            )
          }
          onClick={() => handleReagendarClick(reserva)}
          className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
        >
          Reagendar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ReservaRow;
