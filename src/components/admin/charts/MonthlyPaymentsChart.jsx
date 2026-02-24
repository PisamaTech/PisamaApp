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

export const MonthlyPaymentsChart = ({ data }) => {
  // Mapeamos los datos numéricos de mes a nombres cortos
  const formattedData = data.map((item) => ({
    ...item,
    name: dayjs().month(item.mes - 1).format("MMM"), // "Ene", "Feb", etc.
  }));

  // Tooltip personalizado
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
            {dayjs().month(item.mes - 1).format("MMMM")}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#2563eb" }}>
            Total: ${item.monto_total?.toLocaleString()}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
            {item.cantidad_pagos} transferencia{item.cantidad_pagos !== 1 ? "s" : ""}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#16a34a" }}>
            Promedio: ${item.pago_promedio?.toLocaleString()} / pago
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
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Bar
          dataKey="monto_total"
          name="Pagos Recibidos"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
