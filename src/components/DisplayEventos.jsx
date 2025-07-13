import { Badge } from "@/components/ui/";
import dayjs from "dayjs";

// Función para formatear cada evento en el formato solicitado
const formatEvent = (event) => {
  const dayOfWeek = dayjs(event.start_time).format("dddd").toUpperCase(); // Ej: "LUNES"
  const date = dayjs(event.start_time).format("DD/MM"); // Ej: "25/02"
  const time = dayjs(event.start_time).format("HH[h]"); // Ej: "19h"
  const consultorio = event.consultorio_id
    ? `Consultorio ${event.consultorio_id}`
    : "Sin consultorio";
  const camillaText = event.usaCamilla ? " - con Camilla" : ""; // Omite si usaCamilla es false

  return `  ${dayOfWeek} ${date} - ${time} - ${consultorio}${camillaText}`;
};

export const DisplayEventos = ({ hourlyEvents }) => {
  return (
    <div className="max-h-96 overflow-y-auto">
      <ul className="my-2">
        {hourlyEvents.map((event, index) => (
          <li key={index} className="text-sm text-gray-500 font-bold">
            <Badge
              variant={event.tipo_reserva.toLowerCase()}
              className="mr-1 mt-1.5 text-gray-800"
            >
              <span>{event.tipo_reserva.toUpperCase()}</span>
            </Badge>
            {formatEvent(event)}
          </li>
        ))}
      </ul>
    </div>
  );
};
