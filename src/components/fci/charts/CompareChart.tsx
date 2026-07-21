"use client";

/**
 * Comparación base 100 de 2 a 4 fondos.
 * Recibe chart_data de comparar_fondos (array de {fecha, [nombreFondo]: number}).
 */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const COMPARE_COLORS = ["#F3CF11", "#C77DA6", "#6BA6FF", "#5FD0A0"];

interface Row {
  fecha: string;
  [fondo: string]: string | number;
}

export default function CompareChart({
  data,
  keys,
  height = 380,
}: {
  data: Row[];
  keys: string[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: "#8A8487" }}
            tickLine={false}
            axisLine={false}
            minTickGap={44}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8A8487" }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            formatter={(v: number, name: string) => [
              v.toLocaleString("es-AR", { maximumFractionDigits: 2 }),
              name,
            ]}
            contentStyle={{
              background: "#2C2728",
              borderRadius: 8,
              border: "1px solid #3A3433",
              color: "#F5F2F0",
              fontSize: 12,
              fontFamily: "inherit",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ fontWeight: 700, color: "#F5F2F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "#B8B2B3" }} />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
