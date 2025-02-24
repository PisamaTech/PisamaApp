import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { z } from "zod";
import {
  Checkbox,
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
import { useEffect, useState } from "react";

export const ReservationDialog = ({
  open,
  onOpenChange,
  selectedSlot,
  resources,
}) => {
  const [selectedConsultorio, setSelectedConsultorio] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Manejar el cambio de consultorio
  const handleConsultorioChange = (e) => {
    setSelectedConsultorio(Number(e));
  };

  // Manejar el cambio de fecha en el input type="date"
  const handleDateChange = (event) => {
    setSelectedDate(dayjs(event.target.value)); // Actualiza el estado con la nueva fecha dayjs object
  };

  useEffect(() => {
    // Establecer el consultorio por defecto al abrir el diálogo
    if (selectedSlot?.start) {
      setSelectedDate(dayjs(selectedSlot.start).format("YYYY-MM-DD"));
    }
  }, [selectedSlot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="mb-2">
            <div className="flex gap-3">
              <BookCheck /> Confirmar Reserva
            </div>
          </DialogTitle>
          <Separator className="my-5" />
          <DialogDescription>
            La hora seleccionada para la reserva fue el día:
            <br></br>
            <b>
              {selectedSlot
                ? `${dayjs(selectedSlot.start)
                    .format("dddd")
                    .toUpperCase()}  ${dayjs(selectedSlot.start).format(
                    "D[/]M[/]YYYY"
                  )} 
              - ${dayjs(selectedSlot.start).format("HH:mm")}hs a ${dayjs(
                    selectedSlot?.end
                  ).format("HH:mm")}hs - ${
                    resources.find((r) => r.id === selectedSlot.resourceId)
                      ?.title || "Sin recurso"
                  }.`
                : "No hay slot seleccionado"}
            </b>
            <br></br>
            Si necesitas modificar alguno de los parámetros de la reserva puedes
            hacerlo.
          </DialogDescription>
        </DialogHeader>
        <div>
          <form
            onSubmit={() => {
              console.log("Confirmando reserva");
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de reserva</Label>
                <Input
                  id="fecha"
                  type="date"
                  placeholder="Fecha de reserva"
                  value={dayjs(selectedDate).format("YYYY-MM-DD")}
                  onChange={handleDateChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaInicio">Hora de inicio</Label>
                <div className="relative">
                  <Input
                    id="horaInicio"
                    type="time"
                    step="3600"
                    min="07:00"
                    max="23:00"
                    list="horasSugeridas"
                    required
                    placeholder="Hora de inicio"
                    defaultValue={`${dayjs(selectedSlot?.start).format(
                      "HH:mm"
                    )}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaFin">Hora de finalización</Label>
                <div className="relative">
                  <Input
                    id="horaFin"
                    type="time"
                    step="3600"
                    min="07:00"
                    max="23:00"
                    list="horasSugeridas"
                    required
                    placeholder="Hora de inicio"
                    defaultValue={`${dayjs(selectedSlot?.end).format("HH:mm")}`}
                  />
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
                  </datalist>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultorio" className="mr-3">
                  Consultorio:
                </Label>
                <Select
                  defaultValue={String(selectedSlot?.resourceId)}
                  onValueChange={handleConsultorioChange}
                >
                  <SelectTrigger className="w-[180px]">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoReserva" className="mr-3">
                  Tipo de reserva:
                </Label>
                <Select
                  defaultValue="Eventual"
                  onValueChange={handleConsultorioChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecciona un tipo de consulta" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      {
                        tipo: "Eventual",
                        className: "bg-green-400 hover:bg-green-500",
                      },
                      {
                        tipo: "Fija",
                        className: "bg-blue-400 hover:bg-blue-500",
                      },
                    ].map((resource, index) => (
                      <SelectItem
                        key={index}
                        value={resource.tipo}
                        className={resource.className}
                      >
                        {resource.tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* <div className="flex justify-between text-sm text-foreground font-semibold"> */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm h-7">
                  <label
                    htmlFor="usaCamilla"
                    className="text-ls font-medium leading-none mr-2"
                  >
                    ¿Utilizarás camilla?
                  </label>
                  <Checkbox id="usaCamilla" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={false}>
                Confirmar reserva
              </Button>
              <div className="h-0.5" />
            </div>
          </form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
