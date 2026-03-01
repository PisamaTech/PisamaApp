import { useState } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export const TopUsersTable = ({ data }) => {
  const [page, setPage] = useState(0);

  // Calcular precio promedio por hora
  const calcularPromedio = (facturado, reservas) => {
    if (!reservas || reservas === 0) return 0;
    return Math.round(facturado / reservas);
  };

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = page * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead className="text-right">Hs</TableHead>
              <TableHead className="text-right">$/h</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((user, index) => {
                const promedio = calcularPromedio(
                  user.total_facturado,
                  user.total_reservas,
                );
                const ranking = startIndex + index + 1;
                return (
                  <TableRow key={user.usuario_id || index}>
                    <TableCell className="text-muted-foreground">
                      {ranking}
                    </TableCell>
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
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay datos disponibles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-
            {Math.min(startIndex + ITEMS_PER_PAGE, data.length)} de{" "}
            {data.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
