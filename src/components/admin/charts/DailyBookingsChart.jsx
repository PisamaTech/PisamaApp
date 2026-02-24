import {
  Bar,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

export const DailyBookingsChart = ({ data }) => {
  // Formatear los datos para el gráfico
  const formattedData = data.map((item) => ({
    dia: item.dia,
    diaLabel: dayjs(item.dia)
      .format("ddd")
      .replace(/^\w/, (c) => c.toUpperCase()),
    fechaCompleta: dayjs(item.dia).format("DD/MM"),
    fechaAnterior: dayjs(item.dia).subtract(1, "week").format("DD/MM"),
    Horas: item.horas_reservadas,
    "Semana Anterior": item.horas_semana_anterior || 0,
  }));

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
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
            {item.diaLabel} {item.fechaCompleta}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#16a34a" }}>
            Esta semana: {item.Horas}h
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
            Semana anterior ({item.fechaAnterior}): {item["Semana Anterior"]}h
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={formattedData}>
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
        <Legend />
        <Bar
          dataKey="Horas"
          name="Esta Semana"
          fill="#16a34a"
          radius={[4, 4, 0, 0]}
        />
        <Line
          type="monotone"
          dataKey="Semana Anterior"
          name="Semana Anterior"
          stroke="#fca5a5"
          strokeWidth={2}
          dot={{ fill: "#dc2626", strokeWidth: 0, r: 5 }}
          activeDot={{ fill: "#dc2626", strokeWidth: 0, r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
