import { Bed } from "lucide-react";
import dayjs from "dayjs";

export const CustomEventComponent = ({ event }) => {
  const { titulo, start, end, usaCamilla } = event;

  // Formatear las fechas de inicio y fin
  const startTime = dayjs(start).format("HH:mm");
  const endTime = dayjs(end).format("HH:mm");

  return (
    <div className="flex flex-col h-full text-primary">
      {/* Parte superior: start - end centrado */}
      <div className="hidden xl:block text-center text-[12px] py-0.5">
        {startTime} - {endTime}
      </div>
      {/* Siguiente línea: ícono a la izquierda y título a la derecha */}
      <div className="flex justify-between items-center overflow-hidden">
        <span className="text-sm font-bold pt-1">{titulo}</span>
        {usaCamilla && <Bed size={16} />}
      </div>
    </div>
  );
};

export const eventPropGetter = (event) => {
  let backgroundColor;

  // Lógica de color según tipo y estado
  if (
    event.estado === "cancelada" &&
    (event.tipo === "fija" || event.tipo === "quincenal")
  ) {
    backgroundColor = "#ffc000"; // Amarillo
  } else {
    switch (event.tipo) {
      case "Fija":
        backgroundColor = "#5b9bd5"; // Azul
        break;
      case "Quincenal":
        backgroundColor = ""; // Celeste
        break;
      case "Eventual":
        backgroundColor = "#92d050"; // Verde
        break;
      default:
        backgroundColor = "#cccccc"; // Gris por defecto
    }
  }

  return {
    style: {
      backgroundColor,
      borderRadius: "4px",
      color: "white", // Color del texto blanco para buena legibilidad
      border: "1px solid hsl(214.3 31.8% 91.4%)",
    },
  };
};
