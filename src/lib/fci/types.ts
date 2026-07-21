/**
 * Tipos de los outputs reales del servidor MCP de fonditos.ar.
 * Mapeados a partir de las respuestas exploradas por curl (no inventados).
 */

// ── ranking_fondos ──────────────────────────────────────────────────────────
export interface RankingRow {
  fondo: string;
  categoria: string | null;
  subcategoria: string | null;
  clase: string | null;
  moneda: string | null;
  vcp_from: number;
  vcp_to: number;
  fecha_from: string;
  fecha_to: string;
  return: number;
  return_pct: number;
  tna_pct: number;
  dias: number;
}
export interface RankingFondos {
  from: string;
  to: string;
  periodo: string;
  category: string;
  subcategoria: string | null;
  clase: string | null;
  count: number;
  rows: RankingRow[];
}

// ── buscar_fondos ────────────────────────────────────────────────────────────
export interface BuscarRow {
  fondo: string;
  categoria: string | null;
  moneda: string | null;
  fecha: string;
  vcp: number;
  patrimonio: number;
}
export interface BuscarFondos {
  query: string;
  total: number;
  data: BuscarRow[];
}

// ── ficha_fondo ──────────────────────────────────────────────────────────────
export interface FichaDatosActuales {
  id: number;
  fondo: string;
  categoria: string | null;
  fecha: string;
  vcp: number;
  ccp: number | null;
  patrimonio: number | null;
  horizonte: string | null;
  moneda: string | null;
  calificacion: string | null;
  fee_gestion: number | null;
  fee_depositaria: number | null;
  gastos_gestion: number | null;
  com_rescate: number | null;
  com_ingreso: number | null;
  hon_exito: string | null;
  plazo_rescate: number | null;
  sociedad_depositaria: string | null;
  sociedad_gerente: string | null;
}
export interface FichaMetricas {
  rend_7d: number | null;
  rend_30d: number | null;
  rend_90d: number | null;
  rend_ytd: number | null;
  rend_1y: number | null;
  tna: number | null;
  volatilidad: number | null;
  sharpe: number | null;
  dias_historico: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}
export interface FichaFondo {
  fondo: string;
  subcategoria: string | null;
  clase: string | null;
  gestora: string | null;
  datos_actuales: FichaDatosActuales;
  metricas: FichaMetricas;
  historial_puntos: number;
}

// ── composicion_fondo ────────────────────────────────────────────────────────
export interface ComposicionSummaryRow {
  tipo_activo: string;
  peso_pct: number;
  n_activos: number;
}
export interface ComposicionFondo {
  fondo: string;
  categoria: string | null;
  moneda: string | null;
  summary: ComposicionSummaryRow[];
}

// ── serie_fondo ──────────────────────────────────────────────────────────────
export interface SerieFondoPoint {
  fecha: string;
  vcp: number;
  patrimonio: number;
  vcp_norm: number;
}
export interface SerieFondo {
  data: SerieFondoPoint[];
  fondo: string;
  from: string;
  to: string;
  base_fecha: string;
  base_vcp: number;
  points: number;
}

// ── tenencias_fondo ──────────────────────────────────────────────────────────
export interface TenenciaHolding {
  name: string;
  weight: number;
  type: string;
}
export interface TenenciasFondo {
  cached: boolean;
  stale: boolean;
  age_hours: number;
  fondo: string;
  clase: string;
  fecha_actualizacion: number;
  holdings: TenenciaHolding[];
}

// ── metricas_renta_fija ──────────────────────────────────────────────────────
export interface MetricasRentaFija {
  fondo?: string;
  duration?: number | null;
  tir?: number | null;
  tir_pct?: number | null;
  yield?: number | null;
  [k: string]: unknown;
}

// ── comparar_fondos ──────────────────────────────────────────────────────────
export interface CompararSeries {
  fondo: string;
  input: string;
  points: number;
}
export interface CompararFondos {
  chart_data: Array<{ fecha: string; [fondo: string]: string | number }>;
  series: CompararSeries[];
  from: string;
  to: string;
}

// ── serie_flujos ─────────────────────────────────────────────────────────────
export interface SerieFlujos {
  series: Array<{ fecha: string; flujo_ars: number }>;
}

// ── flujo_por_gestora ────────────────────────────────────────────────────────
export interface FlujoGestoraRow {
  manager: string;
  type: string;
  flujo_ars: number;
  n_fondos: number;
}
export interface FlujoPorGestora {
  rows: FlujoGestoraRow[];
}

// ── ranking_facturacion ──────────────────────────────────────────────────────
export interface FacturacionRow {
  manager: string;
  type: string;
  aum_ars: number;
  aum_avg_period: number;
  fee_avg: number;
  facturacion_periodo: number;
  dias: number;
  n_fondos: number;
}
export interface RankingFacturacion {
  rows: FacturacionRow[];
}

// ── serie_aum ────────────────────────────────────────────────────────────────
export interface SerieAum {
  buckets: string[];
  managers: string[];
  data: Record<string, number[]>;
}

// ── composicion_cartera ──────────────────────────────────────────────────────
export interface ComposicionCartera {
  rows: Array<{ categoria: string; n_fondos: number }>;
}

// ── exposicion_activo ────────────────────────────────────────────────────────
export interface ExposicionFondoRow {
  fondo: string;
  peso_pct?: number;
  peso?: number;
  gestora?: string;
  categoria?: string;
  [k: string]: unknown;
}
export interface ExposicionActivo {
  activo: string;
  total_fondos: number;
  total_disponible: number;
  peso_promedio: number;
  peso_max: number;
  peso_min: number;
  fondos: ExposicionFondoRow[];
}
