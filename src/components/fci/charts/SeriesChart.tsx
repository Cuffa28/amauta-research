"use client";

/**
 * Serie temporal de un único valor (VCP normalizado, AUM, etc.).
 * Area chart on-brand. Recibe los datos ya fetcheados como props.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SeriesPoint {
  x: string;
  y: number | null;
}

const ES_AR = "es-AR";

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} B`;
  if (abs >= 1e9) return `${(n / 1e9).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} MM`;
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString(ES_AR, { maximumFractionDigits: 1 })} K`;
  return n.toLocaleString(ES_AR, { maximumFractionDigits: 2 });
}

export default function SeriesChart({
  data,
  color = "#F3CF11",
  height = 300,
  mode = "plain",
  currency = false,
  gradientId = "fciArea",
}: {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  /** "plain" muestra el valor; "index" formatea como base 100. */
  mode?: "plain" | "index";
  currency?: boolean;
  gradientId?: string;
}) {
  const fmtY = (v: number) =>
    currency ? `$${fmtCompact(v)}` : mode === "index" ? v.toFixed(0) : fmtCompact(v);

  const fmtTip = (v: number) =>
    currency
      ? `$${v.toLocaleString(ES_AR, { maximumFractionDigits: 0 })}`
      : v.toLocaleString(ES_AR, { maximumFractionDigits: mode === "index" ? 2 : 4 });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: "#8A8487" }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8A8487" }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={fmtY}
            domain={mode === "index" ? ["auto", "auto"] : ["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number) => [fmtTip(v), currency ? "AUM" : mode === "index" ? "Base 100" : "Valor"]}
            contentStyle={{
              background: "#2C2728",
              borderRadius: 8,
              border: "1px solid #3A3433",
              color: "#F5F2F0",
              fontSize: 12,
              fontFamily: "inherit",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
            itemStyle={{ color: "#F5F2F0" }}
            labelStyle={{ fontWeight: 700, color: "#F5F2F0" }}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2.2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
