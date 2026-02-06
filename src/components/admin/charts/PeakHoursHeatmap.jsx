import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 a 22:00 (aprox)

// Offset de Uruguay: UTC-3 (restar 3 horas para convertir de UTC a hora local)
const URUGUAY_OFFSET = -3;

export const PeakHoursHeatmap = ({ data }) => {
  // Procesar datos para acceso rápido: map[dia][hora] = cantidad
  // Aplicar conversión de zona horaria UTC -> Uruguay (UTC-3)
  const processedData = useMemo(() => {
    const map = {};
    data.forEach((item) => {
      // Convertir hora UTC a hora de Uruguay
      let horaLocal = item.hora + URUGUAY_OFFSET;
      let diaLocal = item.dia_semana;

      // Si la hora queda negativa, ajustar al día anterior
      if (horaLocal < 0) {
        horaLocal += 24;
        diaLocal = (diaLocal - 1 + 7) % 7; // Retroceder un día
      }
      // Si la hora queda >= 24, ajustar al día siguiente
      else if (horaLocal >= 24) {
        horaLocal -= 24;
        diaLocal = (diaLocal + 1) % 7; // Avanzar un día
      }

      if (!map[diaLocal]) map[diaLocal] = {};
      // Sumar cantidades si ya hay datos para esa celda (puede pasar por ajuste de día)
      map[diaLocal][horaLocal] = (map[diaLocal][horaLocal] || 0) + item.cantidad;
    });
    return map;
  }, [data]);

  // Encontrar el valor máximo para la escala de color
  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.cantidad), 1);
  }, [data]);

  const getColor = (value) => {
    if (!value) return "bg-gray-100";
    const intensity = value / maxValue;
    // Escala de azules
    if (intensity < 0.2) return "bg-blue-100";
    if (intensity < 0.4) return "bg-blue-300";
    if (intensity < 0.6) return "bg-blue-500";
    if (intensity < 0.8) return "bg-blue-700";
    return "bg-blue-900";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header Horas */}
        <div className="flex">
          <div className="w-12 flex-shrink-0"></div>
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-xs text-muted-foreground">
              {h}:00
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-1 mt-1">
          {DAYS.map((dayName, dayIndex) => (
            <div key={dayName} className="flex items-center h-8">
              <div className="w-12 text-xs font-medium text-muted-foreground">
                {dayName}
              </div>
              {HOURS.map((hour) => {
                const value = processedData[dayIndex]?.[hour] || 0;
                return (
                  <TooltipProvider key={`${dayIndex}-${hour}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 h-full mx-[1px] rounded-sm transition-colors ${getColor(
                            value
                          )}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {dayName} {hour}:00 - {value} reservas
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <div className="w-4 h-4 bg-blue-300 rounded"></div>
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <div className="w-4 h-4 bg-blue-700 rounded"></div>
          <div className="w-4 h-4 bg-blue-900 rounded"></div>
        </div>
        <span>Más</span>
      </div>
    </div>
  );
};
