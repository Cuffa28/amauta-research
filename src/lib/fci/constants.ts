/**
 * Constantes compartidas de la sección FCIs (opciones de filtros, labels).
 */

export const PERIODOS = [
  { value: "1d", label: "1 día" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "ytd", label: "YTD" },
  { value: "1y", label: "1 año" },
] as const;

export type Periodo = (typeof PERIODOS)[number]["value"];

export function periodoLabel(v: string): string {
  return PERIODOS.find((p) => p.value === v)?.label ?? v;
}

// Categorías reales devueltas por composicion_cartera / ranking_fondos.
export const CATEGORIAS = [
  "RENTA FIJA",
  "RENTA MIXTA",
  "MERCADO DE DINERO",
  "RENTA VARIABLE",
  "PYMES",
  "RETORNO TOTAL",
  "INFRAESTRUCTURA",
  "FONDOS CERRADOS",
  "ASG",
] as const;

export const CLASES = ["A", "B", "C"] as const;

/** Formato compacto de pesos argentinos para KPIs/celdas (server-safe). */
export function compactArs(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toLocaleString("es-AR", { maximumFractionDigits: 2 })} B`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MM`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toLocaleString("es-AR", { maximumFractionDigits: 0 })} K`;
  return `${sign}$${abs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Título "linda" para una categoría/subcategoría en mayúsculas de la fuente. */
export function titleCase(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
