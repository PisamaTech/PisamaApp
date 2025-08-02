import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

// Colores para cada porción del gráfico. Puedes añadir más si tienes más consultorios.
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
    value: parseFloat(item.horas_reservadas), // Asegurarse de que el valor sea numérico
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
          }}
          formatter={(value, name) => [`${value} horas`, name]}
        />
        <Legend verticalAlign="bottom" height={90} iconType="circle" />
        <Pie
          data={formattedData}
          cx="50%"
          cy="45%"
          labelLine={false}
          outerRadius={110}
          innerRadius={60} // Esto lo convierte en un gráfico de dona
          fill="#8884d8"
          dataKey="value"
          paddingAngle={3}
        >
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
