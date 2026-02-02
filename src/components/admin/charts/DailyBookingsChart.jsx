import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

export const DailyBookingsChart = ({ data }) => {
  // Formatear los datos para el gráfico
  const formattedData = data.map((item) => ({
    // Usamos la fecha completa como identificador único
    dia: item.dia,
    // Guardamos el día de la semana formateado para mostrarlo
    diaLabel: dayjs(item.dia)
      .format("ddd")
      .replace(/^\w/, (c) => c.toUpperCase()),
    // Guardamos la fecha formateada para el tooltip
    fechaCompleta: dayjs(item.dia).format("DD/MM"),
    Horas: item.horas_reservadas,
  }));

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>
            {data.diaLabel} {data.fechaCompleta}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#16a34a" }}>
            Horas: {data.Horas}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    // ResponsiveContainer hace que el gráfico se adapte al tamaño de su contenedor padre
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="dia"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            dayjs(value)
              .format("ddd")
              .replace(/^\w/, (c) => c.toUpperCase())
          }
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="Horas" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
