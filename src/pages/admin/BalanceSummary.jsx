import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import { fetchAllUsersBalance } from "@/services/paymentService";
import { fetchAllUsers } from "@/services/adminService";

// --- Importaciones de Componentes Shadcn UI ---
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
import { Separator } from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserCombobox } from "@/components/admin/UserCombobox";
import { StatCard } from "@/components/admin/StatCard";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const BalanceSummaryPage = () => {
  const navigate = useNavigate();
  const { loading, startLoading, stopLoading, showToast } = useUIStore();

  const [balanceData, setBalanceData] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filters, setFilters] = useState({ userId: "todos" });
  const [appliedFilters, setAppliedFilters] = useState({ userId: "todos" });

  // Estados de ordenamiento
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("desc");

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortField) return balanceData;

    return [...balanceData].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "usuario":
          aValue = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
          bValue = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
          break;
        case "total_pagos":
          aValue = Number(a.total_pagos || 0);
          bValue = Number(b.total_pagos || 0);
          break;
        case "total_facturado":
          aValue = Number(a.total_facturado || 0);
          bValue = Number(b.total_facturado || 0);
          break;
        case "saldo":
          aValue = Number(a.saldo_disponible || 0);
          bValue = Number(b.saldo_disponible || 0);
          break;
        default:
          return 0;
      }

      if (sortField === "usuario") {
        // Ordenamiento alfabético
        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        }
        return bValue.localeCompare(aValue);
      }

      // Ordenamiento numérico
      if (sortDirection === "asc") {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  }, [balanceData, sortField, sortDirection]);

  // Manejar ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Nuevo campo, ordenar descendente por defecto
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Obtener icono de ordenamiento
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  // Calcular totales del sistema
  const totals = useMemo(() => {
    return balanceData.reduce(
      (acc, user) => ({
        totalPagos: acc.totalPagos + Number(user.total_pagos || 0),
        totalFacturado: acc.totalFacturado + Number(user.total_facturado || 0),
        saldoTotal: acc.saldoTotal + Number(user.saldo_disponible || 0),
      }),
      { totalPagos: 0, totalFacturado: 0, saldoTotal: 0 }
    );
  }, [balanceData]);

  // Cargar la lista de usuarios para el filtro una sola vez
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await fetchAllUsers(1, 1000);
        setAllUsers(data);
      } catch (error) {
        console.error("No se pudieron cargar los usuarios para el filtro.");
      }
    };
    loadUsers();
  }, []);

  // Cargar datos de saldos cuando cambian los filtros aplicados
  useEffect(() => {
    const loadBalanceData = async () => {
      startLoading();
      try {
        const data = await fetchAllUsersBalance(appliedFilters.userId);
        setBalanceData(data);
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          message: `No se pudieron cargar los saldos: ${
            error.message || "Error Desconocido"
          }.`,
        });
      } finally {
        stopLoading();
      }
    };
    loadBalanceData();
  }, [appliedFilters, startLoading, stopLoading, showToast]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  const getBalanceVariant = (saldo) => {
    if (saldo > 0) return "success";
    if (saldo < 0) return "destructive";
    return "secondary";
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Resumen de Saldos por Usuario</h1>
          <p className="text-muted-foreground">
            Visualiza los pagos, gastos y saldos de todos los usuarios.
          </p>
        </div>
        <Separator />

        {/* Tarjetas de Resumen */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            Icon={Wallet}
            title="Total de Pagos"
            value={`$${totals.totalPagos.toLocaleString("es-UY")}`}
            footer="Suma de todos los pagos procesados"
            isLoading={loading}
          />
          <StatCard
            Icon={Receipt}
            title="Total Facturado"
            value={`$${totals.totalFacturado.toLocaleString("es-UY")}`}
            footer="Suma de todas las facturas emitidas"
            isLoading={loading}
          />
          <StatCard
            Icon={totals.saldoTotal >= 0 ? TrendingUp : TrendingDown}
            title="Saldo Total del Sistema"
            value={`$${totals.saldoTotal.toLocaleString("es-UY")}`}
            footer={
              totals.saldoTotal >= 0
                ? "A favor de usuarios"
                : "Pendiente de cobro"
            }
            isLoading={loading}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-auto">
            <UserCombobox
              users={allUsers}
              selectedUserId={filters.userId}
              onSelect={(id) => handleFilterChange("userId", id)}
            />
          </div>
          <Button onClick={handleApplyFilters} className="w-full md:w-auto">
            Buscar
          </Button>
        </div>

        {/* Tabla de Saldos (Desktop) */}
        <div className="hidden md:block border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center hover:text-foreground transition-colors"
                    onClick={() => handleSort("usuario")}
                  >
                    Usuario
                    {getSortIcon("usuario")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                    onClick={() => handleSort("total_pagos")}
                  >
                    Total Pagos
                    {getSortIcon("total_pagos")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                    onClick={() => handleSort("total_facturado")}
                  >
                    Total Facturado
                    {getSortIcon("total_facturado")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                    onClick={() => handleSort("saldo")}
                  >
                    Saldo
                    {getSortIcon("saldo")}
                  </button>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : sortedData.length > 0 ? (
                sortedData.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="font-medium">
                        {`${user.first_name || ""} ${
                          user.last_name || ""
                        }`.trim() || "Usuario sin nombre"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ${Number(user.total_pagos || 0).toLocaleString("es-UY")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      ${Number(user.total_facturado || 0).toLocaleString("es-UY")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={getBalanceVariant(Number(user.saldo_disponible))}
                        className="font-medium"
                      >
                        ${Number(user.saldo_disponible || 0).toLocaleString("es-UY")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              navigate(`/admin/balance-summary/${user.user_id}`)
                            }
                          >
                            <Eye strokeWidth={2.5} className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver Detalles</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron usuarios con datos financieros.
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
          ) : sortedData.length > 0 ? (
            sortedData.map((user) => (
              <div
                key={user.user_id}
                className="bg-slate-200 text-slate-900 p-4 rounded-lg shadow-sm space-y-3 border border-slate-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {`${user.first_name || ""} ${
                        user.last_name || ""
                      }`.trim() || "Usuario sin nombre"}
                    </h3>
                    <p className="text-sm text-slate-600">{user.email}</p>
                  </div>
                  <Badge
                    variant={getBalanceVariant(Number(user.saldo_disponible))}
                    className="capitalize shrink-0 shadow-sm font-medium"
                  >
                    ${Number(user.saldo_disponible || 0).toLocaleString("es-UY")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Pagos
                    </p>
                    <p className="font-bold text-green-700">
                      ${Number(user.total_pagos || 0).toLocaleString("es-UY")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Facturado
                    </p>
                    <p className="font-bold text-orange-700">
                      ${Number(user.total_facturado || 0).toLocaleString("es-UY")}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
                  onClick={() =>
                    navigate(`/admin/balance-summary/${user.user_id}`)
                  }
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              No se encontraron usuarios con datos financieros.
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BalanceSummaryPage;
