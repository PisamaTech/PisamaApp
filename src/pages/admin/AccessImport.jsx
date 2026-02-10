import { useState, useMemo, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { parseAccessExcelFile, validateExcelFile } from "@/utils/excelParser";
import {
  processAccessBatch,
  AccessMatchStatus,
  updateUserAccessName,
  fetchUsersForAccessMatching,
  saveAccessBatch,
  fetchAccessNameRules,
  createAccessNameRule,
  deleteAccessNameRule,
} from "@/services/accessControlService";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/admin/StatCard";
import dayjs from "dayjs";

// Componentes UI
import {
  Input,
  Button,
  Badge,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  Filter,
  UserPlus,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowLeft,
  EyeOff,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";

const AccessImportPage = () => {
  const { loading, startLoading, stopLoading, showToast } = useUIStore();
  const navigate = useNavigate();

  // Estados principales
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [results, setResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState("todos");

  // Estados de ordenamiento
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  // Estados para modal de asignación de alias
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUnmatchedName, setSelectedUnmatchedName] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Estados para reglas de nombres
  const [rules, setRules] = useState([]);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleAction, setNewRuleAction] = useState("ignore");

  // Cargar reglas al montar
  useEffect(() => {
    const loadRules = async () => {
      try {
        const data = await fetchAccessNameRules();
        setRules(data);
      } catch (error) {
        console.error("Error cargando reglas:", error);
      }
    };
    loadRules();
  }, []);

  // Datos filtrados y ordenados
  const filteredResults = useMemo(() => {
    if (!results?.results) return [];

    // Filtrar
    let data =
      statusFilter === "todos"
        ? [...results.results]
        : results.results.filter((r) => r.status === statusFilter);

    // Ordenar
    if (sortField) {
      data.sort((a, b) => {
        let valueA, valueB;

        switch (sortField) {
          case "accessTime":
            valueA = new Date(a.accessTime).getTime();
            valueB = new Date(b.accessTime).getTime();
            break;
          case "accessUserName":
            valueA = a.accessUserName?.toLowerCase() || "";
            valueB = b.accessUserName?.toLowerCase() || "";
            break;
          case "matchedUser":
            valueA = a.matchedUser?.name?.toLowerCase() || "";
            valueB = b.matchedUser?.name?.toLowerCase() || "";
            break;
          case "reservation":
            valueA = a.reservation?.startTime
              ? new Date(a.reservation.startTime).getTime()
              : 0;
            valueB = b.reservation?.startTime
              ? new Date(b.reservation.startTime).getTime()
              : 0;
            break;
          case "status":
            valueA = a.status || "";
            valueB = b.status || "";
            break;
          default:
            return 0;
        }

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [results, statusFilter, sortField, sortDirection]);

  // Handler para ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handler para selección de archivo
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar archivo
    const validation = validateExcelFile(selectedFile);
    if (!validation.valid) {
      showToast({
        type: "error",
        title: "Archivo inválido",
        message: validation.error,
      });
      return;
    }

    setFile(selectedFile);
    setResults(null);

    // Generar preview
    try {
      startLoading("Leyendo archivo...");
      const records = await parseAccessExcelFile(selectedFile);
      setPreviewData({
        fileName: selectedFile.name,
        recordCount: records.length,
        sampleRecords: records.slice(0, 5),
        rawRecords: records,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error de lectura",
        message: error.message,
      });
      setFile(null);
      setPreviewData(null);
    } finally {
      stopLoading();
    }
  };

  // Handler para procesar archivo
  const handleProcess = async () => {
    if (!previewData?.rawRecords) return;

    try {
      startLoading("Procesando y guardando...");
      const processedResults = await processAccessBatch(previewData.rawRecords);
      setResults(processedResults);
      setStatusFilter("todos");

      // Auto-save: Guardar automáticamente en la base de datos
      await saveAccessBatch(processedResults.results);

      const ignoredMsg =
        processedResults.stats.ignored > 0
          ? ` (${processedResults.stats.ignored} ignorados)`
          : "";
      const trackedMsg =
        processedResults.stats.tracked > 0
          ? ` (${processedResults.stats.tracked} solo registro)`
          : "";

      showToast({
        type: "success",
        title: "Procesado y Guardado",
        message: `Se procesaron ${processedResults.stats.total} registros${ignoredMsg}${trackedMsg}.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error de procesamiento",
        message: error.message,
      });
    } finally {
      stopLoading();
    }
  };

  // Handler para abrir modal de asignación
  const handleOpenAssignModal = async (unmatchedName) => {
    setSelectedUnmatchedName(unmatchedName);
    setSelectedUserId("");

    try {
      startLoading();
      const users = await fetchUsersForAccessMatching();
      setAvailableUsers(users);
      setIsAssignModalOpen(true);
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

  // Handler para confirmar asignación
  const handleConfirmAssign = async () => {
    if (!selectedUserId || !selectedUnmatchedName) return;

    try {
      startLoading("Asignando alias...");
      await updateUserAccessName(selectedUserId, selectedUnmatchedName);

      showToast({
        type: "success",
        title: "Alias asignado",
        message: `El nombre "${selectedUnmatchedName}" fue vinculado exitosamente.`,
      });

      setIsAssignModalOpen(false);

      // Reprocesar si hay datos cargados
      if (previewData?.rawRecords) {
        await handleProcess();
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      stopLoading();
    }
  };

  // Handler para agregar regla
  const handleAddRule = async () => {
    if (!newRuleName.trim()) return;

    try {
      startLoading("Guardando regla...");
      const newRule = await createAccessNameRule({
        access_name: newRuleName.trim(),
        action: newRuleAction,
        description:
          newRuleAction === "ignore"
            ? "No registrar accesos"
            : "Registrar sin vincular",
      });
      setRules((prev) => [...prev, newRule]);
      setNewRuleName("");
      setNewRuleAction("ignore");
      showToast({
        type: "success",
        title: "Regla creada",
        message: `"${newRuleName}" será ${newRuleAction === "ignore" ? "ignorado" : "registrado sin vincular"}.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      stopLoading();
    }
  };

  // Handler para eliminar regla
  const handleDeleteRule = async (ruleId, ruleName) => {
    try {
      startLoading("Eliminando regla...");
      await deleteAccessNameRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast({
        type: "success",
        title: "Regla eliminada",
        message: `La regla para "${ruleName}" fue eliminada.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        message: error.message,
      });
    } finally {
      stopLoading();
    }
  };

  // Limpiar todo
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setResults(null);
    setStatusFilter("todos");
  };

  // Componente para header ordenable
  const SortableTableHead = ({ label, field }) => {
    const isActive = sortField === field;
    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </div>
      </TableHead>
    );
  };

  // Obtener variante de badge según estado
  const getStatusBadge = (status, isTracked) => {
    if (isTracked) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Eye className="h-3 w-3" /> Solo Registro
        </Badge>
      );
    }
    switch (status) {
      case AccessMatchStatus.VALID:
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Válido
          </Badge>
        );
      case AccessMatchStatus.NO_RESERVATION:
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Sin Reserva
          </Badge>
        );
      case AccessMatchStatus.UNMATCHED:
        return (
          <Badge variant="destructive" className="gap-1">
            <UserX className="h-3 w-3" /> Sin Match
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Importar Accesos</h1>
          <p className="text-muted-foreground">
            Sube el archivo Excel del sistema de acceso para cotejarlo contra
            las reservas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsRulesModalOpen(true)}
          >
            <EyeOff className="h-4 w-4" />
            Reglas ({rules.length})
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate("/admin/access-control")}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
      <Separator />

      {/* Sección de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivo de Accesos
          </CardTitle>
          <CardDescription>
            El archivo debe tener las columnas: time, user, content, unlock
            record
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
              className="flex-1"
            />
            {file && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Preview del archivo */}
          {previewData && !results && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{previewData.fileName}</span>
                </div>
                <Badge variant="secondary">
                  {previewData.recordCount} registros
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">
                  Vista previa (primeros 5 registros):
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.sampleRecords.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{r.time}</TableCell>
                          <TableCell className="text-xs">{r.user}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Button
                onClick={handleProcess}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Procesar Archivo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {results && (
        <>
          {/* Estadísticas */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              Icon={FileSpreadsheet}
              title="Total Procesados"
              value={results.stats.total}
              footer={`Período: ${results.dateRange.from} - ${results.dateRange.to}`}
              isLoading={loading}
            />
            <StatCard
              Icon={CheckCircle2}
              title="Válidos"
              value={results.stats.valid}
              footer={
                results.stats.total > 0
                  ? `${((results.stats.valid / results.stats.total) * 100).toFixed(1)}%`
                  : "0%"
              }
              isLoading={loading}
            />
            <StatCard
              Icon={AlertTriangle}
              title="Sin Reserva"
              value={results.stats.noReservation}
              footer="Usuario sin reserva"
              isLoading={loading}
            />
            <StatCard
              Icon={UserX}
              title="Sin Match"
              value={results.stats.unmatched}
              footer={`${results.unmatchedUsers.length} únicos`}
              isLoading={loading}
            />
            <StatCard
              Icon={Eye}
              title="Solo Registro"
              value={results.stats.tracked || 0}
              footer="Guardados sin vincular"
              isLoading={loading}
            />
            <StatCard
              Icon={EyeOff}
              title="Ignorados"
              value={results.stats.ignored || 0}
              footer="No guardados"
              isLoading={loading}
            />
          </div>

          {/* Lista de usuarios sin match */}
          {results.unmatchedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Usuarios Sin Vincular ({results.unmatchedUsers.length})
                </CardTitle>
                <CardDescription>
                  Estos nombres del sistema de acceso no tienen usuario
                  asignado. Haz clic para vincularlos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {results.unmatchedUsers.map((name) => (
                    <Button
                      key={name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignModal(name)}
                      className="gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      {name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtro y Tabla de resultados */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Detalle de Registros</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value={AccessMatchStatus.VALID}>
                        Válidos
                      </SelectItem>
                      <SelectItem value={AccessMatchStatus.NO_RESERVATION}>
                        Sin Reserva
                      </SelectItem>
                      <SelectItem value={AccessMatchStatus.UNMATCHED}>
                        Sin Match
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Tabla Desktop */}
              <div className="hidden md:block border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        label="Hora de Acceso"
                        field="accessTime"
                      />
                      <SortableTableHead
                        label="Nombre (Sistema)"
                        field="accessUserName"
                      />
                      <SortableTableHead
                        label="Usuario (App)"
                        field="matchedUser"
                      />
                      <SortableTableHead label="Reserva" field="reservation" />
                      <SortableTableHead label="Estado" field="status" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.length > 0 ? (
                      filteredResults.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-sm">
                            {dayjs(record.accessTime).format("DD/MM/YY HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.accessUserName}
                          </TableCell>
                          <TableCell>
                            {record.matchedUser?.name || (
                              <span className="text-muted-foreground italic">
                                No vinculado
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.reservation ? (
                              <span>
                                {dayjs(record.reservation.startTime).format(
                                  "HH:mm"
                                )}{" "}
                                - {record.reservation.consultorio}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status, record.isTracked)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No hay registros con el filtro seleccionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Vista Móvil (Cards) */}
              <div className="md:hidden space-y-4">
                {filteredResults.length > 0 ? (
                  filteredResults.map((record, index) => (
                    <div
                      key={index}
                      className="bg-slate-200 text-slate-900 p-4 rounded-lg space-y-2 border border-slate-300"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{record.accessUserName}</p>
                          <p className="text-sm text-slate-600">
                            {dayjs(record.accessTime).format("DD/MM/YY HH:mm")}
                          </p>
                        </div>
                        {getStatusBadge(record.status, record.isTracked)}
                      </div>
                      {record.matchedUser && (
                        <p className="text-sm">
                          <span className="text-slate-500">Usuario:</span>{" "}
                          {record.matchedUser.name}
                        </p>
                      )}
                      {record.reservation && (
                        <p className="text-sm">
                          <span className="text-slate-500">Reserva:</span>{" "}
                          {dayjs(record.reservation.startTime).format("HH:mm")}{" "}
                          - {record.reservation.consultorio}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay registros con el filtro seleccionado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de asignación de alias */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Usuario</DialogTitle>
            <DialogDescription>
              Asigna el nombre &quot;{selectedUnmatchedName}&quot; a un usuario
              del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nombre en sistema de acceso</Label>
              <Input value={selectedUnmatchedName} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userSelect">Seleccionar Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="userSelect">
                  <SelectValue placeholder="Elige un usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                      {user.access_system_name && (
                        <span className="text-muted-foreground ml-2">
                          (actual: {user.access_system_name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAssign}
              disabled={!selectedUserId || loading}
            >
              {loading ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de reglas */}
      <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reglas de Nombres</DialogTitle>
            <DialogDescription>
              Configura cómo manejar ciertos nombres del sistema de acceso.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Lista de reglas */}
            {rules.length > 0 ? (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {rule.action === "ignore" ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-medium">{rule.access_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {rule.action === "ignore" ? "Ignorar" : "Solo registro"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDeleteRule(rule.id, rule.access_name)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay reglas configuradas.
              </p>
            )}

            {/* Agregar nueva regla */}
            <Separator />
            <div className="space-y-3">
              <Label>Agregar nueva regla</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre del sistema"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newRuleAction} onValueChange={setNewRuleAction}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">Ignorar</SelectItem>
                    <SelectItem value="track">Solo registro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddRule}
                disabled={!newRuleName.trim() || loading}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Regla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessImportPage;
