import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const TopUsersTable = ({ data }) => {
  // Calcular precio promedio por hora
  const calcularPromedio = (facturado, reservas) => {
    if (!reservas || reservas === 0) return 0;
    return Math.round(facturado / reservas);
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead className="text-right">Hs</TableHead>
            <TableHead className="text-right">$/h</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((user, index) => {
              const promedio = calcularPromedio(user.total_facturado, user.total_reservas);
              return (
                <TableRow key={user.usuario_id || index}>
                  <TableCell className="font-medium">
                    {user.nombre_completo}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{user.total_reservas}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${promedio.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${user.total_facturado?.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No hay datos disponibles.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
