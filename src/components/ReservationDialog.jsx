import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { UserCombobox } from "@/components/admin/UserCombobox";
import { fetchAllUsers } from "@/services/adminService"; // El nuevo servicio
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "./ui";
import { BookCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reservationSchema } from "@/validations/validationSchemas";
import { useAuthStore } from "@/stores/authStore";
import { ReservationStatus, ReservationType } from "@/utils/constants";

export const ReservationDialog = ({
  open,
  onOpenChange,
  selectedSlot,
  resources,
  onConfirm,
  onCancel,
  isReagendamiento = false, // Valor por defecto
  penalizedBooking = null, // Valor por defecto
  selectedConsultorio = null,
  isAdminBookingMode = false,
}) => {
  // Configuración de React Hook Form con Zod
  const form = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      date: "",
      startTime: "",
      endTime: "",
      resourceId: null,
      tipo: "Eventual",
      usaCamilla: "No",
    },
  });

  // --- Añade estados para la lista de usuarios y el usuario seleccionado ---
  const [userList, setUserList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // --- Cargar la lista de usuarios si estamos en modo admin ---
  useEffect(() => {
    if (isAdminBookingMode && open) {
      // Carga solo si el modo está activo y el diálogo está abierto
      const loadUsers = async () => {
        try {
          const users = await fetchAllUsers(1, 200);
          console.log(users);
          setUserList(users.data);
        } catch (error) {
          console.error("No se pudo cargar la lista de usuarios:", error);
        }
      };
      loadUsers();
    }
  }, [isAdminBookingMode, open]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = form;

  const tipoReserva = watch("tipo");

  // Inicializar valores del formulario cuando selectedSlot cambia
  useEffect(() => {
    if (selectedSlot) {
      setValue("date", dayjs(selectedSlot.start).format("YYYY-MM-DD"));
      setValue("startTime", dayjs(selectedSlot.start).format("HH:mm"));
      setValue("endTime", dayjs(selectedSlot.end).format("HH:mm"));
      setValue("resourceId", selectedSlot.resourceId || selectedConsultorio);
      setValue("tipo", "Eventual");
      setValue("usaCamilla", "No");
    } else {
      setValue("date", dayjs().format("YYYY-MM-DD"));
      setValue("startTime", "");
      setValue("endTime", "");
      setValue("resourceId", selectedConsultorio);
    }
  }, [selectedSlot, selectedConsultorio, setValue]);

  // Mover el foco al DialogContent
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Extraer datos del usuario para la reserva desde el Store
  const { profile } = useAuthStore.getState();

  function getFirstCharacterAndDot(text) {
    if (typeof text !== "string" || text.length === 0) {
      return ""; // Return an empty string for non-string or empty inputs. You can modify this behavior if needed.
    }
    return text.charAt(0) + ".";
  }

  // ✅ FUNCIÓN CORREGIDA: Manejar sumisión con mejor control de cierre
  const onSubmit = (data) => {
    // La validación ahora ocurre antes de llamar a onSubmit
    // Primero, valida el usuario si estamos en modo admin
    if (isAdminBookingMode && !selectedUserId) {
      setError("selectedUserId", {
        // <-- Establece el error manualmente
        type: "manual",
        message: "Debes seleccionar un usuario.",
      });
      return; // Detiene el envío
    }
    // Determina para quién es la reserva
    const targetUserId = isAdminBookingMode ? selectedUserId : profile.id;
    const targetUser = isAdminBookingMode
      ? userList.find((u) => u.id === targetUserId)
      : profile;

    if (isAdminBookingMode && !targetUserId) {
      // Muestra un error o un toast si el admin no seleccionó un usuario
      alert("Por favor, selecciona un usuario para agendar la reserva.");
      return;
    }

    const reservationData = {
      usuario_id: targetUserId,
      titulo: `${targetUser.firstName} ${getFirstCharacterAndDot(
        targetUser.lastName
      )}`,
      start: dayjs(`${data.date}T${data.startTime}`).toDate(),
      start_time: dayjs(`${data.date}T${data.startTime}`).toDate(),
      end: dayjs(`${data.date}T${data.endTime}`).toDate(),
      end_time: dayjs(`${data.date}T${data.endTime}`).toDate(),
      consultorio_id: data.resourceId,
      resourceId: data.resourceId,
      tipo_reserva: data.tipo,
      usaCamilla: data.usaCamilla === "Sí",
      status: ReservationStatus.ACTIVA,
      // --- Clave: Añade el ID de la reserva original si es un reagendamiento ---
      reagendamiento_de_id: isReagendamiento ? penalizedBooking.id : null,
    };

    // ✅ MEJORADO: Ejecutar confirmación y cerrar con timing controlado
    try {
      onConfirm(reservationData);
      // ✅ CRÍTICO: Usar setTimeout para evitar conflictos de DOM
      setTimeout(() => {
        onOpenChange(false);
      }, 150);
    } catch (error) {
      console.error("Error al procesar reserva:", error);
      // En caso de error, asegurar cierre limpio del diálogo
      setTimeout(() => {
        onOpenChange(false);
      }, 150);
    }
  };

  // --- Crea una función para manejar la selección del usuario ---
  const handleUserSelect = (userId) => {
    setSelectedUserId(userId); // Actualiza el estado local
    if (userId) {
      clearErrors("selectedUserId"); // <-- Limpia el error cuando se selecciona un usuario
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-full overflow-y-auto max-w-[95vw] sm:max-w-[600px]"
      >
        <DialogHeader>
          <DialogTitle className="mb-3">
            <div className="flex gap-2 sm:gap-3 items-center">
              <BookCheck size={18} className="sm:w-5 sm:h-5" />
              <span className="text-base sm:text-lg">
                {isReagendamiento
                  ? "Confirmar Reagendamiento"
                  : "Confirmar Reserva"}
              </span>
            </div>
          </DialogTitle>
          <Separator />
          <div className="h-1"></div>

          {/* Información adicional si es reagendamiento */}
          {isReagendamiento && penalizedBooking && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 border border-orange-400 bg-orange-50 rounded-md text-xs sm:text-sm text-orange-700">
              Estás reagendando la reserva original del{" "}
              <b>
                {dayjs(penalizedBooking.start_time).format(
                  "DD/MM/YYYY [- ]HH:mm[hs]"
                )}
              </b>
              . <br />
              Esta nueva reserva reemplazará a la anterior y no generará un
              costo adicional.
            </div>
          )}

          {/* // Información sobre la reserva seleccionada // */}
          <DialogDescription className="text-xs sm:text-sm">
            La hora seleccionada para la reserva fue el día:
            <br />
            <b>
              {selectedSlot
                ? `${dayjs(selectedSlot.start)
                    .format("dddd")
                    .toUpperCase()} ${dayjs(selectedSlot.start).format(
                    "D[/]M[/]YYYY"
                  )} - ${dayjs(selectedSlot.start).format("HH:mm")}hs a ${dayjs(
                    selectedSlot.end
                  ).format("HH:mm")}hs - ${
                    resources.find(
                      (r) =>
                        r.id ===
                        (selectedSlot.resourceId || selectedConsultorio)
                    )?.title || "Sin recurso"
                  }.`
                : "No hay slot seleccionado"}
            </b>
            <br />
            Si necesitas modificar alguno de los parámetros de la reserva puedes
            hacerlo antes de confirmarla.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3 sm:space-y-4">
            {/* --- Añade el selector de usuario condicional --- */}
            {isAdminBookingMode && (
              <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
                <Label className="font-semibold text-yellow-800 text-xs sm:text-sm">
                  Agendando para:
                </Label>
                <UserCombobox
                  users={userList}
                  selectedUserId={selectedUserId}
                  onSelect={handleUserSelect}
                />
                {/* --- 5. Muestra el error de validación --- */}
                {errors.selectedUserId && (
                  <p className="text-xs sm:text-sm text-red-500 mt-1">
                    {errors.selectedUserId.message}
                  </p>
                )}
              </div>
            )}
            {/* Fecha */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="date" className="text-xs sm:text-sm">Fecha de reserva</Label>
              <Input id="date" type="date" {...register("date")} required className="text-xs sm:text-sm h-8 sm:h-10" />
              {errors.date && (
                <p className="text-xs sm:text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            {/* Horas sugeridas para las reservas */}
            <datalist id="horasSugeridas">
              <option value="07:00">07:00</option>
              <option value="08:00">08:00</option>
              <option value="09:00">09:00</option>
              <option value="10:00">10:00</option>
              <option value="11:00">11:00</option>
              <option value="12:00">12:00</option>
              <option value="13:00">13:00</option>
              <option value="14:00">14:00</option>
              <option value="15:00">15:00</option>
              <option value="16:00">16:00</option>
              <option value="17:00">17:00</option>
              <option value="18:00">18:00</option>
              <option value="19:00">19:00</option>
              <option value="20:00">20:00</option>
              <option value="21:00">21:00</option>
              <option value="22:00">22:00</option>
              <option value="23:00">23:00</option>
            </datalist>
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
              {/* Hora de inicio */}
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="startTime" className="text-xs sm:text-sm">Hora de inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  step="3600"
                  min="07:00"
                  max="22:00"
                  list="horasSugeridas"
                  {...register("startTime")}
                  required
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
                {errors.startTime && (
                  <p className="text-xs sm:text-sm text-red-500">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              {/* Hora de fin */}
              <div className="space-y-1 sm:space-y-2 w-full">
                <Label htmlFor="endTime" className="text-xs sm:text-sm">Hora de finalización</Label>
                <Input
                  id="endTime"
                  type="time"
                  step="3600"
                  min="08:00"
                  max="23:00"
                  list="horasSugeridas"
                  {...register("endTime")}
                  required
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
                {errors.endTime && (
                  <p className="text-xs sm:text-sm text-red-500">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>
            {/* Consultorio */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="resourceId" className="text-xs sm:text-sm">Consultorio</Label>
              <Select
                onValueChange={(value) => setValue("resourceId", Number(value))}
                defaultValue={String(
                  selectedSlot?.resourceId || selectedConsultorio
                )}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue placeholder="Selecciona un consultorio" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={String(resource.id)} className="text-xs sm:text-sm">
                      {resource.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.resourceId && (
                <p className="text-xs sm:text-sm text-red-500">
                  {errors.resourceId.message}
                </p>
              )}
            </div>

            {/* Tipo de reserva */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="tipo" className="text-xs sm:text-sm">Tipo de reserva</Label>
              <Select
                onValueChange={(value) => setValue("tipo", value)}
                defaultValue={ReservationType.EVENTUAL}
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue placeholder="Selecciona un tipo de reserva" />
                </SelectTrigger>
                <SelectContent>
                  {[ReservationType.EVENTUAL, ReservationType.FIJA].map(
                    (tipo) => (
                      <SelectItem key={tipo} value={tipo} className="text-xs sm:text-sm">
                        {tipo}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-xs sm:text-sm text-red-500">{errors.tipo.message}</p>
              )}
              {/* Mensaje condicional para reservas fijas */}
              {tipoReserva === ReservationType.FIJA && (
                <div className="text-xs sm:text-sm text-blue-600 mt-2">
                  Las reservas fijas se agendan por un plazo de 4 meses.
                  <br />
                  Se le enviará un mensaje un mes antes del vencimiento para
                  recordarle.
                  <br />
                  En caso de necesitarlo, podrá volver a renovarla por otros 4
                  meses.
                </div>
              )}
            </div>
            {/* Uso de camilla */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="usaCamilla" className="text-xs sm:text-sm">¿Utilizarás la camilla?</Label>
              <Select
                onValueChange={(value) => setValue("usaCamilla", value)}
                defaultValue="No"
              >
                <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue placeholder="Selecciona si utilizarás camilla" />
                </SelectTrigger>
                <SelectContent>
                  {["No", "Sí"].map((opcion) => (
                    <SelectItem key={opcion} value={opcion} className="text-xs sm:text-sm">
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.usaCamilla && (
                <p className="text-xs sm:text-sm text-red-500">
                  {errors.usaCamilla.message}
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-end gap-2 w-full">
            <Button type="submit" className="text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto">Confirmar</Button>
            <Button variant="outline" onClick={onCancel} type="button" className="text-xs sm:text-sm h-9 sm:h-10 w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
