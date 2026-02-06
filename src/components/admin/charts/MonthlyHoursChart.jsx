import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

export const MonthlyHoursChart = ({ data }) => {
  // Mapeamos los datos numéricos de mes a nombres cortos
  const formattedData = data.map((item) => ({
    ...item,
    name: dayjs().month(item.mes - 1).format("MMM"), // "Ene", "Feb", etc.
  }));

  return (
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
          cursor={{ fill: "#f3f4f6" }}
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
          }}
        />
        <Legend />
        {/* Barras apiladas o agrupadas. El usuario pidió ver los 3 valores. 
            Como "Activas" suele incluir "Utilizadas", quizás sea mejor agruparlas o apilarlas con cuidado.
            El requerimiento dice: "incluir las horas activas, utilizadas y penalizadas".
            Vamos a ponerlas lado a lado para comparar. */}
        <Bar dataKey="horas_activas" name="Activas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="horas_utilizadas" name="Utilizadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="horas_penalizadas" name="Penalizadas" fill="#f97316" radius={[4, 4, 0, 0]} />
        <Bar dataKey="horas_canceladas" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
