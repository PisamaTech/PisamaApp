import { Calendar } from "@/components/ui/calendar"; // Importa Calendar de shadcn/ui
import { Button } from "@/components/ui/button"; // O tu componente Button
import { CalendarSync, ChevronLeft, ChevronRight } from "lucide-react"; // Para los íconos (opcional)
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import dayjs from "dayjs";
import { es } from "date-fns/locale";

const CustomToolbar = (toolbar) => {
  const { date, onNavigate, label } = toolbar;

  const goToBack = () => {
    onNavigate("PREV");
  };

  const goToNext = () => {
    onNavigate("NEXT");
  };

  const goToToday = () => {
    onNavigate("TODAY");
  };

  const handleDateChange = (newDate) => {
    if (newDate) {
      onNavigate("DATE", newDate);
    }
  };

  return (
    <div className="rbc-toolbar flex items-center justify-between">
      {/* Botones de navegación */}
      <span className="rbc-btn-group">
        <Button variant="outline" onClick={goToBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={goToToday}>
          Hoy
        </Button>
        <Button variant="outline" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </span>

      {/* Etiqueta (mes y año) */}
      <span className="rbc-toolbar-label">{label}</span>

      {/* DatePicker (usando Popover) */}
      <div className="flex items-center gap-2">
        <p className="text-sm ">Cambiar fecha: </p>
        <span className="rbc-btn-group">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-32 justify-start text-left font-normal"
              >
                {" "}
                <div className="flex items-center justify-center gap-3">
                  <CalendarSync size={32} strokeWidth={2} />{" "}
                  <span>{dayjs(date).format("DD/MM/YYYY")}</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single" // Selección de una sola fecha
                selected={date}
                onSelect={handleDateChange}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </span>
      </div>
    </div>
  );
};

export default CustomToolbar;
