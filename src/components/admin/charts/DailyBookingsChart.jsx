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
    // Formateamos la fecha para mostrar el día de la semana, ej. "Lun", "Mar"
    name: dayjs(item.dia)
      .format("ddd")
      .replace(/^\w/, (c) => c.toUpperCase()),
    Horas: item.horas_reservadas,
  }));

  return (
    // ResponsiveContainer hace que el gráfico se adapte al tamaño de su contenedor padre
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <Tooltip
          cursor={{ fill: "#f3f4f6" }} // Color de fondo al pasar el cursor
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
          }}
        />
        <Bar dataKey="Horas" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
