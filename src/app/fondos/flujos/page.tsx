/**
 * Flujos de la industria de FCIs.
 * Fuente: fonditos.ar (MCP) · serie_flujos + flujo_por_gestora.
 */
import { fonditos } from "@/lib/fonditos";
import FciShell from "@/components/fci/FciShell";
import { Section, ErrorBox, EmptyBox, Chip } from "@/components/fci/ui";
import FlowsChart from "@/components/fci/charts/FlowsChart";
import { compactArs } from "@/lib/fci/constants";
import type { SerieFlujos, FlujoPorGestora } from "@/lib/fci/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const metadata = { title: "Flujos · Monitor FCIs · Amauta" };

const COMPRESIONES = [
  { value: "mensual", label: "Mensual" },
  { value: "semanal", label: "Semanal" },
];
const TIPOS = [
  { value: "todas", label: "Todas" },
  { value: "banco", label: "Bancos" },
  { value: "independiente", label: "Independientes" },
];

interface SP {
  compresion?: string;
  tipo?: string;
}

export default async function FlujosPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const compresion = COMPRESIONES.some((c) => c.value === sp.compresion) ? sp.compresion! : "mensual";
  const tipo = TIPOS.some((t) => t.value === sp.tipo) ? sp.tipo! : "todas";

  const [serie, porGestora] = await Promise.all([
    fonditos<SerieFlujos>("serie_flujos", { compresion, tipo }).catch(() => null),
    fonditos<FlujoPorGestora>("flujo_por_gestora", tipo !== "todas" ? { tipo } : {}).catch(() => null),
  ]);

  // Tomar los últimos 24 puntos para que el gráfico respire.
  const allSeries = serie?.series ?? [];
  const points = allSeries.slice(-24);
  const lastFlow = points[points.length - 1];
  const acum = points.reduce((a, p) => a + p.flujo_ars, 0);

  const rows = porGestora?.rows ?? [];
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.flujo_ars)));
  const topManager = rows[0];

  const buildHref = (ov: Partial<SP>) => {
    const m = { compresion, tipo, ...ov };
    const p = new URLSearchParams();
    if (m.compresion !== "mensual") p.set("compresion", m.compresion);
    if (m.tipo !== "todas") p.set("tipo", m.tipo);
    const qs = p.toString();
    return qs ? `/fondos/flujos?${qs}` : "/fondos/flujos";
  };

  return (
    <FciShell
      kicker="Suscripciones netas · fonditos · CAFCI"
      title="Flujos de fondos"
      subtitle="Entradas y salidas netas de la industria y captación por gestora. Un termómetro de hacia dónde se mueve el dinero."
      kpis={[
        { label: "Último período", value: lastFlow ? compactArs(lastFlow.flujo_ars) : "—", sub: lastFlow?.fecha },
        { label: "Acum. mostrado", value: compactArs(acum) },
        { label: "Top captación", value: topManager ? compactArs(topManager.flujo_ars) : "—", sub: topManager?.manager },
        { label: "Vista", value: compresion === "mensual" ? "Mensual" : "Semanal" },
      ]}
    >
      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <FilterChips label="Compresión" options={COMPRESIONES} value={compresion} field="compresion" buildHref={buildHref} />
        <FilterChips label="Tipo" options={TIPOS} value={tipo} field="tipo" buildHref={buildHref} />
      </div>

      <div className="space-y-6">
        {/* Serie de flujos */}
        <Section title="Flujo neto por período" subtitle={serie ? `Últimos ${points.length} períodos` : undefined}>
          {!serie ? (
            <div className="p-4">
              <ErrorBox message="La serie de flujos no está disponible." />
            </div>
          ) : points.length === 0 ? (
            <EmptyBox icon="💸" title="Sin datos de flujos" />
          ) : (
            <div className="p-4 sm:p-5">
              <FlowsChart data={points} />
            </div>
          )}
        </Section>

        {/* Ranking por gestora */}
        <Section title="Captación por gestora" subtitle={porGestora ? `${rows.length} gestoras` : undefined}>
          {!porGestora ? (
            <div className="p-4">
              <ErrorBox message="El ranking por gestora no está disponible." />
            </div>
          ) : rows.length === 0 ? (
            <EmptyBox icon="🏦" title="Sin datos" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="text-text-tertiary border-b border-brand-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold uppercase tracking-wider text-[10px] w-10">#</th>
                    <th className="px-4 py-3 text-left font-extrabold uppercase tracking-wider text-[10px]">Gestora</th>
                    <th className="px-3 py-3 text-center font-extrabold uppercase tracking-wider text-[10px] hidden sm:table-cell">Tipo</th>
                    <th className="px-3 py-3 text-right font-extrabold uppercase tracking-wider text-[10px] hidden sm:table-cell">Fondos</th>
                    <th className="px-4 py-3 text-right font-extrabold uppercase tracking-wider text-[10px]">Flujo neto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const pos = r.flujo_ars >= 0;
                    const w = (Math.abs(r.flujo_ars) / maxAbs) * 100;
                    return (
                      <tr key={r.manager} className={`border-b border-brand-border hover:bg-surface-overlay transition-colors ${i % 2 ? "bg-white/[0.02]" : ""}`}>
                        <td className="px-4 py-3 text-xs tabular-nums text-text-tertiary">{i + 1}</td>
                        <td className="px-4 py-3 font-extrabold text-text-primary">{r.manager}</td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          <Chip tone={r.type === "BANK" ? "blue" : "gray"}>
                            {r.type === "BANK" ? "Banco" : "Indep."}
                          </Chip>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums hidden sm:table-cell text-text-secondary">
                          {r.n_fondos}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`tabular-nums font-bold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
                              {compactArs(r.flujo_ars)}
                            </span>
                            <span className="hidden md:block w-24 h-2 bg-surface-overlay rounded-xs overflow-hidden">
                              <span
                                className={`block h-full ${pos ? "bg-emerald-400" : "bg-rose-400"}`}
                                style={{ width: `${w}%` }}
                              />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <p className="mt-4 text-xs text-text-tertiary leading-relaxed max-w-3xl">
        Flujos netos en pesos (suscripciones menos rescates). La captación por gestora corresponde a la ventana
        por defecto de la fuente. Fuente: fonditos · CAFCI.
      </p>
    </FciShell>
  );
}

function FilterChips({
  label,
  options,
  value,
  field,
  buildHref,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  field: string;
  buildHref: (ov: Record<string, string>) => string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </span>
      {options.map((o) => (
        <a
          key={o.value}
          href={buildHref({ [field]: o.value })}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            value === o.value
              ? "bg-amauta-yellow text-amauta-dark border-amauta-yellow"
              : "bg-surface-raised text-text-secondary border-brand-border hover:border-amauta-yellow hover:text-text-primary"
          }`}
        >
          {o.label}
        </a>
      ))}
    </div>
  );
}
