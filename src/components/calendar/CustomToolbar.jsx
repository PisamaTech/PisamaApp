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
    <div className="rbc-toolbar flex flex-col sm:flex-row items-center justify-between gap-3 py-2 px-2">
      {/* Botones de navegación */}
      <span className="rbc-btn-group flex gap-1">
        <Button variant="outline" onClick={goToBack} size="sm" className="h-9 px-2 sm:px-4">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={goToToday} size="sm" className="h-9 px-2 sm:px-4">
          Hoy
        </Button>
        <Button variant="outline" onClick={goToNext} size="sm" className="h-9 px-2 sm:px-4">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </span>

      {/* Etiqueta (mes y año) */}
      <span className="rbc-toolbar-label text-sm sm:text-base text-center">{label}</span>

      {/* DatePicker (usando Popover) */}
      <div className="flex items-center gap-2">
        <p className="text-xs sm:text-sm hidden sm:inline">Cambiar fecha: </p>
        <span className="rbc-btn-group">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                size="sm"
                className="w-auto sm:w-32 h-9 justify-start text-left font-normal px-2 sm:px-4"
              >
                <div className="flex items-center justify-center gap-1 sm:gap-3">
                  <CalendarSync size={20} strokeWidth={2} className="sm:w-8 sm:h-8" />
                  <span className="text-xs sm:text-sm">{dayjs(date).format("DD/MM/YYYY")}</span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
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
