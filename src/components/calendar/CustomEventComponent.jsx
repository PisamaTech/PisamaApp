import dayjs from "dayjs";
import camillaIcon from "../../assets/massage-table-50.png";

export const CustomEventComponent = ({ event }) => {
  const { titulo, start_time, end_time, usaCamilla } = event;

  // Formatear las fechas de inicio y fin
  const startTime = dayjs(start_time).format("HH:mm");
  const endTime = dayjs(end_time).format("HH:mm");

  return (
    <div className="flex flex-col h-full text-primary">
      {/* Parte superior: start - end centrado */}
      <div className="hidden xl:block text-center text-[10px] sm:text-[11px] lg:text-[12px] py-0.5">
        {startTime} - {endTime}
      </div>
      {/* Contenedor principal: columna en móvil, fila en pantallas grandes */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center overflow-hidden gap-0.5">
        <span className="text-[10px] sm:text-xs lg:text-sm font-bold pt-0.5 sm:pt-1 leading-tight">{titulo}</span>
        {usaCamilla && (
          <img src={camillaIcon} alt="Icono de Camilla" className="w-4 h-5 sm:w-5 sm:h-6 lg:w-6 lg:h-7 flex-shrink-0" />
        )}
      </div>
    </div>
  );
};

export const eventPropGetter = (event) => {
  let backgroundColor;

  // Lógica de color según tipo y estado
  if (
    event.estado === "cancelada" &&
    (event.tipo_reserva === "fija" || event.tipo_reserva === "quincenal")
  ) {
    backgroundColor = "#ffc000"; // Amarillo
  } else {
    switch (event.tipo_reserva) {
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
