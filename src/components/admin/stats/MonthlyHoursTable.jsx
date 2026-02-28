import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";

export const MonthlyHoursTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-6 rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Activas</TableHead>
            <TableHead className="text-right">Utilizadas</TableHead>
            <TableHead className="text-right">Penalizadas</TableHead>
            <TableHead className="text-right bg-primary/5 font-bold">
              Facturadas
            </TableHead>
            <TableHead className="text-right">Canceladas</TableHead>
            <TableHead className="text-right">Reagendadas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => {
            const facturadas =
              (item.horas_activas || 0) +
              (item.horas_utilizadas || 0) +
              (item.horas_penalizadas || 0);
            const mesNombre = dayjs()
              .month(item.mes - 1)
              .format("MMMM");

            return (
              <TableRow key={index}>
                <TableCell className="font-medium capitalize">
                  {mesNombre}
                </TableCell>
                <TableCell className="text-right">
                  {item.horas_activas}h
                </TableCell>
                <TableCell className="text-right">
                  {item.horas_utilizadas}h
                </TableCell>
                <TableCell className="text-right">
                  {item.horas_penalizadas}h
                </TableCell>
                <TableCell className="text-right bg-primary/5 font-bold">
                  <Badge variant="default">{facturadas}h</Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.horas_canceladas}h
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.horas_reagendadas}h
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
