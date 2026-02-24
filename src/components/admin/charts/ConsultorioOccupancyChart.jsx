import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

// Colores para cada barra del gráfico
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF427A",
];

export const ConsultorioOccupancyChart = ({ data }) => {
  const formattedData = data.map((item) => ({
    name: item.nombre_consultorio,
    horas: parseFloat(item.horas_reservadas),
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
            {data.name}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#0088FE" }}>
            {data.horas} horas
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={formattedData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis
          type="number"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
