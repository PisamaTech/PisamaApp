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

export const ReservationTypeTrendChart = ({ data }) => {
  const formattedData = data.map((item) => ({
    ...item,
    name: dayjs().month(item.mes - 1).format("MMM"),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const eventual = item.total_eventual || 0;
      const fija = item.total_fija || 0;
      const total = eventual + fija;
      const pctEventual = total > 0 ? Math.round((eventual / total) * 100) : 0;
      const pctFija = total > 0 ? Math.round((fija / total) * 100) : 0;
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
            {dayjs().month(item.mes - 1).format("MMMM")}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#92d050" }}>
            Eventuales: {eventual} ({pctEventual}%)
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#5b9bd5" }}>
            Fijas: {fija} ({pctFija}%)
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>
            Total: {total}
          </p>
        </div>
      );
    }
    return null;
  };

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
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Legend />
        <Bar dataKey="total_eventual" name="Eventual" stackId="a" fill="#92d050" radius={[0, 0, 0, 0]} />
        <Bar dataKey="total_fija" name="Fija" stackId="a" fill="#5b9bd5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
