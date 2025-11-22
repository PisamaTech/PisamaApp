import {
  ComposedChart,
  Bar,
  Line,
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

export const ReservationTypeTrendChart = ({ data }) => {
  const formattedData = data.map((item) => ({
    ...item,
    name: dayjs().month(item.mes - 1).format("MMM"),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={formattedData}>
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
        <Bar dataKey="total_eventual" name="Eventual" stackId="a" fill="#8884d8" />
        <Bar dataKey="total_fija" name="Fija" stackId="a" fill="#82ca9d" />
        <Line
          type="monotone"
          dataKey="total_reagendadas"
          name="Reagendadas"
          stroke="#ff7300"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
