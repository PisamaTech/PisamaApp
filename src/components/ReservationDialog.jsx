import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import {
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const tipoReserva = form.watch("tipo");

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
  const { id, firstName, lastName } = profile;

  function getFirstCharacterAndDot(text) {
    if (typeof text !== "string" || text.length === 0) {
      return ""; // Return an empty string for non-string or empty inputs. You can modify this behavior if needed.
    }
    return text.charAt(0) + ".";
  }

  // Manejar la sumisión del formulario
  const onSubmit = (data) => {
    console.log(data);
    const reservationData = {
      usuario_id: id,
      titulo: `${firstName} ${getFirstCharacterAndDot(lastName)}`,
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
    onConfirm(reservationData);
    console.log(reservationData);
    onOpenChange(false); // Cerrar el diálogo
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-full overflow-y-auto "
      >
        <DialogHeader>
          <DialogTitle className="mb-3">
            <div className="flex gap-3">
              <BookCheck size={20} />
              {isReagendamiento
                ? "Confirmar Reagendamiento"
                : "Confirmar Reserva"}
            </div>
          </DialogTitle>
          <Separator />
          <div className="h-1"></div>

          {/* Información adicional si es reagendamiento */}
          {isReagendamiento && penalizedBooking && (
            <div className="mb-4 p-3 border border-orange-400 bg-orange-50 rounded-md text-sm text-orange-700">
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
          <DialogDescription>
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
          <div className="space-y-4">
            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha de reserva</Label>
              <Input id="date" type="date" {...register("date")} required />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
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
            <div className="flex justify-between gap-4">
              {/* Hora de inicio */}
              <div className="space-y-2 w-full">
                <Label htmlFor="startTime">Hora de inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  step="3600"
                  min="07:00"
                  max="22:00"
                  list="horasSugeridas"
                  {...register("startTime")}
                  required
                />
                {errors.startTime && (
                  <p className="text-sm text-red-500">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              {/* Hora de fin */}
              <div className="space-y-2 w-full">
                <Label htmlFor="endTime">Hora de finalización</Label>
                <Input
                  id="endTime"
                  type="time"
                  step="3600"
                  min="08:00"
                  max="23:00"
                  list="horasSugeridas"
                  {...register("endTime")}
                  required
                />
                {errors.endTime && (
                  <p className="text-sm text-red-500">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>
            {/* Consultorio */}
            <div className="space-y-2">
              <Label htmlFor="resourceId">Consultorio</Label>
              <Select
                onValueChange={(value) => setValue("resourceId", Number(value))}
                defaultValue={String(
                  selectedSlot?.resourceId || selectedConsultorio
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un consultorio" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={String(resource.id)}>
                      {resource.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.resourceId && (
                <p className="text-sm text-red-500">
                  {errors.resourceId.message}
                </p>
              )}
            </div>

            {/* Tipo de reserva */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de reserva</Label>
              <Select
                onValueChange={(value) => setValue("tipo", value)}
                defaultValue={ReservationType.EVENTUAL}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un tipo de reserva" />
                </SelectTrigger>
                <SelectContent>
                  {[ReservationType.EVENTUAL, ReservationType.FIJA].map(
                    (tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-red-500">{errors.tipo.message}</p>
              )}
              {/* Mensaje condicional para reservas fijas */}
              {tipoReserva === ReservationType.FIJA && (
                <div className="text-sm text-blue-600 mt-2">
                  Las reservas fijas se agendan por un plazo de 6 meses.
                  <br />
                  Se le enviará un mensaje un mes antes del vencimiento para
                  recordarle.
                  <br />
                  En caso de necesitarlo, podrá volver a renovarla por otros 6
                  meses.
                </div>
              )}
            </div>
            {/* Uso de camilla */}
            <div className="space-y-2">
              <Label htmlFor="usaCamilla">¿Utilizarás la camilla?</Label>
              <Select
                onValueChange={(value) => setValue("usaCamilla", value)}
                defaultValue="No"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona si utilizarás camilla" />
                </SelectTrigger>
                <SelectContent>
                  {["No", "Sí"].map((opcion) => (
                    <SelectItem key={opcion} value={opcion}>
                      {opcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.usaCamilla && (
                <p className="text-sm text-red-500">
                  {errors.usaCamilla.message}
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} type="button">
              Cancelar
            </Button>
            <Button type="submit">Confirmar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
