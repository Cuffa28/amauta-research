"use client";

/**
 * Flujos netos por período (serie_flujos). Barras verdes (entradas) /
 * rojas (salidas). Recibe la serie ya fetcheada como props.
 */
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface FlowPoint {
  fecha: string;
  flujo_ars: number;
}

const ES_AR = "es-AR";

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} B`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} MM`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} M`;
  return `${sign}$${abs.toLocaleString(ES_AR, { maximumFractionDigits: 0 })}`;
}

export default function FlowsChart({
  data,
  height = 340,
}: {
  data: FlowPoint[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: "#8A8487" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8A8487" }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={fmtCompact}
          />
          <ReferenceLine y={0} stroke="rgba(0,0,0,0.2)" />
          <Tooltip
            cursor={{ fill: "rgba(243,207,17,0.08)" }}
            formatter={(v: number) => [fmtCompact(v), "Flujo neto"]}
            contentStyle={{
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.08)",
              fontSize: 12,
              fontFamily: "inherit",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
            labelStyle={{ fontWeight: 700, color: "#231F20" }}
          />
          <Bar dataKey="flujo_ars" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.flujo_ars >= 0 ? "#27AE60" : "#C0392B"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
